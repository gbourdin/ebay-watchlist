import os

from dotenv import load_dotenv
from playhouse.sqlite_ext import SqliteExtDatabase

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", ":memory:")

database = SqliteExtDatabase(DATABASE_URL)
