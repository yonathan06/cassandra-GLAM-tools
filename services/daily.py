import fcntl
import logging

from config import config
from lib.sentry import with_sentry
from etl.run_views import process_glams_mediacounts
from etl.run import process_all_glams

if __name__ == "__main__":
    logging.info("Starting daily tasks")
    with_sentry()
    lockfile = open(f'tmp/cassandra_views.lock', 'w')
    fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)

    # run jobs
    process_all_glams()
    process_glams_mediacounts()

    fcntl.flock(lockfile, fcntl.LOCK_UN)
