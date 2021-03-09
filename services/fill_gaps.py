from etl.mediacounts_dump import dailyinsert_from_file
import logging
from etl.s3 import get_mediacount_file_by_date
import sys

from datetime import date, datetime, timedelta
from etl.glams_table import close_glams_connections, get_glams, load_glams_images, open_glams_connections, refresh_glams_visualizations


def _main(start_date: date, end_date: date, glam_name: str):
    glams = get_glams()
    if glam_name != None:
        glams = list(filter(lambda g: g['name'] == glam_name, glams))
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
        filepath = get_mediacount_file_by_date(date_val)
        dailyinsert_from_file(glams, filepath, date_val)
        date_val = date_val + timedelta(days=1)
    refresh_glams_visualizations(glams)
    close_glams_connections(glams)


if __name__ == '__main__':
    start_date = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()
    end_date = date.today()
    glam_name = None
    if len(sys.argv) > 2:
        end_date = datetime.strptime(sys.argv[2], "%Y-%m-%d").date()
    if len(sys.argv) > 3:
        glam_name = sys.argv[3]
    _main(start_date, end_date=end_date, glam_name=glam_name)
    logging.info(f"Fill gaps done")
