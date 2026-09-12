import logging

def initialize_logging():
    log_file = "app_log.log"
    logging.basicConfig(
        format='%(asctime)s - %(levelname)s - %(name)s: %(message)s', 
        filename=log_file, 
        filemode='a', # a = append
    level=logging.DEBUG)

logger = logging.getLogger(__name__)