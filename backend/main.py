"""
Face ROI Detection System - FastAPI Backend
Entry point for the application.
"""

import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.database import init_db
from routes.stream import router as stream_router
from routes.video_feed import router as video_feed_router
from routes.roi import router as roi_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("face_roi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    logger.info("Starting Face ROI Detection System...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down Face ROI Detection System.")


app = FastAPI(
    title="Face ROI Detection API",
    description="Real-time face detection with ROI extraction and streaming.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow frontend dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(stream_router)
app.include_router(video_feed_router)
app.include_router(roi_router)


@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "service": "face-roi-backend"}
