from datetime import date, datetime, timedelta
from etl.s3 import get_mediacount_file_by_date
import bz2
import sys
import logging
import os
from etl.glams_table import get_glam_by_name, get_glam_database_connection
from etl.views import process, loadImages
from config import config


def process_date(current_date, glam_conn):
    filepath = get_mediacount_file_by_date(current_date)
    process(glam_conn, current_date.strftime("%Y-%m-%d"), filepath)
    os.remove(filepath)


def process_new_glam_views(glam_name):
    glam = get_glam_by_name(glam_name)
    if glam == None:
        print("Unknown Glam name", glam_name)
        sys.exit(1)
    start_date = datetime.strptime(
        config['mediacountStartDate'], "%Y-%m-%d").date()
    current_date = start_date
    today = date.today()
    glam_conn = get_glam_database_connection(glam)
    loadImages(glam_conn)
    while current_date < today:
        process_date(current_date, glam_conn)
        current_date = current_date + timedelta(days=1)