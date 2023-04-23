import logging
import os
from datetime import datetime, date, timedelta
import subprocess
from config import config
from etl.s3 import get_mediacount_file_by_date
from etl.mediacounts_dump import dailyinsert_from_file
from etl.glams_table import close_glams_connections, create_database, get_glam_by_name, load_glams_images, open_glams_connections, refresh_glams_visualizations
from etl.etl_glam import process_glam
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

hostName = "0.0.0.0"
serverPort = 8080


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
        try:
            filepath = get_mediacount_file_by_date(current_date)
            dailyinsert_from_file(glams, filepath, current_date)
            os.remove(filepath)
        except Exception as err:
            logging.error(f"Error loading mediacount for date {current_date}:\n{err}")
        current_date = current_date + timedelta(days=1)


class MyServer(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length'))
        message = json.loads(self.rfile.read(length))
        glams = _get_glams_from_body(message)
        self.send_header("Content-type", "text/plain")
        if glams == None or len(glams) == 0:
            self.send_response(400)
            self.end_headers()
            self.wfile.write("Bad payload".encode("utf-8")) 
        else:
            self.send_response(201)
            self.end_headers()
            self.wfile.write("Adding".encode("utf-8")) 
        _initialize_glams(glams)
        open_glams_connections(glams)
        load_glams_images(glams)
        _process_mediacounts(glams)
        refresh_glams_visualizations(glams)
        close_glams_connections(glams)
        logging.info(f"Done adding {len(glams)} glams: {', '.join(map(lambda glam: glam['name'], glams))}")

if __name__ == "__main__":        
    webServer = HTTPServer((hostName, serverPort), MyServer)
    print("Server started http://%s:%s" % (hostName, serverPort))

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")

