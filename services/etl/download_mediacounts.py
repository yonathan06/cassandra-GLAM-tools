import os
from datetime import date
from config import config
from urllib import request
from etl.s3 import upload_mediacount_file, tmp_mediacounts_folder
wiki_dump_base_url = 'https://dumps.wikimedia.org/other/mediacounts/daily'


def reporter(first, second, third):
    if first % 1000 == 0:
        print("Download progress: " + str(first * second * 100 // third) + "%")


def create_dir_if_not_exist(dir_name):
    if not os.path.exists(dir_name):
        os.mkdir(dir_name)


def download_file(date_val: date):
    local_year_folder = f"{tmp_mediacounts_folder}/{date_val.year}"
    create_dir_if_not_exist(local_year_folder)
    filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    filepath = f"{local_year_folder}/{filename}"
    download_url = f"{wiki_dump_base_url}/{date_val.year}/mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    request.urlretrieve(download_url, filepath, reporter)
    upload_mediacount_file(date_val.year, filename)
    return filepath
