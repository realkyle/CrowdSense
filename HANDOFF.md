# CrowdSense — Agent Handoff Document
> Load this file and nothing else. Everything you need to continue this project is here.

---

## What Is CrowdSense?
CrowdSense is a personal web application that detects and estimates crowd density from images, video files, or a live camera feed. It displays results on a real-time dashboard showing annotated video/images, a density classification label, a heatmap overlay, and a crowd count graph over time.

This is a personal project — not a school assignment. No restrictions on language or framework.

---

## Hardware (Development Machine)
- **OS:** Windows 10
- **GPU:** NVIDIA RTX 3060 (12GB VRAM) — CUDA 13.3 driver
- **CPU:** Intel i7-11700KF
- **RAM:** 32GB DDR4
- **Python:** 3.11.1
- **Node:** 24.16.0

**Always use CUDA for inference.** Do not develop on a Mac M1 — CUDA is not supported there.

---

## Tech Stack (all installed and working)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Tailwind CSS (Vite) | Port 3000 |
| Backend | Python + FastAPI + uvicorn | Port 8000 |
| Detection | YOLOv8s (Ultralytics) | `yolov8s.pt` — auto-downloads |
| Heatmap | OpenCV + NumPy | Gaussian blobs + COLORMAP_JET |
| Charts | Recharts | Line chart for video timeline |
| Live camera | WebSockets (Phase 3 — not built yet) | |

---

## Running the Project

```bash
# Backend (from backend/)
python -m uvicorn main:app --reload --port 8000

# Frontend (from frontend/)
npm run dev
```

PyTorch + CUDA was installed separately (required before requirements.txt):
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r backend/requirements.txt
```

---

## Current Status

### Phase 1 — Static Image Upload ✅ COMPLETE
- Upload JPEG/PNG via drag-and-drop
- YOLOv8s detects people (class 0), draws green bounding boxes with confidence scores
- Returns: person count, density label + color badge, annotated image, heatmap overlay
- Frontend: three-way image toggle (Detections / Heatmap / Original)

### Phase 2 — Video File Upload ✅ COMPLETE
- Upload MP4/MOV/AVI/WebM video
- Backend processes in a background job (avoids HTTP timeout on large files)
- Samples 1 frame per second, runs YOLO on each
- Frontend polls `/jobs/{job_id}` every second, shows progress bar
- Results: Recharts line graph (crowd count over time), peak count, avg count, duration
- Accepted formats: MP4, MOV, AVI, WebM

### Phase 3 — Live Camera Feed ❌ NOT BUILT — START HERE
See detailed spec below.

### Phase 4 — Accuracy Improvements (future)
- Switch from YOLOv8 detection to a crowd estimation model (CSRNet, MCNN, etc.)
- Detection-based models inherently undercount heavily occluded crowds (e.g. Shibuya crossing peak = ~30-40 detected vs 100+ actual). This is a fundamental YOLO limitation, not a tuning issue.

---

## Folder Structure (actual, as of now)
```
crowdsense/
├── backend/
│   ├── main.py              # FastAPI app — all routes
│   ├── detector.py          # YOLOv8s inference on images
│   ├── density.py           # Density classification + heatmap generation
│   ├── video_processor.py   # Background video processing + in-memory job store
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Shell with Image/Video tabs
│   │   │   ├── UploadPanel.jsx     # Image drag-and-drop upload
│   │   │   ├── HeatmapView.jsx     # Annotated/Heatmap/Original toggle
│   │   │   ├── VideoUploadPanel.jsx
│   │   │   └── CrowdGraph.jsx      # Recharts line chart
│   │   ├── App.jsx
│   │   ├── index.css          # Tailwind import + dark background
│   │   └── main.jsx
│   ├── vite.config.js         # Tailwind v4 vite plugin, port 3000
│   └── package.json
├── samples/                   # Test images (committed); videos gitignored
├── HANDOFF.md
└── README.md
```

---

## Key Implementation Details

### Detection (backend/detector.py)
- Model: `yolov8s.pt` loaded once at module import (not per-request)
- `conf=0.25` — lower than default to catch small/distant people in wide shots
- `imgsz=1280` — overrides YOLO's default 640px internal resize; critical for small people
- `torch.no_grad()` — prevents VRAM accumulation across requests (without this, inference slows down after several requests)
- `save=False` — prevents Ultralytics writing to a `runs/` directory
- Images wider than 1280px are resized before processing (YOLO resizes internally anyway; this keeps response payload small)

### Density Classification (backend/density.py)
Uses a **hybrid** formula — absolute count OR pixel density, whichever triggers first:
```python
if person_count >= 30 or pixel_density >= 3:    → Packed   (red)
if person_count >= 15 or pixel_density >= 1.5:  → Moderate (orange)
if person_count >= 5  or pixel_density >= 0.5:  → Light    (yellow)
else:                                            → Empty    (green)
```
Pure pixel-density was tried first and broke on wide-angle shots — 80 people spread across a large Shibuya crossing frame would score as "Empty". The hybrid fixes this by also keying on absolute count.

### Video Processing (backend/video_processor.py)
- Jobs stored in a plain dict (`jobs: dict[str, dict]`) — fine for single-user local use
- Samples every `fps * sample_interval` frames (default: 1 frame/sec)
- Updates `jobs[job_id]["progress"]` in-place so the frontend can poll it
- Temp file is written to disk, read by OpenCV, then deleted after processing
- `video_processor.py` loads its own YOLO model instance (separate from `detector.py`) — this is a known duplication, fine for now

### Frontend
- React + Tailwind v4 via `@tailwindcss/vite` plugin (NOT the old PostCSS setup)
- Dark theme: `bg-[#0f1117]`
- Dashboard has Image/Video tabs; switching tabs resets state
- Video mode polls `/jobs/{job_id}` on a 1-second interval via `setInterval` in a `useEffect`; polling stops when status is `done` or `error`
- Density badge colors map: `green → bg-green-500/20`, `yellow → bg-yellow-500/20`, `orange → bg-orange-500/20`, `red → bg-red-500/20`

### CORS
Wide-open `allow_origins=["*"]` in `main.py` — fine for local dev.

---

## What Was Tried / Lessons Learned

| Problem | What Failed | What Worked |
|---|---|---|
| VRAM grows after several images | No fix (default YOLO) | `torch.no_grad()` + `save=False` |
| Slow processing on large images | N/A | Resize to max 1280px before processing |
| Video upload timing out | Synchronous processing in one request | `BackgroundTasks` + job polling |
| Tokyo crowd detected as "Empty" | Pure pixel-density formula | Hybrid absolute-count + pixel-density |
| Low detection count on distant people | `yolov8n` + `conf=0.4` + `imgsz=640` | `yolov8s` + `conf=0.25` + `imgsz=1280` |
| Shibuya crossing still undercounts (~30-40 vs 100+) | Cannot fix with YOLO | Accepted for now; Phase 4 = CSRNet |

---

## Phase 3 Spec — Live Camera Feed (BUILD THIS NEXT)

### What to build
A new **Live** tab in the dashboard that streams a live camera feed, runs YOLO on each frame, and displays:
- Live annotated video (canvas or `<img>` updated with MJPEG frames)
- Real-time crowd count (updating number)
- Real-time density badge
- Live crowd count graph that scrolls as time passes (last N seconds)
- Alert when density exceeds a user-set threshold (e.g. "Alert me at Packed")

### Camera sources (user wants BOTH selectable in UI)
1. **Webcam** — `cv2.VideoCapture(0)` (index 0 = default webcam)
2. **IP camera / RTSP stream** — `cv2.VideoCapture("rtsp://...")` or any URL OpenCV can open

### Recommended approach: WebSocket
- Frontend connects to `ws://localhost:8000/ws/live`
- Backend sends a JSON message per frame:
  ```json
  {
    "frame": "<base64 JPEG>",
    "person_count": 7,
    "density_label": "Light",
    "density_color": "yellow",
    "timestamp": 1.23
  }
  ```
- Frontend decodes base64 and sets it as the `src` of an `<img>` tag
- Resize frames to max 640px wide before sending (bandwidth) — this is different from the 1280 used for accuracy in image/video mode; live feed prioritises latency
- Encode as JPEG at 80% quality before sending
- Run YOLO every frame if GPU keeps up, otherwise every 2nd frame

### New files to create
- `backend/live_feed.py` — WebSocket handler, camera capture loop
- `frontend/src/components/LiveFeed.jsx` — live view with source selector, threshold alert, scrolling graph

### Add to Dashboard.jsx
Add a third tab "Live" alongside "Image" and "Video".

### Things to watch out for
- **Camera already in use:** `cv2.VideoCapture(0)` will fail silently if another app has the camera. Return a clear error to the frontend.
- **Stopping the feed:** The WebSocket disconnect should release the `cv2.VideoCapture` object. Use a `try/finally` block.
- **Only one live session at a time:** Don't start a second capture if one is already running. Track this with a module-level flag in `live_feed.py`.
- **RTSP streams:** Some IP cameras need `cv2.CAP_FFMPEG` backend: `cv2.VideoCapture(url, cv2.CAP_FFMPEG)`. Add this as a fallback.
- **Frame rate:** The 3060 can do 50+ FPS with yolov8s at imgsz=640. For live feed, cap at 15-20 FPS to avoid flooding the WebSocket. Use `asyncio.sleep(1/20)` between frames.
- **Scrolling graph:** Keep a fixed-length deque (e.g. last 60 seconds) in frontend state and append each incoming count.
- **Threshold alert:** A simple check `if density_label === alertThreshold` in the frontend is enough — no backend change needed.

### WebSocket endpoint skeleton
```python
# backend/live_feed.py
from fastapi import WebSocket
import cv2, asyncio, base64, json, torch
from ultralytics import YOLO
from density import classify_density

model = YOLO("yolov8s.pt")
_active = False  # prevent multiple concurrent sessions

async def live_feed_ws(websocket: WebSocket, source: str):
    global _active
    await websocket.accept()
    if _active:
        await websocket.send_json({"error": "A live session is already active."})
        await websocket.close()
        return

    cap_source = 0 if source == "webcam" else source
    cap = cv2.VideoCapture(cap_source)
    _active = True
    try:
        with torch.no_grad():
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                # resize → detect → encode → send
                ...
                await asyncio.sleep(1 / 20)  # ~20 FPS cap
    finally:
        cap.release()
        _active = False
```

Register it in `main.py`:
```python
from live_feed import live_feed_ws

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket, source: str = "webcam"):
    await live_feed_ws(websocket, source)
```

---

## User Preferences
- Prefers clear, well-commented code
- Personal project — no deadlines
- Using VS Code on Windows
- GitHub: https://github.com/realkyle/CrowdSense

---

## Suggested First Message To Next Agent
> "Here is the updated HANDOFF.md for the CrowdSense project. Phase 1 (image upload) and Phase 2 (video processing) are fully built and working. Please read this file and build Phase 3 — the live camera feed. Start with `backend/live_feed.py` and `frontend/src/components/LiveFeed.jsx`, then add a Live tab to `Dashboard.jsx`. The spec and skeleton code are in the Phase 3 section of this file."
