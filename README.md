# CrowdSense

A personal web application that detects and estimates crowd density from images, video files, or a live camera feed. Built with YOLOv8 on an NVIDIA RTX 3060 for real-time GPU inference.

## Features

- **Static image upload** — upload a photo and get back annotated bounding boxes, a person count, a density label, and a heatmap overlay
- **Density classification** — Empty / Light / Moderate / Packed with color coding
- **Heatmap overlay** — Gaussian heat distribution blended over the original image
- **Video processing** *(Phase 2)* — frame-by-frame analysis with crowd count graph over time
- **Live camera feed** *(Phase 3)* — real-time WebSocket streaming with threshold alerts

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS + Recharts |
| Backend | Python + FastAPI |
| Detection | YOLOv8n (Ultralytics) — zero training required |
| Heatmap | OpenCV + NumPy |
| Live feed | WebSockets |

## Requirements

- Python 3.11+
- NVIDIA GPU with CUDA 12.x drivers (RTX 3060 recommended)
- Node.js 18+ *(for frontend, Phase 1+)*

## Backend Setup

```bash
# 1. Install PyTorch with CUDA (do this first)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 2. Verify GPU is detected
python -c "import torch; print(torch.cuda.is_available())"
# Must print: True

# 3. Install remaining dependencies
pip install -r backend/requirements.txt

# 4. Start the API server
cd backend
uvicorn main:app --reload --port 8000
```

## API

### `POST /detect`

Upload a JPEG or PNG image and receive detection results.

**Request:** `multipart/form-data` with a `file` field.

**Response:**
```json
{
  "person_count": 12,
  "density_label": "Moderate",
  "density_color": "orange",
  "annotated_image": "<base64 JPEG>",
  "heatmap_image":  "<base64 JPEG>"
}
```

**Quick test:**
```bash
curl -X POST http://localhost:8000/detect -F "file=@your_photo.jpg"
```

### `GET /health`

Returns `{"status": "ok"}` — use to confirm the server is running.

## Project Structure

```
crowdsense/
├── backend/
│   ├── main.py           # FastAPI app and /detect endpoint
│   ├── detector.py       # YOLOv8 inference (CUDA)
│   ├── density.py        # Density classification and heatmap generation
│   └── requirements.txt
├── frontend/             # React dashboard (coming in Phase 1)
└── README.md
```

## Roadmap

- [x] Phase 1 — Backend: `/detect` endpoint with YOLOv8 + heatmap
- [ ] Phase 1 — Frontend: React dashboard with upload panel
- [ ] Phase 2 — Video file processing with crowd count graph
- [ ] Phase 3 — Live webcam feed via WebSockets
