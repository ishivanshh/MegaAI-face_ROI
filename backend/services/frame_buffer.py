"""
In-memory frame buffer shared between the WebSocket ingest path
and the MJPEG /video-feed output path.

Uses asyncio primitives to avoid blocking the event loop.
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger("face_roi.frame_buffer")


class FrameBuffer:
    """
    Single-slot frame buffer.

    The WebSocket handler writes the latest processed JPEG bytes here.
    The MJPEG endpoint reads from here to serve a continuous stream.
    An asyncio.Event signals waiting readers that a new frame is ready.
    """

    def __init__(self):
        self._frame: Optional[bytes] = None
        self._event = asyncio.Event()
        self._lock = asyncio.Lock()

    async def put(self, frame: bytes) -> None:
        """Write a new frame and wake up all waiting readers."""
        async with self._lock:
            self._frame = frame
        self._event.set()
        self._event.clear()

    async def get(self, timeout: float = 5.0) -> Optional[bytes]:
        """
        Wait for a new frame (up to `timeout` seconds).

        Returns:
            JPEG bytes, or None on timeout.
        """
        try:
            await asyncio.wait_for(self._event.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            return None
        return self._frame

    @property
    def latest(self) -> Optional[bytes]:
        """Non-blocking access to the most recent frame."""
        return self._frame


# Module-level singleton
_buffer: Optional[FrameBuffer] = None


def get_frame_buffer() -> FrameBuffer:
    """Return (or create) the shared FrameBuffer singleton."""
    global _buffer
    if _buffer is None:
        _buffer = FrameBuffer()
    return _buffer
