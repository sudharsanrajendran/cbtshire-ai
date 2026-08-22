from collections.abc import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from .config import get_settings

settings = get_settings()
connect_args = {'check_same_thread': False} if settings.database_url.startswith('sqlite') else {}
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def ensure_sqlite_schema() -> None:
    if not settings.database_url.startswith('sqlite'):
        return
    additions = {
        'jobs': {'employment_type': "VARCHAR(40) DEFAULT 'Full-time'", 'experience_level': "VARCHAR(60) DEFAULT 'Mid-level'", 'skills': "TEXT DEFAULT ''"},
        'candidates': {'role': "VARCHAR(160) DEFAULT ''", 'experience_level': "VARCHAR(60) DEFAULT 'Mid-level'", 'skills': "TEXT DEFAULT ''", 'match_score': "INTEGER DEFAULT 0"},
        'resumes': {'storage_key': "VARCHAR(500) DEFAULT ''", 'storage_url': "VARCHAR(1000) DEFAULT ''"},
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table, columns in additions.items():
            if not inspector.has_table(table):
                continue
            existing = {column['name'] for column in inspector.get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {definition}'))

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
