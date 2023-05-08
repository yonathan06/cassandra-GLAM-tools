import logging
import os
import subprocess
from datetime import datetime, timedelta, date
from subprocess import SubprocessError
from .glams_table import update_to_failed, update_to_running

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True)

def _etl(name):
    logging.info('Running etl.js for %s', name)
    subprocess.run(['node', f'{__package__}/etl.js', name], check=True)
    logging.info('Subprocess etl.js completed')


def process_glam(glam):
    if glam['lastrun'] != None and datetime.utcnow() < glam['lastrun'].replace(tzinfo=None) + timedelta(days=1):
        logging.info('Glam %s is already updated', glam['name'])
        return

    success = True
    logging.info(f'Processing glam: {glam["name"]}')

    try:
        _etl(glam['name'])
    except SubprocessError as e:
        success = False
        logging.error('Subprocess etl.js failed')

        if e.returncode == 65:
            logging.error('Glam %s is now failed', glam['name'])
            update_to_failed(glam)
            return

    if success:
        logging.info('Completed scheduler for %s', glam['name'])
        update_to_running(glam)
    else:
        logging.error('Failed scheduler for %s', glam['name'])
