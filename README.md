# Face ROI Detection System

Real-time face detection with rectangular red bounding-box overlay with frontend made with reactjs and PostgreSQL storage and Docker 

**Zero OpenCV. Uses MediaPipe + Pillow.**

---

## Architecture

```
Browser (React)
   │
   ├── WebSocket → /stream          (sends raw JPEG frames)
   │                ↓
   │           FastAPI Backend
   │           ├── MediaPipe face detection
   │           ├── Pillow bounding box draw
   │           ├── FrameBuffer (in-memory)
   │           └── PostgreSQL (ROI metadata)
   │
   ├── GET /video-feed  ← MJPEG stream (processed frames)
   └── GET /roi-data    ← JSON history from DB
```

---

## Project Structure

```
/vidFeedDetection
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py            # SQLAlchemy async ORM + ROIRecord model
│   │   └── schemas.py             # Pydantic response schemas
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── stream.py              # WS /stream endpoint
│   │   ├── video_feed.py          # GET /video-feed MJPEG
│   │   └── roi.py                 # GET /roi-data
│   ├── services/
│   │   ├── __init__.py
│   │   ├── face_detection.py      # MediaPipe + Pillow pipeline
│   │   ├── frame_buffer.py        # Async shared frame buffer
│   │   └── roi_service.py         # DB read/write helpers
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── index.js
│       ├── index.css              # Global styles + CSS variables
│       ├── App.js                 # Root component
│       ├── App.css
│       ├── hooks/
│       │   ├── useWebcamStream.js # Webcam + WebSocket hook
│       │   └── useROIData.js      # DB polling hook
│       └── components/
│           ├── VideoPanel.js      # Dual video display + canvas overlay
│           ├── VideoPanel.module.css
│           ├── ROIPanel.js        # Live stats + detection history
│           ├── ROIPanel.module.css
│           ├── Controls.js        # Start/stop + status LEDs
│           └── Controls.module.css
├── db/
│   └── init.sql                   # PostgreSQL schema
├── docker-compose.yml
└── README.md
```

---

## Prerequisites

- Docker ≥ 24 and Docker Compose v2
- A webcam (required for video input)
- Chrome or Firefox (for `getUserMedia` API)

---

## Quick Start (Docker — Recommended)

```bash
# 1. Clone / enter the project
cd VidFeedDetection

# 2. Build and start all services
docker compose up --build

# 3. Open the frontend
open http://localhost:3000

# 4. Click "INITIALIZE STREAM" and allow camera access
```

Services:
| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000        |
| Backend   | http://localhost:8000        |
| API docs  | http://localhost:8000/docs   |
| DB        | localhost:5432               |

---

## API Endpoints

### 1. `WS /stream` — Video Input
Accepts binary JPEG frames or base64-encoded JPEG strings.

**Response (JSON per frame):**
```json
{
  "type": "roi",
  "frame_id": "uuid-...",
  "detected": true,
  "x": 145.2,
  "y": 80.0,
  "width": 210.5,
  "height": 230.1,
  "confidence": 0.9876,
  "timestamp": "2024-01-01T12:00:00.123456"
}
```

### 2. `GET /video-feed` — Video Output
Returns `multipart/x-mixed-replace; boundary=frame` MJPEG stream.
Use directly as `<img src="http://localhost:8000/video-feed">`.

### 3. `GET /roi-data` — ROI History
```
GET /roi-data?limit=100&offset=0
```
```json
{
  "total": 1234,
  "records": [
    {
      "id": 1,
      "frame_id": "uuid-...",
      "timestamp": "2024-01-01T12:00:00",
      "x": 145.2, "y": 80.0,
      "width": 210.5, "height": 230.1,
      "confidence": 0.9876
    }
  ]
}
```

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set DB URL (use your local Postgres)
export DATABASE_URL="postgresql+asyncpg://roi_user:roi_pass@localhost:5432/face_roi_db"

# Run
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Point to local backend
REACT_APP_API_URL=http://localhost:8000 \
REACT_APP_WS_URL=ws://localhost:8000/stream \
npm start
```

### PostgreSQL (local)

```bash
psql -U postgres -c "CREATE USER roi_user WITH PASSWORD 'roi_pass';"
psql -U postgres -c "CREATE DATABASE face_roi_db OWNER roi_user;"
psql -U roi_user -d face_roi_db -f db/init.sql
```

---

## Configuration

| Variable              | Default                                          | Description              |
|-----------------------|--------------------------------------------------|--------------------------|
| `DATABASE_URL`        | `postgresql+asyncpg://roi_user:roi_pass@...`     | Async PostgreSQL URL     |
| `REACT_APP_API_URL`   | `http://localhost:8000`                          | Backend HTTP base URL    |
| `REACT_APP_WS_URL`    | `ws://localhost:8000/stream`                     | WebSocket URL            |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Camera not starting | Allow camera permission in browser; check HTTPS requirement |
| WebSocket "connection failed" | Ensure backend is running on port 8000 |
| MJPEG feed blank | Start the WebSocket stream first (feeds the buffer) |
| MediaPipe install slow | Normal — it's a large wheel; first `docker build` takes ~5 min |
| `asyncpg` error | Ensure `DATABASE_URL` uses `postgresql+asyncpg://` (not `psycopg2`) |
