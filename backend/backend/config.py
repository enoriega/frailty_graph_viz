""" Backend config schema. Doesn't include ASGI's settings """

from pydantic import BaseSettings

class Settings(BaseSettings):
    graph_file: str
    impact_factors: str
    records_db: str
    es_index: str

    class Config:
        env_file = ".env"

