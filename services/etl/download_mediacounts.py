from datetime import date, datetime
import logging
import os
from urllib import request

from tqdm import tqdm

from etl.s3 import tmp_mediacounts_folder

wiki_dump_base_url = 'https://dumps.wikimedia.org/other/mediacounts/daily'

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True)

def _tqdm_hook(t):
    last_b = [0]
    def update_to(b=1, bsize=1, tsize=None):
        if tsize is not None:
            t.total = tsize
        t.update((b - last_b[0]) * bsize)
        last_b[0] = b

    return update_to


def _create_dir_if_not_exist(dir_name):
    if not os.path.exists(dir_name):
        os.mkdir(dir_name)


def download_file(date_val: date):
    local_year_folder = f"{tmp_mediacounts_folder}/{date_val.year}"
    _create_dir_if_not_exist(local_year_folder)
    filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    filepath = f"{local_year_folder}/{filename}"
    download_url = f"{wiki_dump_base_url}/{date_val.year}/mediacounts.{date_val.strftime('%Y-%m-06')}.v00.tsv.bz2"
    logging.info(f" {datetime.now()} Starting download dump from {download_url}")
    with tqdm(unit='B', unit_scale=True, unit_divisor=1024, miniters=1, desc=filename) as t:
        request.urlretrieve(download_url, filepath, reporthook=_tqdm_hook(t))
    return filepath

def get_nfs_file_path(date_val: date):
    mediacout_nfs_dir = f"/mnt/nfs/dumps-clouddumps1002.wikimedia.org/other/mediacounts/daily"
    filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    return f"{mediacout_nfs_dir}/{date_val.year}/{filename}"
