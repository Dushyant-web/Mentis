import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set in environment variables")

# 🚀 Connection pooling — avoids per-request TCP/TLS handshake to managed Postgres
# and recovers transparently from connections dropped by the server/proxy.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,        # validate a connection before using it (no "stale connection" 500s)
    pool_size=int(os.getenv("DB_POOL_SIZE", 10)),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", 20)),
    pool_recycle=1800,        # recycle connections every 30 min (beats most idle timeouts)
    pool_timeout=30,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()