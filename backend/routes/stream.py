"""
WebSocket /stream endpoint.

Accepts video frames from the browser (binary JPEG or base64 string),
runs the face detection pipeline, writes the processed frame to the
shared FrameBuffer, and persists ROI metadata to PostgreSQL.
"""

import uuid
import logging
import asyncio
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from services.face_detection import get_detector
from services.frame_buffer import get_frame_buffer
from services.roi_service import save_roi

logger = logging.getLogger("face_roi.stream")

router = APIRouter()


@router.websocket("/stream")
async def stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for receiving video frames.

    Message formats accepted:
      - Binary: raw JPEG bytes
      - Text:   base64-encoded JPEG (with or without data:image/... prefix)

    For each frame:
      1. Decode the frame using FaceDetectionService
      2. Run face detection (MediaPipe)
      3. Draw bounding box (Pillow)
      4. Write processed frame to FrameBuffer
      5. Persist ROI to PostgreSQL
      6. Send ROI JSON back to the client via the same WebSocket
    """
    await websocket.accept()
    client = websocket.client
    logger.info(f"Client connected: {client}")

    detector = get_detector()
    frame_buffer = get_frame_buffer()

    # Open a dedicated DB session per connection
    async with _session_context() as session:
        try:
            while True:
                try:
                    # Receive frame — binary or text
                    message = await asyncio.wait_for(
                        websocket.receive(), timeout=30.0
                    )
                except asyncio.TimeoutError:
                    # Send a ping-style keepalive
                    await websocket.send_json({"type": "keepalive"})
                    continue

                # Extract raw bytes
                if "bytes" in message and message["bytes"]:
                    raw = message["bytes"]
                elif "text" in message and message["text"]:
                    raw = message["text"].encode("utf-8")
                else:
                    continue

                frame_id = str(uuid.uuid4())
                timestamp = datetime.utcnow()

                # Run full detection pipeline in a thread pool to avoid
                # blocking the asyncio event loop (MediaPipe is CPU-bound)
                loop = asyncio.get_event_loop()
                processed_bytes, roi = await loop.run_in_executor(
                    None, detector.process_frame, raw
                )

                if not processed_bytes:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Frame decode failed",
                    })
                    continue

                # Push processed frame to buffer (feeds /video-feed)
                await frame_buffer.put(processed_bytes)

                # Build ROI payload
                roi_payload: dict = {"type": "roi", "frame_id": frame_id}

                if roi:
                    roi_payload.update({
                        "detected": True,
                        "x": round(roi.x, 2),
                        "y": round(roi.y, 2),
                        "width": round(roi.width, 2),
                        "height": round(roi.height, 2),
                        "confidence": round(roi.confidence, 4),
                        "timestamp": timestamp.isoformat(),
                    })

                    # Persist to DB asynchronously
                    try:
                        await save_roi(session, frame_id, roi, timestamp)
                        await session.commit()
                    except Exception as db_err:
                        logger.error(f"DB write error: {db_err}")
                        await session.rollback()
                else:
                    roi_payload["detected"] = False

                # Return ROI metadata to client
                await websocket.send_json(roi_payload)

        except WebSocketDisconnect:
            logger.info(f"Client disconnected: {client}")
        except Exception as e:
            logger.exception(f"Unexpected error on stream: {e}")
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
                await websocket.close()
            except Exception:
                pass


from contextlib import asynccontextmanager
from models.database import AsyncSessionLocal


@asynccontextmanager
async def _session_context():
    """Yields an async DB session, handling commit/rollback."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
