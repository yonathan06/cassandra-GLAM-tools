import argparse
import bz2
import json
import os
import sys
import urllib.parse
import urllib.request
import logging
import psycopg2

from .glams_table import get_glam_by_name, get_glam_database_connection
from config import config

watched = set()


def reporter(first, second, third):
    if first % 1000 == 0:
        print("Download progress: " + str(first * second * 100 // third) + "%")


def download(date, folder):
    if not os.path.exists(folder):
        os.makedirs(folder)

    filename = os.path.join(folder, date + '.tsv.bz2')

    year, month, day = date.split("-")
    baseurl = "https://dumps.wikimedia.org/other/mediacounts/daily/"
    finalurl = baseurl + year + "/mediacounts." + \
        year + "-" + month + "-" + day + ".v00.tsv.bz2"

    # check file size
    if os.path.isfile(filename):
        remote_size = urllib.request.urlopen(finalurl).length
        local_size = os.stat(filename).st_size
        if remote_size == local_size:
            return filename
        else:
            os.remove(filename)

    print("Retrieving " + finalurl + "...")
    urllib.request.urlretrieve(finalurl, filename, reporter)
    print("Download completed.")

    return filename


def process(conn, date, filename):
    logging.info(f"Loading visualizations from file {filename}")

    source_file = bz2.BZ2File(filename, "r")
    cur = conn.cursor()
    counter = 0

    for line in source_file:
        if counter == len(watched):
            break
        arr = line.decode().split("\t")
        keysX = arr[0].split("/")
        key = keysX[len(keysX) - 1]
        key = urllib.parse.unquote(key)
        if key in watched:
            counter += 1
            if counter % 100 == 0:
                logging.info("Loading progress: " +
                      str(counter * 100 // len(watched)) + "%")
            query = "SELECT * FROM dailyinsert('" + key.replace(
                "'", "''") + "','" + date + "'," + arr[2] + "," + arr[22] + "," + arr[23] + ")"
            cur.execute(query)

    cur.execute('REFRESH MATERIALIZED VIEW visualizations_sum')
    cur.execute('REFRESH MATERIALIZED VIEW visualizations_stats')
    cur.close()
    source_file.close()


def loadImages(conn):
    cur = conn.cursor()
    cur.execute("SELECT img_name FROM images;")
    w = 0
    while w < cur.rowcount:
        w += 1
        file = cur.fetchone()
        file = file[0]
        # print(file)
        if file not in watched:
            watched.add(file)
    cur.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('glam', type=str)
    parser.add_argument('date', type=str)
    parser.add_argument('--dir', type=str, required=False, default='temp')
    args = parser.parse_args()

    # read settings

    glam = get_glam_by_name(args.glam)

    if glam == None:
        print("Unknown Glam name", args.glam)
        sys.exit(1)

    pgconnection = get_glam_database_connection(glam)

    loadImages(pgconnection)
    filename = download(args.date, args.dir)
    process(pgconnection, args.date, filename)

    os.remove(filename)
    pgconnection.close()
    print("Process completed")

if __name__ == "__main__":
    main()
