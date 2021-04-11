from etl.mediacounts_dump import dailyinsert_from_file
import logging
from etl.s3 import get_mediacount_file_by_date
from typing import List
import argparse
from datetime import date, datetime, timedelta
from etl.glams_table import close_glams_connections, get_glams, load_glams_images, open_glams_connections, refresh_glams_visualizations


def _main(start_date: date, end_date: date, glams_names: List[str]):
    glams = get_glams()
    if glams_names != None:
        glams = list(
            filter(lambda g:  g['name'] in glams_names, glams))
    if len(glams) == 0:
        logging.info('There are no glams to process')
        return
    logging.info(f"Filling gaps for {len(glams)} glams")
    date_val = start_date
    open_glams_connections(glams)
    load_glams_images(glams)
    total_image_num = 0
    for glam in glams:
        total_image_num += len(glam['images'])
    while date_val < end_date:
        try:
            filepath = get_mediacount_file_by_date(date_val)
            dailyinsert_from_file(glams, filepath, date_val)
        except Exception as err:
            logging.error(f"Error loading mediacount for date {date_val}:\n{err}")
        date_val = date_val + timedelta(days=1)
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
    args = parser.parse_args()

    _main(args.start_date, end_date=args.end_date, glams_names=args.glams)
    logging.info(f"Fill gaps done")
