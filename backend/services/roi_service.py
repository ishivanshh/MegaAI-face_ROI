"""
ROI persistence service — handles DB reads and writes for frame ROI records.
"""

import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import ROIRecord
from models.schemas import ROISchema
from services.face_detection import FaceROI

logger = logging.getLogger("face_roi.roi_service")


async def save_roi(
    session: AsyncSession,
    frame_id: str,
    roi: FaceROI,
    timestamp: Optional[datetime] = None,
) -> ROIRecord:
    """
    Persist a detected ROI to the database.

    Args:
        session:   Async DB session.
        frame_id:  UUID string identifying the frame.
        roi:       Detected face bounding box.
        timestamp: Frame capture time (defaults to utcnow).

    Returns:
        The newly created ROIRecord ORM object.
    """
    record = ROIRecord(
        frame_id=frame_id,
        timestamp=timestamp or datetime.utcnow(),
        x=round(roi.x, 2),
        y=round(roi.y, 2),
        width=round(roi.width, 2),
        height=round(roi.height, 2),
        confidence=round(roi.confidence, 4),
    )
    session.add(record)
    await session.flush()  # Get auto-generated id without committing
    logger.debug(f"Saved ROI for frame {frame_id}: {roi}")
    return record


async def get_recent_rois(
    session: AsyncSession,
    limit: int = 100,
    offset: int = 0,
) -> tuple[int, List[ROIRecord]]:
    """
    Retrieve recent ROI records, most recent first.

    Args:
        session: Async DB session.
        limit:   Max rows to return.
        offset:  Pagination offset.

    Returns:
        (total_count, list_of_records)
    """
    count_stmt = select(func.count()).select_from(ROIRecord)
    total = (await session.execute(count_stmt)).scalar_one()

    stmt = (
        select(ROIRecord)
        .order_by(desc(ROIRecord.timestamp))
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    records = result.scalars().all()

    return total, list(records)
