import psycopg2
import psycopg2.extras
import psycopg2.errors
import logging
from config import config
import concurrent.futures
import os 
from datetime import date,datetime

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True)

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


def get_active_glams():
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


def get_active_glams():
    connection, cursor = open_connection()
    try:
        cursor.execute(
            "SELECT * FROM glams WHERE status!='disabled'")
        glams = cursor.fetchall()
        return glams
    except Exception as error:
        logging.error('Error getting all glams', error)
    finally:
        connection.close()
        cursor.close()


def get_glam_images(glam_conn):
    cur = glam_conn.cursor()
    cur.execute("SELECT img_name FROM images;")
    w = 0
    glam_images = set()
    while w < cur.rowcount:
        w += 1
        image = cur.fetchone()
        image = image[0]
        if image not in glam_images:
            glam_images.add(image)
    cur.close()
    return glam_images


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


def query_cassandra_db(query):
    connection, cursor = open_connection()
    try:
        cursor.execute(query)
    except Exception as error:
        logging.error('Error quering database', error)
    finally:
        connection.close()
        cursor.close()


def update_to_running(glam):
    query_cassandra_db(
        f"UPDATE glams SET status = 'running', lastrun = NOW() WHERE name = '{glam['name']}'")


def update_to_failed(glam):
    query_cassandra_db(
        f"UPDATE glams SET status = 'failed' WHERE name = '{glam['name']}'")


def update_min_date(glam, date_str):
    query_cassandra_db(
        f"UPDATE glams SET min_date = '{date_str}' WHERE name = '{glam['name']}'")


def create_database(database):
    conn, cur = open_connection()
    try:
        cur.execute(f"CREATE DATABASE {database} WITH OWNER = {postgres_config['user']} " +
                    "ENCODING = 'UTF8'" +
                    "CONNECTION LIMIT = -1 TEMPLATE template0;")
    except psycopg2.errors.DuplicateDatabase:
        logging.error(
            f'Error creating database {database} - duplicate')
    finally:
        conn.close()
        cur.close()


def get_glam_connection_str(glam_database):
    return f"""dbname={glam_database} user={config['postgres']['user']}
               password={config['postgres']['password']}
               host={config['postgres']['host']}
               port={str(config['postgres']['port'])}
            """


def get_glam_database_connection(glam_database):
    conn = psycopg2.connect(get_glam_connection_str(glam_database))
    conn.autocommit = True
    return conn


def open_glams_connections(glams):
    logging.info(f" {datetime.now()} opening connections for {len(glams)} glams")
    for glam in glams:
        glam['conn'] = get_glam_database_connection(glam['database'])


def close_glams_connections(glams):
    logging.info(f" {datetime.now()} closing connections for {len(glams)} glams")
    for glam in glams:
        glam['conn'].close()


def load_glams_images(glams):
    logging.info(f" {datetime.now()} loading images for {len(glams)} glams")
    for glam in glams:
        glam['images'] = get_glam_images(glam['conn'])


def _refresh_vis_sum_view(glam):
    logging.info(f" {datetime.now()} refreshing for visualizations_sum for {glam['name']}")
    cur = glam['conn'].cursor()
    cur.execute('REFRESH MATERIALIZED VIEW visualizations_sum')
    cur.close()
    logging.info(f" {datetime.now()} done refreshing for visualizations_sum for {glam['name']}")


def _refresh_vis_stats_view(glam):
    logging.info(f" {datetime.now()} refreshing for visualizations_stats for {glam['name']}")
    cur = glam['conn'].cursor()
    cur.execute('REFRESH MATERIALIZED VIEW visualizations_stats')
    cur.close()
    logging.info(f" {datetime.now()} done refreshing for visualizations_stats for {glam['name']}")


def refresh_glams_visualizations(glams):
    logging.info(f" {datetime.now()} refreshing views for {len(glams)} glams")
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        for glam in glams:
            executor.submit(_refresh_vis_sum_view, glam)
            executor.submit(_refresh_vis_stats_view, glam)
        logging.info(f" {datetime.now()} waiting for all data refreshes to be done")
        executor.shutdown(wait=True)
        logging.info(f" {datetime.now()} all data refreshes done")


def dailyinsert_query(key, arr, date_val):
    return f"SELECT * FROM dailyinsert('" + key.replace(
        "'", "''") + "','" + date_val.strftime("%Y-%m-%d") + "'," + arr[2] + "," + arr[22] + "," + arr[23] + ")"
