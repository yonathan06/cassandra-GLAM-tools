from concurrent.futures import ProcessPoolExecutor, wait
import multiprocessing
import sys
from etl.mediacounts_dump import dailyinsert_from_file
import logging
import signal
from typing import List
import argparse
from datetime import date, datetime, timedelta
from etl.glams_table import close_glams_connections, get_active_glams, load_glams_images, open_glams_connections, refresh_glams_visualizations
from etl.download_mediacounts import get_nfs_file_path 

def _daily_insert(glams, filepath, date_val, pos, should_exit):
    # Since we create a new process, connections cannot be serialized
    # and therefore are required to be opened again
    open_glams_connections(glams)
    try:
        dailyinsert_from_file(glams, filepath, date_val, pos, should_exit)
    except Exception as e:
        logging.exception(e)
    close_glams_connections(glams)

def fill_gaps(start_date, end_date, glams, num_of_workers):
    date_val = start_date
    futures = []
    for glam in glams:
        del glam['conn']
    manager = multiprocessing.Manager()
    should_exit = manager.Event()
    # Using ProcessPoolExecutor to utulize multiple cores which are not available when using ThreadPoolExecutor
    with ProcessPoolExecutor(num_of_workers) as executor:
        def shutdown_handler(signum, frame):
            for future in futures:
                future.cancel()
            should_exit.set()
            sys.exit()
        signal.signal(signal.SIGINT, shutdown_handler)
        i = 0
        while date_val < end_date:
            try:
                filepath = get_nfs_file_path(date_val)
                futures.append(executor.submit(_daily_insert, glams, filepath, date_val, i % num_of_workers, should_exit))
                date_val = date_val + timedelta(days=1)
                i += 1
            except Exception as err:
                logging.error(f"Error loading mediacount for date {date_val}:\n{err}")

def _main(start_date: date, end_date: date, glams_names: List[str], num_of_workers):
    glams = get_active_glams()
    if glams_names != None:
        glams = list(
            filter(lambda g:  g['name'] in glams_names, glams))
    if len(glams) == 0:
        logging.info('There are no glams to process')
        return
    logging.info(f"Filling gaps for {len(glams)} glams")
    open_glams_connections(glams)
    load_glams_images(glams)
    close_glams_connections(glams)
    fill_gaps(start_date, end_date, glams, num_of_workers)
    open_glams_connections(glams)
    refresh_glams_visualizations(glams)
    close_glams_connections(glams)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="fill gaps of mediacounts for glams from a given start date")
    parser.add_argument("--start_date", type=lambda s: datetime.strptime(
        s, '%Y-%m-%d').date(), help="Start date (format Y-m-d)", required=True)
    parser.add_argument(
        "--end_date", type=lambda s: datetime.strptime(
            s, '%Y-%m-%d').date(), help="End date, default to today (format Y-m-d)", default=date.today())
    parser.add_argument("--glams", nargs='+', type=str,
                        help="Glam names to process (deafult to all)")
    parser.add_argument("--workers", type=int, help="Number of concurrent workers (default 1)", default=1)
    args = parser.parse_args()
    _main(args.start_date, end_date=args.end_date, glams_names=args.glams, num_of_workers=args.workers)
    logging.info(f"Fill gaps done")
