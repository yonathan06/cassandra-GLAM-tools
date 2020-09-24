import json
import logging
import os
import subprocess
import time
from datetime import date, datetime, timedelta
from subprocess import SubprocessError

import psycopg2
from psycopg2 import ProgrammingError

from .glams_table import get_glams, update_min_date, get_glam_database_connection
from config import config
import etl.views

global_min_date = datetime.strptime(
    config['mediacountStartDate'], "%Y-%m-%d").date()
global_max_date = date.today() - timedelta(days=2)
views_dir = 'tmp'


def add_missing_dates(glam: dict):
    logging.info('Adding missing dates to glam: %s', glam['name'])

    conn = get_glam_database_connection(glam['database'])
    curse = conn.cursor()

    # Find the dates already in the database
    curse.execute(
        "SELECT distinct access_date FROM visualizations ORDER BY access_date")
    current_dates = list(map(lambda x: x[0], curse.fetchall()))

    # Find the date of the first image, if any
    curse.execute("SELECT min(img_timestamp) FROM images")
    try:
        first_image = curse.fetchone()[0].date()
    except TypeError:
        first_image = global_min_date
    conn.close()

    if glam['min_date'] != None:
        min_date = datetime.strptime(glam['min_date'], "%Y-%m-%d").date()
    else:
        min_date = max([first_image, global_min_date])

    candidate_dates = [min_date + timedelta(days=x)
                       for x in range(0, (global_max_date - min_date).days)]

    glam['missing_dates'] = []

    for date_value in candidate_dates:
        if date_value not in current_dates:
            glam['missing_dates'].append(date_value)


def process_glams_mediacounts():
    glams = []

    for glam in get_glams():
        if 'status' in glam:
            if glam['status'] == 'paused':
                logging.info('Glam %s is paused', glam['name'])
                continue

            if glam['status'] == 'failed':
                logging.info('Glam %s is failed', glam['name'])
                continue

            add_missing_dates(glam)
            glams.append(glam)

    date_interval = [global_min_date + timedelta(days=x)
                     for x in range(0, (global_max_date - global_min_date).days)]

    for date_value in date_interval:
        logging.info('Working with date %s', date_value)

        for glam in glams:
            glams_with_missing_date = []
            logging.info('Working with GLAM %s', glam['name'])
            date_str = date_value.strftime("%Y-%m-%d")

            if date_value in glam['missing_dates']:
                glams_with_missing_date.append(glam)
                update_min_date(glam, date_str)
            if len(glams_with_missing_date) != 0:
                etl.views.process_mediacounts(
                    glams_with_missing_date, date_value)
