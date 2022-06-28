import logging
import bz2
from tqdm import tqdm
import urllib.parse
from etl.glams_table import dailyinsert_query
import concurrent.futures


def _get_total_glam_images(glams):
    total_image_num = 0
    for glam in glams:
        total_image_num += len(glam['images'])


def get_file_key_from_line(line):
    arr = line.decode().split("\t")
    keysX = arr[0].split("/")
    key = keysX[len(keysX) - 1]
    key = urllib.parse.unquote(key)
    return key, arr


def exec_dailyinsert(glam, key, arr, date_val):
    glam['cur'].execute(
        dailyinsert_query(key, arr, date_val))


def _dailyinsert_glams(glams, line, date_val, executor: concurrent.futures.ThreadPoolExecutor):
    key, arr = get_file_key_from_line(line)
    counter = 0
    for glam in glams:
        if key in glam['images']:
            executor.submit(exec_dailyinsert, glam, key, arr, date_val)
            counter += 1
    return counter


def dailyinsert_from_file(glams, filepath, date_val):
    with bz2.BZ2File(filepath, "r") as extracted_file:
        for glam in glams:
            glam.queries = []
        total_image_num = _get_total_glam_images(glams)
        with tqdm(total=total_image_num) as bar:
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                counter = 0
                for line in extracted_file:
                    inserted_counter = _dailyinsert_glams(
                        glams, line, date_val, executor)
                    counter += inserted_counter
                    bar.update(inserted_counter)
                    if counter == total_image_num:
                        logging.info(
                            f"Counter {counter} total_image_num{total_image_num}")
                        break
                logging.info(f"waiting for all queries to be done")
                executor.shutdown(wait=True)
                logging.info(f"queries are done")