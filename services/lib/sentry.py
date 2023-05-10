import logging
import os
from datetime import date,datetime
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from config import config

if not os.path.exists("Logs"):
    os.makedirs("Logs")
logging.basicConfig(filename=f"Logs/cronjob_{date.today().strftime('%Y-%m-%d')}.log", filemode='a', level=logging.INFO, force=True)

def with_sentry():
    try:
        sentry_logging = LoggingIntegration(
            level=logging.INFO,
            event_level=logging.ERROR
        )
        sentry_sdk.init(
            dsn=config['raven']['glamtoolsetl']['DSN'],
            integrations=[sentry_logging]
        )
        logging.info(' %s External error reporting ENABLED', datetime.now())
    except KeyError:
        logging.info(' %s External error reporting DISABLED', datetime.now())
