import os
import json
import logging
from botocore.config import Config
from datetime import date, timedelta, datetime
import argparse

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True, format='%(asctime)s %(levelname)s %(message)s')
 
env = os.environ.get('ENV')

if env == None:
    raise Exception("ENV variable is not set")

logging.info(f" {datetime.now()} env: {env}")

config = json.load(open(f"{__package__}/config.{env}.json"))
