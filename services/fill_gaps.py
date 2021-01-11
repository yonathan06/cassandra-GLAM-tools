import logging
from etl.s3 import get_mediacount_file_by_date
import sys
import bz2
import urllib.parse
from tqdm import tqdm
import asyncio

from datetime import date, datetime, timedelta
from etl.glams_table import get_glam_database_connection, get_glam_images, get_glams


def get_file_key_from_line(line):
    arr = line.decode().split("\t")
    keysX = arr[0].split("/")
    key = keysX[len(keysX) - 1]
    key = urllib.parse.unquote(key)
    return key, arr


def dailyinsert_query(key, arr, date_val: date):
    return "SELECT * FROM dailyinsert('" + key.replace(
        "'", "''") + "','" + date_val.strftime("%Y-%m-%d") + "'," + arr[2] + "," + arr[22] + "," + arr[23] + ")"


def main(start_date: date, end_date: date, glam_name: str):
    glams = get_glams()
    if glam_name != None:
        glams = list(filter(lambda g: g['name'] == glam_name, glams))
    if len(glams) == 0:
        logging.info('There are no glams to process')
        return
    date_val = start_date
    total_image_num = 0
    for glam in glams:
        glam['conn'] = get_glam_database_connection(glam["database"])
        glam_images = get_glam_images(glam['conn'])
        glam['images'] = glam_images
        glam['cur'] = glam['conn'].cursor()
        total_image_num += len(glam_images)
    while date_val < end_date:
        filepath = get_mediacount_file_by_date(date_val)
        source_file = bz2.BZ2File(filepath, "r")
        with tqdm(total=total_image_num) as bar:
            counter = 0
            for line in source_file:
                key, arr = get_file_key_from_line(line)
                for glam in glams:
                    if key in glam['images']:
                        glam['cur'].execute(
                            dailyinsert_query(key, arr, date_val))
                        counter += 1
                        bar.update(1)
                if counter == total_image_num:
                    logging.info(
                        f"Counter {counter} total_image_num{total_image_num}")
                    break
        date_val = date_val + timedelta(days=1)
    for glam in glams:
        logging.info(f"Refrashing view for {glam['name']}")
        glam['cur'].execute('REFRESH MATERIALIZED VIEW visualizations_sum')
        glam['cur'].execute('REFRESH MATERIALIZED VIEW visualizations_stats')
        glam['cur'].close()
        glam['conn'].close()

if __name__ == '__main__':
    start_date = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()
    end_date = date.today()
    glam_name = None
    if len(sys.argv) > 2:
        end_date = datetime.strptime(sys.argv[2], "%Y-%m-%d").date()
    if len(sys.argv) > 3:
        glam_name = sys.argv[3]
    main(start_date, end_date=end_date, glam_name=glam_name)
    logging.info(f"Fill gaps done")

