import io
import logging
import bz2
from tqdm import tqdm
import urllib.parse
from etl.glams_table import dailyinsert_query
import concurrent.futures
import os 
from datetime import date,datetime

BZ2_COMPRESSION_RATIO = 5
BUFFER_SIZE = 1024 * 1024 * 16

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True)

def _get_total_glam_images(glams):
    total_image_num = 0
    for glam in glams:
        total_image_num += len(glam['images'])
    return total_image_num


def get_file_key_from_line(line):
    arr = line.decode().split("\t")
    keysX = arr[0].split("/")
    key = keysX[len(keysX) - 1]
    key = urllib.parse.unquote(key)
    return key, arr


def _dailyinsert_glams(glams, line, date_val):
    key, arr = get_file_key_from_line(line)
    counter = 0
    for glam in glams:
        if key in glam['images']:
            glam.queries.append(dailyinsert_query(key, arr, date_val))
            counter += 1
    return counter

def _send_query(glam):
    if len(glam.queries) == 0:
        return
    cur = glam['conn'].cursor()
    cur.execute(';'.join(glam.queries))
    cur.close()

def dailyinsert_from_file(glams, filepath, date_val, pos=0, should_exit=None):
    logging.info(f"Getting data for {date_val}")
    for glam in glams:
        glam.queries = []
    total_image_num = _get_total_glam_images(glams)
    approximate_uncompressed_size = os.path.getsize(filepath) * BZ2_COMPRESSION_RATIO
    with tqdm(total=approximate_uncompressed_size, position=pos) as bar:
        with open(filepath, "rb") as file:
            # Use a big buffer to increase concurrent performace
            decomp_file = bz2.BZ2File(io.BufferedReader(file, buffer_size=BUFFER_SIZE))
            for line in decomp_file:
                if should_exit is not None and should_exit.is_set():
                    return
                counter = 0
                inserted_counter = _dailyinsert_glams(
                    glams, line, date_val)
                counter += inserted_counter
                bar.update(len(line))
                if counter == total_image_num:
                    break
    logging.info(f" {datetime.now()} sending queries to server...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(glams)) as executor:
        for glam in glams:
            executor.submit(_send_query, glam)
        executor.shutdown(wait=True)
    logging.info(f" {datetime.now()} queries are done")