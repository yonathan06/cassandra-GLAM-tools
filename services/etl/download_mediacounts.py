import os
import logging
from datetime import date
from urllib import request
from etl.s3 import upload_mediacount_file, tmp_mediacounts_folder
from tqdm import tqdm
wiki_dump_base_url = 'https://dumps.wikimedia.org/other/mediacounts/daily'


def tqdm_hook(t):
    last_b = [0]
    def update_to(b=1, bsize=1, tsize=None):
        if tsize is not None:
            t.total = tsize
        t.update((b - last_b[0]) * bsize)
        last_b[0] = b

    return update_to

def create_dir_if_not_exist(dir_name):
    if not os.path.exists(dir_name):
        os.mkdir(dir_name)


def download_file(date_val: date):
    local_year_folder = f"{tmp_mediacounts_folder}/{date_val.year}"
    create_dir_if_not_exist(local_year_folder)
    filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    filepath = f"{local_year_folder}/{filename}"
    download_url = f"{wiki_dump_base_url}/{date_val.year}/mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    logging.info(f"Starting download dump from {download_url}")
    with tqdm(unit = 'B', unit_scale = True, unit_divisor = 1024, miniters = 1, desc = filename) as t:
        request.urlretrieve(download_url, filepath, reporthook=tqdm_hook(t))
    upload_mediacount_file(date_val.year, filename)
    return filepath
