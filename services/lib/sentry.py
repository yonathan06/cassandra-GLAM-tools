import logging

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from config import config


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
        logging.info('External error reporting ENABLED')
    except KeyError:
        logging.info('External error reporting DISABLED')
