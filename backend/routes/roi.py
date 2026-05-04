"""
GET /roi-data — returns stored ROI records from PostgreSQL.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import ROIListResponse, ROISchema
from services.roi_service import get_recent_rois

logger = logging.getLogger("face_roi.roi")

router = APIRouter()


@router.get("/roi-data", response_model=ROIListResponse)
async def get_roi_data(
    limit: int = Query(default=100, ge=1, le=1000, description="Max records to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve stored ROI records, most recent first.

    Query params:
      - limit:  Number of records (1–1000, default 100)
      - offset: Pagination offset (default 0)

    Returns JSON:
    ```json
    {
      "total": 245,
      "records": [
        {
          "id": 1,
          "frame_id": "uuid-...",
          "timestamp": "2024-01-01T12:00:00",
          "x": 120.5,
          "y": 80.0,
          "width": 200.0,
          "height": 220.0,
          "confidence": 0.9876
        },
        ...
      ]
    }
    ```
    """
    total, records = await get_recent_rois(session, limit=limit, offset=offset)
    return ROIListResponse(
        total=total,
        records=[ROISchema.model_validate(r) for r in records],
    )
