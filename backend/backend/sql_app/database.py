from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///{}"


# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@postgresserver/db"

def construct_engine(db_path: Path):
    url = SQLALCHEMY_DATABASE_URL.format(db_path.absolute())
    engine = create_engine(
        url, connect_args={"check_same_thread": False}
    )

    return engine


Base = declarative_base()
