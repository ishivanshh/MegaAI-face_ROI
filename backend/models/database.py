"""
Database configuration and ORM models using async SQLAlchemy.
"""

import os
from datetime import datetime

from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# Read DB URL from environment variable (set in docker-compose)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://roi_user:roi_pass@localhost:5432/face_roi_db",
)


class Base(DeclarativeBase):
    pass


class ROIRecord(Base):
    """
    Stores per-frame face detection ROI metadata.
    Each row = one processed video frame.
    """
    __tablename__ = "roi_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    frame_id = Column(String(64), nullable=False, index=True)  # UUID per frame
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    x = Column(Float, nullable=False)        # Bounding box left (pixels)
    y = Column(Float, nullable=False)        # Bounding box top (pixels)
    width = Column(Float, nullable=False)    # Bounding box width (pixels)
    height = Column(Float, nullable=False)   # Bounding box height (pixels)
    confidence = Column(Float, nullable=True)  # Detection confidence score


# Async engine — uses asyncpg driver
engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # Set True for SQL debug logging
    pool_pre_ping=True,  # Reconnect on stale connections
    pool_size=5,
    max_overflow=10,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency that yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
