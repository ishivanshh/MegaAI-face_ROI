"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ROISchema(BaseModel):
    """Schema for returning ROI data via API."""
    id: int
    frame_id: str
    timestamp: datetime
    x: float
    y: float
    width: float
    height: float
    confidence: Optional[float] = None

    model_config = {"from_attributes": True}


class ROIListResponse(BaseModel):
    """Paginated list of ROI records."""
    total: int
    records: list[ROISchema]
