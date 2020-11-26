import logging
import bz2
import os
from datetime import date, timedelta
from lib.sentry import with_sentry
from etl.glams_table import get_running_glams, get_glam_database_connection, get_glam_images
from etl.views import update_glam_mediacounts_from_file
from etl.run import process_glam
from etl.download_mediacounts import download_file

if __name__ == "__main__":
    logging.info("Starting daily tasks")
    with_sentry()
    yesterday_date = date.today() - timedelta(days=1)
    glams = get_running_glams()
    # run jobs
    filepath = download_file(yesterday_date)
    extracted_file = bz2.BZ2File(filepath, "r")

    for glam in glams:
        process_glam(glam)
        conn = get_glam_database_connection(glam['database'])
        glam_images = get_glam_images(conn)
        update_glam_mediacounts_from_file(
            extracted_file, yesterday_date, conn, glam_images, glam["name"])
        conn.close()

    extracted_file.close()
    os.remove(filepath)
