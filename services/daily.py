from etl.mediacounts_dump import dailyinsert_from_file
import logging
import os
from datetime import date, timedelta
from lib.sentry import with_sentry
from etl.glams_table import close_glams_connections, get_glams, load_glams_images, open_glams_connections, refresh_glams_visualizations
from etl.etl_glam import process_glam
from etl.download_mediacounts import download_file


def process_glams(glams):
    for glam in glams:
        logging.info(f"Processing glam: {glam['name']}")
        process_glam(glam)

def main(date_val: date):
    glams = get_glams()
    logging.info(f"Processing {len(glams)} glams: {', '.join(map(lambda glam: glam['name'] ,glams))}")
    process_glams(glams)
    filepath = download_file(date_val)
    open_glams_connections(glams)
    load_glams_images(glams)
    dailyinsert_from_file(glams, filepath, date_val)
    refresh_glams_visualizations(glams)
    close_glams_connections(glams)
    os.remove(filepath)


if __name__ == "__main__":
    yesterday_date = date.today() - timedelta(days=1)
    logging.info(f"Starting daily tasks for {yesterday_date}")
    with_sentry()
    main(yesterday_date)
    logging.info(f'Done daily tasks for {yesterday_date}')
