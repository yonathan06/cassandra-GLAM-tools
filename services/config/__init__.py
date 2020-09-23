import os
import json
from botocore.config import Config

config = json.load(open(f"{__package__}/config.{os.environ['ENV']}.json"))

os.environ["AWS_ACCESS_KEY_ID"] = config['aws']['config']['credentials']['accessKeyId']
os.environ["AWS_SECRET_ACCESS_KEY"] = config['aws']['config']['credentials']['secretAccessKey']

aws_config = Config(
    region_name=config['aws']['config']['region']
)
