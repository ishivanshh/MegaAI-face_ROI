"""
GET /video-feed — MJPEG streaming endpoint.

Reads processed frames from FrameBuffer and streams them as
multipart/x-mixed-replace (MJPEG), which browsers can display
natively in an <img> tag or consume via fetch ReadableStream.
"""

import logging
import asyncio

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from services.frame_buffer import get_frame_buffer

logger = logging.getLogger("face_roi.video_feed")

router = APIRouter()

# MJPEG boundary string
BOUNDARY = b"--frame"


async def _mjpeg_generator():
    """
    Async generator that yields MJPEG frames.

    Each frame is wrapped in the multipart MIME boundary format:
        --frame\r\n
        Content-Type: image/jpeg\r\n
        \r\n
        <JPEG bytes>
        \r\n
    """
    frame_buffer = get_frame_buffer()
    logger.info("MJPEG stream started.")

    while True:
        frame = await frame_buffer.get(timeout=5.0)

        if frame is None:
            # Timeout — yield an empty chunk to keep the connection alive
            await asyncio.sleep(0.05)
            continue

        yield (
            BOUNDARY + b"\r\n"
            + b"Content-Type: image/jpeg\r\n"
            + b"Content-Length: " + str(len(frame)).encode() + b"\r\n"
            + b"\r\n"
            + frame
            + b"\r\n"
        )


@router.get("/video-feed")
async def video_feed():
    """
    MJPEG video feed endpoint.

    Returns a multipart/x-mixed-replace stream of processed JPEG frames.
    Consumers:
      - <img src="/video-feed"> in the browser
      - React component using fetch + ReadableStream
    """
    return StreamingResponse(
        _mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Accel-Buffering": "no",  # Disable nginx buffering if behind proxy
        },
    )
