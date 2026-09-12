import logging
import functools
import sqlite3


def initialize_logging():
    log_file = "app_log.log"
    logging.basicConfig(
        format='%(asctime)s - %(levelname)s - %(name)s: %(message)s',
        filename=log_file,
        filemode='a', # a = append
    level=logging.DEBUG)

logger = logging.getLogger(__name__)


def error_handling(func):
    @functools.wraps(func) # preserves original function metadata
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except sqlite3.Error as e:
            logger.exception(f"Database error occured in {func.__name__}: {e}")
            raise
        except Exception as e:
            logger.exception(f"Error occured in {func.__name__}: {e}")
            raise
    return wrapper
