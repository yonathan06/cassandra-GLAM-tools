import fcntl
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta
from subprocess import SubprocessError

import psycopg2.errors

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

from .glams_table import create_database, get_glams, update_to_failed, update_to_running, get_glam_by_name
from config import config

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')

def views_date():
    date = datetime.utcnow() - timedelta(days=1)
    return date.strftime("%Y-%m-%d")

def setup(name):
    logging.info('Running setup.js for %s', name)
    subprocess.run(['node', f'{__package__}/setup.js', name], check=True)
    logging.info('Subprocess setup.js completed')

def etl(name):
    logging.info('Running etl.js for %s', name)
    subprocess.run(['node', f'{__package__}/etl.js', name], check=True)
    logging.info('Subprocess etl.js completed')


def process_glam(glam):
    if datetime.utcnow() < glam['lastrun'] + timedelta(days=1):
        logging.info('Glam %s is already updated', glam['name'])
        return

    # mediacounts are available around 2:00 UTC
    if datetime.utcnow().hour <= 2:
        logging.info('Glam %s update delayed', glam['name'])
        return

    success = True
    logging.info('Running scheduler for %s', glam['name'])

    # Run etl.js
    try:
        etl(glam['name'])
    except SubprocessError as e:
        success = False
        logging.error('Subprocess etl.js failed')

        if e.returncode == 65:
            logging.error('Glam %s is now failed', glam['name'])
            update_to_failed(glam, config)
            return

    if success:
        logging.info('Completed scheduler for %s', glam['name'])
        update_to_running(glam)
    else:
        logging.error('Failed scheduler for %s', glam['name'])

def first_time_process(glam):
    glam['lastrun'] = datetime.fromtimestamp(0)
    create_database(glam['database'])
    try:
        setup(glam['name'])
    except SubprocessError:
        logging.error('Subprocess setup.py failed')
        return
    process_glam(glam)

def main():
    try:
        sentry_logging = LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR
        )
        sentry_sdk.init(
            dsn=config['raven']['glamtoolsetl']['DSN'],
            integrations=[sentry_logging]
        )
        logging.info('External error reporting ENABLED')
    except KeyError:
        logging.info('External error reporting DISABLED')
    try:
        glams_rows = get_glams()
        for glam in glams_rows:
            glam_status = glam['status']
            if glam_status == 'paused' or glam_status == 'failed':
                logging.info('Glam %s is %s', glam['name'], glam_status)
                continue
            if glam['lastrun'] == None:
                # this is the first run
                glam['lastrun'] = datetime.fromtimestamp(0)
                create_database(glam['database'])
                try:
                    setup(glam['name'])
                except SubprocessError:
                    logging.error('Subprocess setup.py failed')
                    continue
            else:
                glam['lastrun'] = glam['lastrun'].replace(tzinfo=None)
            process_glam(glam)

    except (Exception, psycopg2.Error) as error: 
        logging.error("Error while fetching and processing glams from PostgreSQL", error)

if __name__ == '__main__':
    # change the working directory to the script's own directory
    script_dir = os.path.dirname(sys.argv[0])
    if script_dir != '':
        os.chdir(script_dir)

    try:
        lockfile = open('/tmp/cassandra.lock', 'w')
        fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
        main()
        fcntl.flock(lockfile, fcntl.LOCK_UN)
    except IOError:
        raise SystemExit('Scheduler is already running')
