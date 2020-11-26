import sys
from etl.glams_table import get_glam_by_name
from datetime import date, datetime, timedelta
from etl.views import process_mediacounts


def process_glam_views(glam, date_val):
    today = date.today()
    while date_val < today:
        process_mediacounts([glam], date_val)
        date_val = date_val + timedelta(days=1)


if __name__ == '__main__':
    glam_name = sys.argv[1]
    date_str = sys.argv[2]
    glam = get_glam_by_name(glam_name)
    date_val = datetime.strptime(date_str, "%Y-%m-%d").date()
    process_glam_views(glam, date_val)
