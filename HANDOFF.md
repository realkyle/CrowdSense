# CrowdSense — Agent Handoff Document
> Load this file and nothing else. Everything you need to continue this project is here.

---

## What Is CrowdSense?
CrowdSense is a personal web application project that detects and estimates crowd density from images, video files, or a live camera feed. It displays results on a real-time dashboard showing annotated video/images, a density classification label, a heatmap overlay, and a crowd count graph over time.

This is a personal project — not a school assignment. There are no language or framework restrictions. The goal is to build something functional, modern, and impressive.

---

## Current Status
**Nothing has been built yet.** This document captures all planning decisions made so far. The user is about to:
1. Create a GitHub repository
2. Begin development on their Windows desktop machine
3. Start with Phase 1 (static image upload) and work toward live camera feed

---

## Hardware (Development Machine)
- **OS:** Windows
- **GPU:** NVIDIA RTX 3060 — use CUDA for all model inference
- **CPU:** Intel i7-11700KF
- **RAM:** 32GB DDR4
- **Why this matters:** CUDA on the 3060 gives ~100+ FPS with YOLOv8n vs ~15-25 FPS on CPU. Always use GPU. Do not develop on the user's Mac M1 laptop — CUDA is not supported there.

---

## Decided Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Tailwind CSS | Dashboard UI |
| Backend | Python + FastAPI | API + model inference |
| Detection Model | YOLOv8 (Ultralytics) | Pre-trained, detects people out of the box, class 0 = person |
| Heatmap | OpenCV + NumPy | Generated from detection coordinates |
| Charts | Recharts or Chart.js | Real-time crowd count graph |
| Live Camera | WebSockets | Stream frames backend → frontend |
| Static/Upload | REST API (HTTP) | POST image/video, receive annotated result |

---

## Why These Choices Were Made
- **YOLOv8** was chosen because it requires zero training, downloads automatically via the Ultralytics library, runs in one line of Python, and supports CUDA natively. It detects people (class 0) out of the box.
- **FastAPI** was chosen over Flask for speed and built-in async support (needed for WebSockets and live feed).
- **React + Tailwind** for a modern, fast-to-build dashboard UI.
- **No machine learning training required** — purely inference on a pre-trained model.

---

## Core Logic Decisions

### Person Detection
```python
from ultralytics import YOLO
model = YOLO("yolov8n.pt")  # downloads automatically on first run
results = model("image.jpg", classes=[0])  # class 0 = person only
```

### Density Classification
```python
def classify_density(person_count, frame_area):
    density = person_count / frame_area * 10000  # people per 10k pixels

    if density < 1:    return "Empty",    "green"
    elif density < 3:  return "Light",    "yellow"
    elif density < 6:  return "Moderate", "orange"
    else:              return "Packed",   "red"
```
> Note: These thresholds are starting estimates. They will likely need tuning once real images are tested.

### Heatmap Generation
- Extract bounding box center coordinates from YOLO detections
- Accumulate points into a NumPy array the size of the frame
- Apply `cv2.GaussianBlur()` to spread heat around each point
- Normalize and apply a colormap (`cv2.COLORMAP_JET`)
- Blend with original frame using `cv2.addWeighted()`

---

## Planned Features (by phase)

### Phase 1 — Static Image Upload ← START HERE
- [ ] Upload an image via the dashboard
- [ ] Backend runs YOLOv8 detection
- [ ] Returns annotated image (bounding boxes drawn)
- [ ] Person count displayed
- [ ] Density label shown with color badge (Empty / Light / Moderate / Packed)
- [ ] Heatmap overlay toggle

### Phase 2 — Video File Upload
- [ ] Upload a video file
- [ ] Backend processes frame by frame
- [ ] Returns crowd count over time as a graph
- [ ] Summary stats (peak count, average density, duration)

### Phase 3 — Live Camera Feed
- [ ] WebSocket connection from frontend to backend
- [ ] Backend reads webcam or IP camera via `cv2.VideoCapture()`
- [ ] Frames processed in real time, streamed back to frontend
- [ ] Live updating count graph
- [ ] Alert/notification when density exceeds a user-set threshold

---

## Folder Structure (planned, not yet created)
```
crowdsense/
├── backend/
│   ├── main.py              # FastAPI app, all routes
│   ├── detector.py          # YOLOv8 detection logic
│   ├── density.py           # Density classification + heatmap generation
│   ├── websocket.py         # Live feed WebSocket handler
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadPanel.jsx
│   │   │   ├── LiveFeed.jsx
│   │   │   ├── HeatmapView.jsx
│   │   │   └── CrowdGraph.jsx
│   │   └── App.jsx
│   └── package.json
└── README.md
```

---

## Environment Setup (Windows, first time)

```bash
# Step 1 — Install CUDA Toolkit 12.x
# Download from: https://developer.nvidia.com/cuda-downloads

# Step 2 — Install PyTorch with CUDA
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Step 3 — Install backend dependencies
pip install fastapi uvicorn ultralytics opencv-python numpy pillow python-multipart websockets

# Step 4 — Verify GPU is available
python -c "import torch; print(torch.cuda.is_available())"
# Must print: True

# Step 5 — Set up React frontend
npx create-react-app crowdsense-frontend
cd crowdsense-frontend
npm install tailwindcss recharts axios
```

---

## What Has Been Tried / Built
**Nothing has been implemented in code yet.** All of the above is planned and decided through conversation. The next step is writing the first lines of code.

---

## What To Build First
Start with `backend/detector.py` and `backend/main.py` to get Phase 1 working:

1. `detector.py` — load YOLOv8, run inference on an image, return bounding boxes + count
2. `density.py` — take count + frame dimensions, return density label + color
3. `main.py` — FastAPI app with a single `/detect` POST endpoint that accepts an image file and returns:
   ```json
   {
     "person_count": 12,
     "density_label": "Moderate",
     "density_color": "orange",
     "annotated_image": "<base64 encoded jpg>"
   }
   ```
4. Test the endpoint works with a tool like Postman or curl before touching the frontend
5. Then build the React `UploadPanel.jsx` and `Dashboard.jsx` to connect to it

---

## Known Risks / Things To Watch Out For
- **CUDA not detected:** Make sure CUDA Toolkit version matches the PyTorch install URL. Run the verify command above before anything else.
- **Density thresholds:** The `classify_density()` thresholds are rough estimates. Expect to tune them after testing on real images.
- **Live feed latency:** WebSocket streaming of full frames can be slow. Consider resizing frames to 640px wide before sending, and encoding as JPEG at ~80% quality to reduce bandwidth.
- **CORS issues:** When React (port 3000) calls FastAPI (port 8000), you will hit CORS errors. Add this to `main.py`:
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
  ```
- **Large video files:** Processing video frame by frame in a single request will time out. Use background tasks or a job queue (FastAPI BackgroundTasks is fine for now).

---

## User Preferences / Context
- Prefers clear, well-commented code
- Personal project — no strict deadlines, no course requirements
- Wants to eventually get to live camera feed but is happy starting with static images
- Will be using VS Code on Windows
- GitHub repo will be created by the user before development starts
- Has no existing codebase — everything starts from scratch

---

## Suggested First Message To Next Agent
> "Here is my HANDOFF.md for the CrowdSense project. Please read it and then write the starter code for `backend/detector.py`, `backend/density.py`, and `backend/main.py` to get Phase 1 working — static image upload with YOLOv8 detection, density classification, and a `/detect` endpoint that returns JSON with the annotated image."
