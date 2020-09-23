import logging
import os
from sqs_listener import SqsListener
from config import config
from etl.glams_table import get_glam_by_name
from etl.run import first_time_process

class NewGlamListener(SqsListener):
    def handle_message(self, body, attributes, messages_attributes):
      glam_name = body["name"]
      print(f'received new message. Glam name: {glam_name}')
      glam = get_glam_by_name(glam_name)
      first_time_process(glam)

logger = logging.getLogger('sqs_listener')
logger.setLevel(logging.INFO)

sh = logging.FileHandler('listener.log')
sh.setLevel(logging.INFO)

formatstr = '[%(asctime)s - %(name)s - %(levelname)s]  %(message)s'
formatter = logging.Formatter(formatstr)

sh.setFormatter(formatter)
logger.addHandler(sh)

os.environ['AWS_ACCOUNT_ID'] = config['aws']['config']['credentials']['accessKeyId']

listener = NewGlamListener(
    config['aws']['newGlamQueueName'],
    region_name=config['aws']['config']['region'],
    queue_url=config['aws']['newGlamQueueUrl']
)

if __name__ == "__main__":
    listener.listen()
