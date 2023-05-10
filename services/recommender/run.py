import fcntl
import json
import logging
import os
import subprocess
import sys
from subprocess import SubprocessError
from datetime import date,datetime
from services.etl.glams_table import get_active_glams

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

config_file = '../config/config.json'

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True, format='%(asctime)s %(levelname)s %(message)s')



def run_recommender(glam):
    logging.info(' %s Running recommender for %s', datetime.now(), glam['name'])

    try:
        subprocess.run(['python3', 'similarity.py', glam['database']], check=True)
    except SubprocessError:
        logging.error(' %s Subprocess similarity.py failed', datetime.now())


def main():
    config = json.load(open(config_file))

    try:
        logging.info(' %s External error reporting enabled', datetime.now())

        sentry_logging = LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR
        )
        sentry_sdk.init(
            dsn=config['raven']['glamtoolsetl']['DSN'],
            integrations=[sentry_logging]
        )
    except KeyError:
        logging.info(' %s External error reporting DISABLED', datetime.now())
        pass

    for glam in get_active_glams():
        if 'status' in glam:
            if glam['status'] == 'paused':
                logging.info(' %s Glam %s is paused', glam['name'], datetime.now())
                continue

            if glam['status'] == 'failed':
                logging.info(' %s Glam %s is failed', glam['name'], datetime.now())
                continue

            run_recommender(glam)


if __name__ == '__main__':
    # change the working directory to the script's own directory
    script_dir = os.path.dirname(sys.argv[0])
    if script_dir != '':
        os.chdir(script_dir)

    try:
        lockfile = open('/tmp/cassandra_recommender.lock', 'w')
        fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
        main()
        fcntl.flock(lockfile, fcntl.LOCK_UN)
    except IOError:
        raise SystemExit('Recommender is already running')
