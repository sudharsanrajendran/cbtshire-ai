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
        'candidates': {'role': "VARCHAR(160) DEFAULT ''", 'experience_level': "VARCHAR(60) DEFAULT 'Mid-level'", 'skills': "TEXT DEFAULT ''", 'match_score': "INTEGER DEFAULT 0", 'source': "VARCHAR(60) DEFAULT 'Careers Portal'"},
        'resumes': {'storage_key': "VARCHAR(500) DEFAULT ''", 'storage_url': "VARCHAR(1000) DEFAULT ''"},
        'users': {
            'linkedin_profile_url': "VARCHAR(255) DEFAULT ''",
            'naukri_recruiter_id': "VARCHAR(255) DEFAULT ''",
            'indeed_employer_id': "VARCHAR(255) DEFAULT ''",
            'careers_page_url': "VARCHAR(255) DEFAULT ''"
        },
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
        try:
            connection.execute(text("UPDATE candidates SET match_score = 85 WHERE match_score IS NULL OR match_score = 0"))
        except Exception:
            pass

def seed_initial_data() -> None:
    from .models import Organization, User, Job
    from .utils.security import hash_password
    with SessionLocal() as db:
        org = db.query(Organization).first()
        if not org:
            org = Organization(name='Cbtshire.ai')
            db.add(org)
            db.commit()
            db.refresh(org)

        if not db.query(User).first():
            db.add(User(
                organization_id=org.id,
                name='Maya Lin',
                email='maya@cbtshire.ai',
                password_hash=hash_password('password123'),
                role='admin'
            ))
            db.add(User(
                organization_id=org.id,
                name='Sudharsan Admin',
                email='sudharsankuttal03@gmail.com',
                password_hash=hash_password('password123'),
                role='admin'
            ))
            db.commit()

        if not db.query(Job).first():
            db.add(Job(
                organization_id=org.id,
                title='Senior Full-Stack Engineer',
                department='Engineering',
                location='Remote / Hybrid',
                employment_type='Full-time',
                experience_level='Senior-level (4-6 yrs)',
                skills='React, TypeScript, Python, FastAPI, PostgreSQL',
                status='published',
                description='We are seeking an experienced Full-Stack Engineer to architect and build scalable AI-driven web applications.',
                openings=2,
                applicants=8
            ))
            db.commit()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
