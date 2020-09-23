import json
import psycopg2
import psycopg2.extras
import psycopg2.errors
from psycopg2 import ProgrammingError
import logging
from datetime import datetime, timedelta
from config import config

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')

postgres_config = config['postgres']

connstring = "dbname=" + postgres_config['database'] + " user=" + postgres_config['user'] + \
    " password=" + postgres_config['password'] + \
    " host=" + postgres_config['host'] + \
    " port=" + str(postgres_config['port'])


def open_connection(autocommit=True):
    connection = psycopg2.connect(connstring)
    connection.autocommit = autocommit
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    return (connection, cursor)


def get_glams():
    connection, cursor = open_connection()
    try:
        cursor.execute("SELECT * FROM glams")
        glams = cursor.fetchall()
        return glams
    except Exception as error:
        logging.error('Error getting all glams', error)
    finally:
        connection.close()
        cursor.close()


def get_glam_by_name(name):
    connection, cursor = open_connection()
    try:
        cursor.execute(f"SELECT * FROM glams WHERE name = '{name}'")
        return cursor.fetchone()
    except Exception as error:
        logging.error('Error get glam by name', error)
    finally:
        connection.close()
        cursor.close()


def query_cassandra(query):
    connection, cursor = open_connection()
    try:
        cursor.execute(query)
    except Exception as error:
        logging.error('Error quering database', error)
    finally:
        connection.close()
        cursor.close()


def update_to_running(glam):
    query_cassandra(
        f"UPDATE glams SET status = 'running', lastrun = NOW() WHERE name = '{glam['name']}'")


def update_to_failed(glam):
    query_cassandra(
        f"UPDATE glams SET status = 'failed' WHERE name = '{glam['name']}'")


def update_min_date(glam, date_str):
    query_cassandra(
        f"UPDATE glams SET min_date = '{date_str}' WHERE name = '{glam['name']}'")


def create_database(database):
    conn, cur = open_connection()
    try:
        cur.execute(f"CREATE DATABASE {database} WITH OWNER = {postgres_config['user']} " +
                    "ENCODING = 'UTF8' TABLESPACE = pg_default " +
                    "CONNECTION LIMIT = -1 TEMPLATE template0;")
    except psycopg2.errors.DuplicateDatabase:
        logging.error(
            f'Error creating database {database} - duplicate')
    finally:
        conn.close()
        cur.close()
