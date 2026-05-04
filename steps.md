# Face ROI Detection Project Flow

This document explains how the project works from the first user action to the final API/database result.

## 1. Start The Project

From the project root:

```bash
docker compose up -d
```

This starts three services:

| Service | Purpose | URL / Port |
|---|---|---|
| Frontend | React UI for webcam and live result display | http://localhost:3000 |
| Backend | FastAPI API, WebSocket, face detection pipeline | http://localhost:8000 |
| PostgreSQL | Stores detected face ROI records | localhost:5433 |

Check containers:

```bash
docker compose ps
```

## 2. Open The Frontend

Open:

```text
http://localhost:3000
```

Click:

```text
INITIALIZE STREAM
```

Then allow camera permission in the browser.

## 3. Browser Captures Webcam Frames

The React hook:

```text
frontend/src/hooks/useWebcamStream.js
```

does this:

1. Opens your webcam using `navigator.mediaDevices.getUserMedia`.
2. Shows your raw camera preview in the browser.
3. Draws each video frame onto a hidden canvas.
4. Converts that canvas frame into JPEG bytes.
5. Sends JPEG frames to the backend using WebSocket.

WebSocket endpoint:

```text
ws://localhost:8000/stream
```

## 4. Backend Receives Frames

The backend route:

```text
backend/routes/stream.py
```

receives each frame from the browser.

For each frame, it:

1. Receives JPEG bytes from WebSocket.
2. Sends the frame to the face detection service.
3. Gets back processed image bytes and ROI data.
4. Stores the latest processed image in memory.
5. Saves face ROI data into PostgreSQL if a face is detected.
6. Sends live ROI JSON back to the frontend over WebSocket.

## 5. Face Detection Happens

The detection code is here:

```text
backend/services/face_detection.py
```

It uses:

```text
MediaPipe + Pillow
```

Process:

1. Decode JPEG bytes into an image.
2. Run MediaPipe face detection.
3. If a face is found, calculate a bounding box:
   - `x`
   - `y`
   - `width`
   - `height`
   - `confidence`
4. Draw a box on the image.
5. Encode the processed image back into JPEG.

## 6. Processed Video Is Displayed

The processed output is served by:

```text
GET http://localhost:8000/video-feed
```

The frontend uses it inside:

```text
frontend/src/components/VideoPanel.js
```

This shows the processed MJPEG stream with the face box drawn by the backend.

## 7. ROI Data Is Saved In PostgreSQL

When the backend detects a face, it saves a row in the `roi_records` table.

The save logic is here:

```text
backend/services/roi_service.py
```

Database model is here:

```text
backend/models/database.py
```

Table name:

```text
roi_records
```

Each saved record contains:

| Column | Meaning |
|---|---|
| `id` | Auto-increment database ID |
| `frame_id` | Unique ID for the processed frame |
| `timestamp` | Time when detection happened |
| `x` | Left position of face box |
| `y` | Top position of face box |
| `width` | Face box width |
| `height` | Face box height |
| `confidence` | Detection confidence from 0 to 1 |

## 8. API Returns Stored ROI Data

Use this API in Postman:

```http
GET http://localhost:8000/roi-data
```

Or:

```http
GET http://localhost:8000/roi-data?limit=20
```

Example response:

```json
{
  "total": 2,
  "records": [
    {
      "id": 1,
      "frame_id": "uuid-value",
      "timestamp": "2026-05-04T09:20:00",
      "x": 121.5,
      "y": 80.0,
      "width": 210.4,
      "height": 230.2,
      "confidence": 0.92
    }
  ]
}
```

## Full Project Design

```text
User opens browser
       |
       v
React frontend at http://localhost:3000
       |
       v
User clicks INITIALIZE STREAM
       |
       v
Browser asks for camera permission
       |
       v
Frontend captures webcam frames
       |
       v
Frames are sent as JPEG bytes
       |
       v
WebSocket: ws://localhost:8000/stream
       |
       v
FastAPI backend receives frame
       |
       v
MediaPipe detects face
       |
       v
Pillow draws bounding box
       |
       +----------------------------+
       |                            |
       v                            v
Save ROI data in PostgreSQL     Store processed frame in memory
       |                            |
       v                            v
GET /roi-data returns JSON       GET /video-feed returns MJPEG
       |                            |
       v                            v
Postman can test API             Frontend shows processed video
```

## How To Check The Database

### Option 1: Check From Docker Container

Run:

```bash
docker exec -it face_roi_postgres psql -U roi_user -d face_roi_db
```

Inside `psql`, run:

```sql
\dt
```

Show all records:

```sql
SELECT * FROM roi_records ORDER BY timestamp DESC LIMIT 20;
```

Count records:

```sql
SELECT COUNT(*) FROM roi_records;
```

Show only important columns:

```sql
SELECT id, timestamp, x, y, width, height, confidence
FROM roi_records
ORDER BY timestamp DESC
LIMIT 10;
```

Exit database shell:

```sql
\q
```

### Option 2: One-Line Database Check

Run this from the project root:

```bash
docker exec face_roi_postgres psql -U roi_user -d face_roi_db -c "SELECT id, timestamp, x, y, width, height, confidence FROM roi_records ORDER BY timestamp DESC LIMIT 10;"
```

### Option 3: Connect With A Database GUI

Use TablePlus, DBeaver, pgAdmin, or DataGrip.

Connection details:

```text
Host: localhost
Port: 5433
Database: face_roi_db
User: roi_user
Password: roi_pass
```

Then open table:

```text
roi_records
```

## How To Test With Postman

### Health Check

```http
GET http://localhost:8000/health
```

Expected:

```json
{
  "status": "ok",
  "service": "face-roi-backend"
}
```

### ROI Records

First show your face in frontend for a few seconds.

Then call:

```http
GET http://localhost:8000/roi-data?limit=20
```

If records are empty:

1. Make sure frontend is open.
2. Click `INITIALIZE STREAM`.
3. Allow camera access.
4. Make sure WebSocket status is online.
5. Keep your face visible for 5-10 seconds.
6. Call `/roi-data` again in Postman.

## Useful Commands

Start project:

```bash
docker compose up -d
```

Stop project:

```bash
docker compose down
```

Check running containers:

```bash
docker compose ps
```

Check backend logs:

```bash
docker compose logs -f backend
```

Check frontend logs:

```bash
docker compose logs -f frontend
```

Check database logs:

```bash
docker compose logs -f postgres
```
