"""
Face detection service using MediaPipe Face Detection.
NO OpenCV is used anywhere in this file or project.

Pipeline:
  1. Decode incoming frame (JPEG bytes or base64) → Pillow Image
  2. Run MediaPipe face detection
  3. Extract axis-aligned bounding box (ROI)
  4. Draw bounding box using Pillow ImageDraw
  5. Encode result back to JPEG bytes
"""

import io
import base64
import logging
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import mediapipe as mp

logger = logging.getLogger("face_roi.detector")


@dataclass
class FaceROI:
    """
    Axis-aligned bounding box around a detected face.
    All coordinates are in pixel space.
    """
    x: float          # Left edge
    y: float          # Top edge
    width: float      # Box width
    height: float     # Box height
    confidence: float # Detection score [0, 1]


class FaceDetectionService:
    """
    Singleton-style service that wraps MediaPipe Face Detection.
    Reuses the same detector across frames to avoid re-initialization cost.
    """

    # Box styling constants
    BOX_COLOR = (0, 255, 127)      # Neon green
    BOX_WIDTH = 3
    LABEL_COLOR = (0, 255, 127)
    BG_COLOR = (0, 0, 0, 160)      # Semi-transparent black for label bg

    def __init__(self, min_detection_confidence: float = 0.5):
        """
        Initialize MediaPipe Face Detection.

        Args:
            min_detection_confidence: Minimum score to accept a detection.
        """
        self.min_confidence = min_detection_confidence
        # model_selection: 0 = short-range (≤2m), 1 = full-range
        self._mp_face_detection = mp.solutions.face_detection
        self._detector = self._mp_face_detection.FaceDetection(
            model_selection=1,
            min_detection_confidence=min_detection_confidence,
        )
        logger.info(
            "MediaPipe FaceDetection initialized "
            f"(confidence={min_detection_confidence})"
        )

    def decode_frame(self, data: bytes) -> Optional[Image.Image]:
        """
        Decode raw JPEG bytes or base64-encoded frame into a Pillow Image.

        Returns:
            RGB Pillow Image, or None on failure.
        """
        try:
            # Try raw JPEG bytes first
            return Image.open(io.BytesIO(data)).convert("RGB")
        except Exception:
            pass

        try:
            # Try base64 decoding (browser canvas toDataURL strips prefix)
            if isinstance(data, str):
                raw = data
            else:
                raw = data.decode("utf-8", errors="ignore")

            # Strip optional data-url prefix
            if "," in raw:
                raw = raw.split(",", 1)[1]

            decoded = base64.b64decode(raw)
            return Image.open(io.BytesIO(decoded)).convert("RGB")
        except Exception as e:
            logger.warning(f"Frame decode failed: {e}")
            return None

    def detect(self, image: Image.Image) -> Optional[FaceROI]:
        """
        Run face detection on a Pillow Image.

        Args:
            image: RGB Pillow Image.

        Returns:
            FaceROI if a face is found, else None.
        """
        width, height = image.size
        # Convert to NumPy array (H×W×3 uint8) — MediaPipe expects RGB NumPy
        frame_np = np.array(image, dtype=np.uint8)

        results = self._detector.process(frame_np)

        if not results.detections:
            return None

        # Take only the first detection (one face assumption)
        detection = results.detections[0]
        score = detection.score[0] if detection.score else 0.0

        # MediaPipe returns relative bounding box [0, 1]
        bbox = detection.location_data.relative_bounding_box
        x = max(0.0, bbox.xmin) * width
        y = max(0.0, bbox.ymin) * height
        w = min(bbox.width, 1.0 - bbox.xmin) * width
        h = min(bbox.height, 1.0 - bbox.ymin) * height

        return FaceROI(x=x, y=y, width=w, height=h, confidence=score)

    def draw_roi(self, image: Image.Image, roi: FaceROI) -> Image.Image:
        """
        Draw bounding box and label on the image using Pillow ImageDraw.
        No OpenCV involved.

        Args:
            image: Original RGB Pillow Image.
            roi:   Detected face bounding box.

        Returns:
            Annotated Pillow Image (RGB).
        """
        # Work on a copy so original is untouched
        annotated = image.copy()
        draw = ImageDraw.Draw(annotated, "RGBA")

        x1, y1 = int(roi.x), int(roi.y)
        x2, y2 = int(roi.x + roi.width), int(roi.y + roi.height)

        # Draw main bounding box rectangle
        draw.rectangle(
            [x1, y1, x2, y2],
            outline=self.BOX_COLOR,
            width=self.BOX_WIDTH,
        )

        # Draw corner accent marks for a HUD-style look
        corner_len = min(20, int(roi.width * 0.15))
        cw = self.BOX_WIDTH + 1
        corners = [
            # Top-left
            [(x1, y1 + corner_len), (x1, y1), (x1 + corner_len, y1)],
            # Top-right
            [(x2 - corner_len, y1), (x2, y1), (x2, y1 + corner_len)],
            # Bottom-left
            [(x1, y2 - corner_len), (x1, y2), (x1 + corner_len, y2)],
            # Bottom-right
            [(x2 - corner_len, y2), (x2, y2), (x2, y2 - corner_len)],
        ]
        for pts in corners:
            draw.line(pts, fill=(255, 255, 255), width=cw)

        # Draw confidence label
        label = f"FACE  {roi.confidence:.0%}"
        font_size = max(12, int(roi.width * 0.08))
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", font_size)
        except (IOError, OSError):
            font = ImageFont.load_default()

        # Label background
        text_bbox = draw.textbbox((x1, y1 - font_size - 6), label, font=font)
        draw.rectangle(
            [text_bbox[0] - 4, text_bbox[1] - 2, text_bbox[2] + 4, text_bbox[3] + 2],
            fill=self.BG_COLOR,
        )
        draw.text((x1, y1 - font_size - 6), label, fill=self.LABEL_COLOR, font=font)

        return annotated.convert("RGB")

    def encode_frame(self, image: Image.Image, quality: int = 80) -> bytes:
        """
        Encode a Pillow Image to JPEG bytes.

        Args:
            image:   RGB Pillow Image.
            quality: JPEG quality (0-95).

        Returns:
            JPEG-encoded bytes.
        """
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=quality, optimize=True)
        return buf.getvalue()

    def process_frame(
        self, raw_data: bytes
    ) -> Tuple[bytes, Optional[FaceROI]]:
        """
        Full pipeline: decode → detect → draw → encode.

        Args:
            raw_data: Raw frame bytes (JPEG or base64).

        Returns:
            (processed_jpeg_bytes, roi_or_none)
        """
        image = self.decode_frame(raw_data)
        if image is None:
            logger.warning("Could not decode frame, returning empty bytes.")
            return b"", None

        roi = self.detect(image)

        if roi:
            annotated = self.draw_roi(image, roi)
        else:
            # No face found — return frame unmodified
            annotated = image

        encoded = self.encode_frame(annotated)
        return encoded, roi

    def close(self):
        """Release MediaPipe resources."""
        self._detector.close()
        logger.info("FaceDetectionService closed.")


# Module-level singleton — shared across all WebSocket connections
_detector_instance: Optional[FaceDetectionService] = None


def get_detector() -> FaceDetectionService:
    """Return the shared detector singleton, creating it on first call."""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = FaceDetectionService()
    return _detector_instance
