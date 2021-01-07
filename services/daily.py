import logging
import bz2
import os
import urllib.parse
from datetime import date, timedelta
from lib.sentry import with_sentry
from etl.glams_table import get_running_glams, get_glam_database_connection, get_glam_images
from etl.run import process_glam
from etl.download_mediacounts import download_file
from tqdm import tqdm


def process_glams(glams):
    for glam in glams:
        process_glam(glam)


def get_file_key_from_line(line):
    arr = line.decode().split("\t")
    keysX = arr[0].split("/")
    key = keysX[len(keysX) - 1]
    key = urllib.parse.unquote(key)
    return key, arr


def dailyinsert_query(key, arr, date_val: date):
    return f"SELECT * FROM dailyinsert('" + key.replace(
        "'", "''") + "','" + date_val.strftime("%Y-%m-%d") + "'," + arr[2] + "," + arr[22] + "," + arr[23] + ")"


def dailyinsert_glams(glams, line, date_val):
    key, arr = get_file_key_from_line(line)
    counter = 0
    for glam in glams:
        if key in glam['images']:
            glam['cur'].execute(
                dailyinsert_query(key, arr, date_val))
            counter += 1
    return counter


def dailyinsert_from_file(glams, filepath, date_val):
    extracted_file = bz2.BZ2File(filepath, "r")
    total_image_num = 0
    for glam in glams:
        glam['conn'] = get_glam_database_connection(glam['database'])
        glam['images'] = get_glam_images(glam['conn'])
        glam['cur'] = glam['conn'].cursor()
        total_image_num += len(glam['images'])
    with tqdm(total=total_image_num) as bar:
        counter = 0
        for line in extracted_file:
            inserted_counter = dailyinsert_glams(glams, line, date_val)
            counter += inserted_counter
            bar.update(inserted_counter)
            if counter == total_image_num:
                logging.info(
                    f"Counter {counter} total_image_num{total_image_num}")
                break
    extracted_file.close()


def refresh_and_close(glams):
    logging.info(f"refrashing views for {len(glams)} glams")
    for glam in glams:
        logging.info(f"refrashing for {glam['name']}")
        glam['cur'].execute('REFRESH MATERIALIZED VIEW visualizations_sum')
        glam['cur'].execute('REFRESH MATERIALIZED VIEW visualizations_stats')
        glam['cur'].close()
        glam['conn'].close()


def main(date_val: date):
    glams = get_running_glams()
    process_glams(glams)
    filepath = download_file(date_val)
    dailyinsert_from_file(glams, filepath, date_val)
    refresh_and_close(glams)
    os.remove(filepath)


if __name__ == "__main__":
    yesterday_date = date.today() - timedelta(days=1)
    logging.info(f"Starting daily tasks for {yesterday_date}")
    with_sentry()
    main(yesterday_date)
    logging.info(f'Done daily tasks for {yesterday_date}')
