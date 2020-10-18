# import argparse
import bz2
import json
import os
# import sys
import urllib.parse
# import urllib.request
import logging
# import psycopg2
from datetime import date

from .glams_table import get_glam_by_name, get_glam_database_connection
from config import config
from .s3 import get_mediacount_file_by_date


def reporter(first, second, third):
    if first % 1000 == 0:
        print("Download progress: " + str(first * second * 100 // third) + "%")


# def download(date, folder):
#     if not os.path.exists(folder):
#         os.makedirs(folder)

#     filename = os.path.join(folder, date + '.tsv.bz2')

#     year, month, day = date.split("-")
#     date_valurl = "https://dumps.wikimedia.org/other/mediacounts/daily/"
#     finalurl = baseurl + year + "/mediacounts." + \
#         year + "-" + month + "-" + day + ".v00.tsv.bz2"

#     # check file size
#     if os.path.isfile(filename):
#         remote_size = urllib.request.urlopen(finalurl).length
#         local_size = os.stat(filename).st_size
#         if remote_size == local_size:
#             return filename
#         else:
#             os.remove(filename)

#     print("Retrieving " + finalurl + "...")
#     urllib.request.urlretrieve(finalurl, filename, reporter)
#     print("Download completed.")

#     return filename


def _process(conn, date, filename, glam_images):
    logging.info(f"Loading visualizations from file {filename}")

    source_file = bz2.BZ2File(filename, "r")
    cur = conn.cursor()
    counter = 0

    for line in source_file:
        if counter == len(glam_images):
            break
        arr = line.decode().split("\t")
        keysX = arr[0].split("/")
        key = keysX[len(keysX) - 1]
        key = urllib.parse.unquote(key)
        if key in glam_images:
            counter += 1
            if counter % 100 == 0:
                logging.info("Loading progress: " +
                             str(counter * 100 // len(glam_images)) + "%")
            query = "SELECT * FROM dailyinsert('" + key.replace(
                "'", "''") + "','" + date.strftime("%Y-%m-%d") + "'," + arr[2] + "," + arr[22] + "," + arr[23] + ")"
            cur.execute(query)

    cur.execute('REFRESH MATERIALIZED VIEW visualizations_sum')
    cur.execute('REFRESH MATERIALIZED VIEW visualizations_stats')
    cur.close()
    source_file.close()


def update_glam_mediacounts_from_file(extracted_file, date_value, glam_conn, glam_images, glam_name):
    logging.info(f"Updating mediacounts for {glam_name}")
    cur = glam_conn.cursor()
    counter = 0
    for line in extracted_file:
        if counter == len(glam_images):
            break
        arr = line.decode().split("\t")
        keysX = arr[0].split("/")
        key = keysX[len(keysX) - 1]
        key = urllib.parse.unquote(key)
        if key in glam_images:
            counter += 1
            if counter % 100 == 0:
                logging.info("Loading progress: " +
                             str(counter * 100 // len(glam_images)) + "%")
            query = "SELECT * FROM dailyinsert('" + key.replace(
                "'", "''") + "','" + date_value.strftime("%Y-%m-%d") + "'," + arr[2] + "," + arr[22] + "," + arr[23] + ")"
            cur.execute(query)

    cur.execute('REFRESH MATERIALIZED VIEW visualizations_sum')
    cur.execute('REFRESH MATERIALIZED VIEW visualizations_stats')
    cur.close()


def load_images(conn):
    cur = conn.cursor()
    cur.execute("SELECT img_name FROM images;")
    w = 0
    glam_images = set()
    while w < cur.rowcount:
        w += 1
        image = cur.fetchone()
        image = image[0]
        if image not in glam_images:
            glam_images.add(image)
    cur.close()
    return glam_images


def process_mediacounts(glams: [dict], process_date: date, **kwargs) -> None:
    try:
        filepath = kwargs.get('filepath', None)
        remove_file_after_process = kwargs.get(
            'remove_file_after_process', True)
        if filepath == None:
            filepath = get_mediacount_file_by_date(process_date)

        for glam in glams:
            conn = get_glam_database_connection(glam["database"])
            glam_images = load_images(conn)
            _process(conn, process_date, filepath, glam_images)
            conn.close()
        if remove_file_after_process:
            os.remove(filepath)
    except Exception as error:
        logging.error(
            f'Error processing mediacount for date {process_date.strftime("%Y-%m-%d")}', error)
