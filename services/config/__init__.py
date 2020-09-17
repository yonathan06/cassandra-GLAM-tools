import os
import json

config = json.load(open(f"./config.{os.environ['ENV']}.json"))