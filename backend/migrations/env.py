import logging
from logging.config import fileConfig
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from flask import current_app

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')


def get_engine():
    try:
        # this works with Flask-SQLAlchemy<3 and Alchemical
        return current_app.extensions['migrate'].db.get_engine()
    except (TypeError, AttributeError):
        # this works with Flask-SQLAlchemy>=3
        return current_app.extensions['migrate'].db.engine


def get_engine_url():
    try:
        return get_engine().url.render_as_string(hide_password=False).replace(
            '%', '%%')
    except AttributeError:
        return str(get_engine().url).replace('%', '%%')


def get_database_url():
    """Get database URL from environment or Flask app context"""
    # First try to get from environment variable
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        return db_url
    
    # If no environment variable, try Flask app context
    try:
        return get_engine_url()
    except (RuntimeError, AttributeError):
        # Fallback to default if neither is available
        logger.warning("No database URL found in environment or Flask context. Using default.")
        return "postgresql://jacquelinewallace:1719Zadie@localhost:5432/weather_journey_db"


# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

# Set the database URL
config.set_main_option('sqlalchemy.url', get_database_url())

# Try to get target_db from Flask app context, fallback to None if not available
try:
    target_db = current_app.extensions['migrate'].db
except (RuntimeError, AttributeError):
    target_db = None
    logger.warning("Flask app context not available. Some features may be limited.")

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_metadata():
    if target_db is None:
        # If no target_db available, we need to import models directly
        try:
            from app.models import User, Location, WeatherRecord
            from app import db
            return db.metadata
        except ImportError:
            logger.error("Could not import models. Please ensure the app is properly configured.")
            return None
    
    if hasattr(target_db, 'metadatas'):
        return target_db.metadatas[None]
    return target_db.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    metadata = get_metadata()
    
    if metadata is None:
        logger.error("Could not get metadata. Aborting migration.")
        return
    
    context.configure(
        url=url, target_metadata=metadata, literal_binds=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    # this callback is used to prevent an auto-migration from being generated
    # when there are no changes to the schema
    # reference: http://alembic.zzzcomputing.com/en/latest/cookbooks.html
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, 'autogenerate', False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info('No changes in schema detected.')

    metadata = get_metadata()
    if metadata is None:
        logger.error("Could not get metadata. Aborting migration.")
        return

    try:
        conf_args = current_app.extensions['migrate'].configure_args
        if conf_args.get("process_revision_directives") is None:
            conf_args["process_revision_directives"] = process_revision_directives
    except (RuntimeError, AttributeError):
        # If Flask app context is not available, use empty conf_args
        conf_args = {}
        conf_args["process_revision_directives"] = process_revision_directives

    try:
        connectable = get_engine()
    except (RuntimeError, AttributeError):
        # If we can't get the engine from Flask context, create one from URL
        from sqlalchemy import create_engine
        url = config.get_main_option("sqlalchemy.url")
        connectable = create_engine(url)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=metadata,
            **conf_args
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
