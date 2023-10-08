from datetime import date, datetime
import logging
import os
from urllib import request
from shutil import copyfile

from tqdm import tqdm


if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True)


def _create_dir_if_not_exist(dir_name):
    if not os.path.exists(dir_name):
        os.mkdir(dir_name)

def get_tmp_file_path(date_val: date):
    local_year_folder = f"{__package__}/tmp/{date_val.year}"
    _create_dir_if_not_exist(local_year_folder)
    filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv"
    filepath = f"{local_year_folder}/{filename}"
    return filepath

def get_nfs_file_path(date_val: date):
    mediacout_nfs_dir = f"/mnt/nfs/dumps-clouddumps1002.wikimedia.org/other/mediacounts/daily"
    filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    return f"{mediacout_nfs_dir}/{date_val.year}/{filename}"
