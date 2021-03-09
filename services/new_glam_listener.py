import logging
import os
from datetime import datetime, date, timedelta
import subprocess
from sqs_listener import SqsListener
from config import config
from etl.s3 import get_mediacount_file_by_date
from etl.mediacounts_dump import dailyinsert_from_file
from etl.glams_table import close_glams_connections, create_database, get_glam_by_name, load_glams_images, open_glams_connections, refresh_glams_visualizations
from etl.etl_glam import process_glam


def _get_glams_from_body(body):
    glams = []
    if "glams" in body:
        logging.info(
            f'Received new message with {len(body["glams"])} glams')
        for glam in body['glams']:
            glam = get_glam_by_name(glam["name"])
            glams.append(glam)
    else:
        logging.info(f'Received new message. Glam name: {body["name"]}')
        glam = get_glam_by_name(body["name"])
        glams.append(glam)
    return glams


def _setup(name):
    logging.info('Running setup.js for %s', name)
    subprocess.run(['node', f'etl/setup.js', name], check=True)
    logging.info('Subprocess setup.js completed')


def _first_time_process(glam):
    glam['lastrun'] = datetime.fromtimestamp(0)
    create_database(glam['database'])
    try:
        _setup(glam['name'])
    except subprocess.SubprocessError:
        logging.error('Subprocess setup.py failed')
        return
    process_glam(glam)


def _initialize_glams(glams):
    logging.info(f"Initializing {len(glams)} glams")
    for glam in glams:
        _first_time_process(glam)


def _process_mediacounts(glams):
    logging.info(f"Processing mediacounts for {len(glams)} glams")
    today = date.today()
    current_date = datetime.strptime(
        config['mediacountStartDate'], "%Y-%m-%d").date()
    while current_date < today:
        logging.info(f"Loading mediacounts for date: {current_date}")
        filepath = get_mediacount_file_by_date(current_date)
        dailyinsert_from_file(glams, filepath, current_date)
        os.remove(filepath)
        current_date = current_date + timedelta(days=1)


class NewGlamListener(SqsListener):
    def handle_message(self, body, attributes, message_attributes):
        glams = _get_glams_from_body(body)
        _initialize_glams(glams)
        open_glams_connections(glams)
        load_glams_images(glams)
        _process_mediacounts(glams)
        refresh_glams_visualizations(glams)
        close_glams_connections(glams)
        logging.info(f"Done adding {len(glams)} glams: {', '.join(map(lambda glam: glam['name'], glams))}")


os.environ['AWS_ACCOUNT_ID'] = config['aws']['config']['credentials']['accessKeyId']

if __name__ == "__main__":
    listener = NewGlamListener(
        config['aws']['newGlamQueueName'],
        region_name=config['aws']['config']['region'],
        queue_url=config['aws']['newGlamQueueUrl']
    )
    listener.listen()
