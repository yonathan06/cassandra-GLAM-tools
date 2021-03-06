import psycopg2
import psycopg2.extras
import psycopg2.errors
import logging
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


def get_glams():
    connection, cursor = open_connection()
    try:
        cursor.execute(
            "SELECT * FROM glams")
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
    logging.info(f"opening connections for {len(glams)} glams")
    for glam in glams:
        glam['conn'] = get_glam_database_connection(glam['database'])
        glam['cur'] = glam['conn'].cursor()


def close_glams_connections(glams):
    logging.info(f"closing connections for {len(glams)} glams")
    for glam in glams:
        glam['cur'].close()
        glam['conn'].close()


def load_glams_images(glams):
    logging.info(f"loading images for {len(glams)} glams")
    for glam in glams:
        glam['images'] = get_glam_images(glam['conn'])


def refresh_glams_visualizations(glams):
    logging.info(f"refrashing views for {len(glams)} glams")
    for glam in glams:
        logging.info(f"refrashing for {glam['name']}")
        glam['cur'].execute('REFRESH MATERIALIZED VIEW visualizations_sum')
        glam['cur'].execute('REFRESH MATERIALIZED VIEW visualizations_stats')

def dailyinsert_query(key, arr, date_val):
    return f"SELECT * FROM dailyinsert('" + key.replace(
        "'", "''") + "','" + date_val.strftime("%Y-%m-%d") + "'," + arr[2] + "," + arr[22] + "," + arr[23] + ")"