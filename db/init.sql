-- ──────────────────────────────────────────────────────────
-- Face ROI Detection System — PostgreSQL Init Script
-- Run automatically by Docker on first container start.
-- SQLAlchemy also creates tables via init_db() on startup,
-- so this file is a safety net / seed for local dev.
-- ──────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ROI records table (mirrors SQLAlchemy model)
CREATE TABLE IF NOT EXISTS roi_records (
    id          SERIAL PRIMARY KEY,
    frame_id    VARCHAR(64)       NOT NULL,
    timestamp   TIMESTAMP         NOT NULL DEFAULT now(),
    x           DOUBLE PRECISION  NOT NULL,
    y           DOUBLE PRECISION  NOT NULL,
    width       DOUBLE PRECISION  NOT NULL,
    height      DOUBLE PRECISION  NOT NULL,
    confidence  DOUBLE PRECISION
);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_roi_timestamp ON roi_records (timestamp DESC);
-- Index for frame lookups
CREATE INDEX IF NOT EXISTS idx_roi_frame_id  ON roi_records (frame_id);

-- Optional: keep only the last 100,000 rows to manage disk usage
-- (Enable via a cron job or pg_cron extension in production)
-- DELETE FROM roi_records WHERE id NOT IN (
--     SELECT id FROM roi_records ORDER BY timestamp DESC LIMIT 100000
-- );
