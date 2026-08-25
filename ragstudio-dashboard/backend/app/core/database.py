"""
Database setup with Postgres (asyncpg) and SQLite (aiosqlite) fallback.
"""
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.core.config import settings

class Base(DeclarativeBase):
    pass

# Determine driver: if URL starts with postgresql -> asyncpg, else aiosqlite
DATABASE_URL = settings.DATABASE_URL

# For SQLite, allow check_same_thread false via connect_args handled by aiosqlite
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs = {"connect_args": {"check_same_thread": False}}

# Create engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Create all tables. Import models to ensure they are registered."""
    # Import models to register with Base
    import app.models.db  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def close_db():
    await engine.dispose()

async def db_health() -> dict:
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL[:30]}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
