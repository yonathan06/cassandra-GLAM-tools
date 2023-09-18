import datetime
from etl.glams_table import close_glams_connections, get_active_glams, open_glams_connections
from csv import DictWriter
import sys

START_YEAR = 2020
END_YEAR = 2023

FIELDS = ['Slug', 'Name', 'Wikimedia Category', 'Joined At', 'Country', f'Media Before {START_YEAR}', 'Media From 2020', 'Media From 2021', 'Media From 2022', 'Media From 2023', 'All Media']

filename = sys.argv[1]

def get_start_of_year(year: int):
    return datetime.date(year, 1, 1)


def get_media_count(conn, start_year = None, end_year = None):
    cursor = conn.cursor()
    if start_year is None and end_year is None:
        cursor.execute("SELECT COUNT(*) FROM images")
    elif start_year is not None and end_year is not None:
        data = (start_year, end_year)
        cursor.execute("SELECT COUNT(*) FROM images WHERE img_timestamp >= %s AND img_timestamp < %s", data)
    elif start_year is None and end_year is not None:
        data = (end_year,)
        cursor.execute("SELECT COUNT(*) FROM images WHERE img_timestamp < %s", data)
    else:
        return None
    return cursor.fetchall()[0][0]




glams = get_active_glams()
glams_info = list()
for glam in glams:
    info = {}
    info['Slug'] = glam['name']
    info['Name'] = glam['fullname']
    info['Wikimedia Category'] = glam['category']
    info['Country'] = glam['country']
    info['Joined At'] = glam['created_at'].strftime('%Y-%m-%d')
    glams_info.append(info)


open_glams_connections(glams)
for i, glam in enumerate(glams):
    conn = glam['conn']
    glam_info = glams_info[i]
    print(f"Getting media count for {glam['fullname']}... ", end="")
    glam_info[f"Media Before {START_YEAR}"] = get_media_count(conn, end_year=get_start_of_year(START_YEAR))
    for year in range(START_YEAR, END_YEAR + 1):
        media_count = get_media_count(conn, start_year = get_start_of_year(year), end_year=get_start_of_year(year + 1))
        glam_info[f"Media From {year}"] = media_count
    glam_info["All Media"] = get_media_count(conn)
    print("Done")


close_glams_connections(glams)

glams_info = sorted(glams_info, key=lambda x: x['Joined At'])
with open(filename, "w") as out:
    writer = DictWriter(out, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(glams_info)
