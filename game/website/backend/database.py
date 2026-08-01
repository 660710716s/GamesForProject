from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# For development, we'll use SQLite so it works immediately without a dedicated MySQL server.
# When ready to deploy (or if you start your MySQL server), simply change SQLALCHEMY_DATABASE_URL to:
# "mysql+pymysql://<user>:<password>@localhost/<db_name>"

SQLALCHEMY_DATABASE_URL = "sqlite:///./puzzle_game.db"

# engine = create_engine(SQLALCHEMY_DATABASE_URL) # For MySQL
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} # Needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
