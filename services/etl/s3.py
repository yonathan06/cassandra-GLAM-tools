import boto3
import logging
import os
from config import config

bucket_name = config['aws']['wikiDumpBucket']
logging.info(f"Looking for bucket {bucket_name}")
s3 = boto3.resource('s3', region_name=config["aws"]["config"]["region"])
mediacounts_bucket = s3.Bucket(bucket_name)

client = boto3.client('s3', region_name=config["aws"]["config"]["region"])

response = client.head_bucket(Bucket=bucket_name)
logging.info(f"found bucket {bucket_name}")

tmp_mediacounts_folder = f"{__package__}/tmp/{config['aws']['wikiMediacountsFolder']}"

if not os.path.exists(tmp_mediacounts_folder):
    os.makedirs(tmp_mediacounts_folder)


def get_mediacount_file_by_date(date):
    filename = f"mediacounts.{date.strftime('%Y-%m-%d')}.v00.tsv.bz2"
    object_key = f"{config['aws']['wikiMediacountsFolder']}/{date.year}/{filename}"

    year_folder = f"{tmp_mediacounts_folder}/{date.year}"
    if not os.path.exists(year_folder):
        os.makedirs(year_folder)
    filepath = f"{year_folder}/{filename}"

    logging.info(f"S3: Downloading {object_key}")
    s3.Object(bucket_name, object_key).download_file(filepath)
    return filepath
