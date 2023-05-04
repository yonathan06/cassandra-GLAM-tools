import os
import json
import logging
from botocore.config import Config
import argparse
 
 
# Initialize parser
parser = argparse.ArgumentParser()
 
# Adding optional argument
parser.add_argument("-e", "--ENV", help = "You need to insert an environment variable, like: development/ production")
 
# Read arguments from command line
args = parser.parse_args()

# env = os.environ['ENV']
env = args.ENV


logging.info(f"env: {env}")

config = json.load(open(f"{__package__}/config.{env}.json"))

os.environ["AWS_ACCESS_KEY_ID"] = config['aws']['config']['credentials']['accessKeyId']
os.environ["AWS_SECRET_ACCESS_KEY"] = config['aws']['config']['credentials']['secretAccessKey']


aws_config = Config(
    region_name=config['aws']['config']['region']
)
