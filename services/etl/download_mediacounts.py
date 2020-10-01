import os
from datetime import date
from config import config
from urllib import request
from etl.s3 import upload_mediacount_file, tmp_mediacounts_folder
wiki_dump_base_url = 'https://dumps.wikimedia.org/other/mediacounts/daily/'


def reporter(first, second, third):
    if first % 1000 == 0:
        print("Download progress: " + str(first * second * 100 // third) + "%")


def download_file(date_val: date):
    local_year_folder = f"{tmp_mediacounts_folder}/{date.year}"
    if not os.path.exists(local_year_folder):
        os.mkdir(local_year_folder)

	filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
	filepath = f"{local_year_folder}/{filename}"
	download_url = f"{wiki_dump_base_url}/{date.year}/mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
	request.urlretrieve(download_url, filepath, reporter)
	upload_mediacount_file(date_val.year, filename)
	return filepath
