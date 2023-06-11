import logging
import os
from datetime import datetime, date, timedelta
import subprocess
from config import config
from etl.mediacounts_dump import dailyinsert_from_file
from etl.glams_table import close_glams_connections, create_database, get_glam_by_name, load_glams_images, open_glams_connections, refresh_glams_visualizations
from etl.etl_glam import process_glam
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from etl.download_mediacounts import get_nfs_file_path


def _get_glams_from_body(body):
    glams = []
    if "glams" in body:
        logging.info(
            f' {datetime.now()} Received new message with {len(body["glams"])} glams')
        for glam in body['glams']:
            glam = get_glam_by_name(glam["name"])
            glams.append(glam)
    else:
        logging.info(f' {datetime.now()} Received new message. Glam name: {body["name"]}')
        glam = get_glam_by_name(body["name"])
        glams.append(glam)
    return glams


def _setup(name):
    logging.info(' %s Running setup.js for %s', datetime.now(), name)
    subprocess.run(['node', '--max-old-space-size=5120', 'etl/setup.js', name], check=True)
    logging.info(' %s Subprocess setup.js completed', datetime.now())


def _first_time_process(glam):
    glam['lastrun'] = datetime.fromtimestamp(0)
    create_database(glam['database'])
    try:
        _setup(glam['name'])
    except subprocess.SubprocessError:
        logging.error(' %s Subprocess setup.py failed', datetime.now())
        return
    process_glam(glam)


def _initialize_glams(glams):
    logging.info(f" {datetime.now()} Initializing {len(glams)} glams")
    for glam in glams:
        _first_time_process(glam)


def _process_mediacounts(glams):
    logging.info(f" {datetime.now()} Processing mediacounts for {len(glams)} glams")
    today = date.today()
    current_date = datetime.strptime(
        config['mediacountStartDate'], "%Y-%m-%d").date()
    while current_date < today:
        logging.info(f" {datetime.now()} Loading mediacounts for date: {current_date}")
        try:
            filepath = get_nfs_file_path(current_date)
            dailyinsert_from_file(glams, filepath, current_date)
        except Exception as err:
            logging.error(f" {datetime.now()} Error loading mediacount for date {current_date}:\n{err}")
        current_date = current_date + timedelta(days=1)


class MyServer(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
    def do_POST(self):
        length = int(self.headers.get('content-length'))
        message = json.loads(self.rfile.read(length))
        glams = _get_glams_from_body(message)
        if glams == None or len(glams) == 0:
            self.send_response(400)
        else:
            self.send_response(201)
            _initialize_glams(glams)
            open_glams_connections(glams)
            load_glams_images(glams)
            _process_mediacounts(glams)
            refresh_glams_visualizations(glams)
            close_glams_connections(glams)
            logging.info(f" {datetime.now()} Done adding {len(glams)} glams: {', '.join(map(lambda glam: glam['name'], glams))}")

if __name__ == "__main__":
    hostName = "0.0.0.0"
    serverPort = 8080
    logging.basicConfig(filename=f"new_glam_listener.log", filemode='a', level=logging.INFO, force=True)
    webServer = HTTPServer((hostName, serverPort), MyServer)
    print("Server started http://%s:%s" % (hostName, serverPort))

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")

