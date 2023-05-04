import boto3
import logging
import os
from datetime import date
from tqdm import tqdm
from config import config

bucket_name = config['aws']['wikiDumpBucket']
logging.info(f"Looking for bucket {bucket_name}")
s3 = boto3.resource('s3', region_name=config["aws"]["config"]["region"])
mediacounts_bucket = s3.Bucket(bucket_name)

client = boto3.client('s3', region_name=config["aws"]["config"]["region"])

# response = client.head_bucket(Bucket=bucket_name)
logging.info(f"found bucket {bucket_name}")

tmp_mediacounts_folder = f"{__package__}/tmp/{config['aws']['wikiMediacountsFolder']}"

if not os.path.exists(tmp_mediacounts_folder):
    os.makedirs(tmp_mediacounts_folder)

def _tqdm_hook(t):
  def inner(bytes_amount):
    t.update(bytes_amount)
  return inner

def get_mediacount_file_by_date(date_val: date):
    filename = f"mediacounts.{date_val.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    object_key = f"{config['aws']['wikiMediacountsFolder']}/{date_val.year}/{filename}"

    year_folder = f"{tmp_mediacounts_folder}/{date_val.year}"
    if not os.path.exists(year_folder):
        os.makedirs(year_folder)
    filepath = f"{year_folder}/{filename}"
    if not os.path.exists(filepath):
        logging.info(f"S3: Downloading {object_key}")
        file_object = s3.Object(bucket_name, object_key)
        filesize = file_object.content_length
        with tqdm(total=filesize, unit='B', unit_scale=True, unit_divisor = 1024, miniters = 1, desc=filename) as t:
            file_object.download_file(filepath, Callback=_tqdm_hook(t))
    else:
        logging.info(f"File {filename} already exist on disk")
    return filepath

def upload_mediacount_file(year: str, filename: str):
    object_key = f"{config['aws']['wikiMediacountsFolder']}/{year}/{filename}"
    filepath = f"{tmp_mediacounts_folder}/{year}/{filename}"
    logging.info(f"Uploading file to s3: {object_key}")
    s3.Object(bucket_name, object_key).upload_file(filepath)