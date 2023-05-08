import os
import json
import logging
from botocore.config import Config
from datetime import date, timedelta

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True, format='%(asctime)s %(levelname)s %(message)s')


env = os.environ['ENV']

logging.info(f"env: {env}")

config = json.load(open(f"{__package__}/config.{env}.json"))

os.environ["AWS_ACCESS_KEY_ID"] = config['aws']['config']['credentials']['accessKeyId']
os.environ["AWS_SECRET_ACCESS_KEY"] = config['aws']['config']['credentials']['secretAccessKey']


aws_config = Config(
    region_name=config['aws']['config']['region']
)
