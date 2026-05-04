"""
Miscellaneous utility functions.
"""

import base64
import io
from typing import Optional
from PIL import Image


def pil_to_base64(image: Image.Image, fmt: str = "JPEG", quality: int = 80) -> str:
    """Convert a Pillow Image to a base64-encoded data URL string."""
    buf = io.BytesIO()
    image.save(buf, format=fmt, quality=quality)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/jpeg" if fmt.upper() == "JPEG" else f"image/{fmt.lower()}"
    return f"data:{mime};base64,{encoded}"


def clamp(value: float, lo: float, hi: float) -> float:
    """Clamp a value within [lo, hi]."""
    return max(lo, min(hi, value))
