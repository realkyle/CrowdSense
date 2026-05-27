import base64
import tempfile
import uuid
import os
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from detector import detect_people
from density import classify_density, generate_heatmap
from video_processor import process_video, jobs

app = FastAPI(title="CrowdSense API")

# Allow the React dev server (port 3000) to call this API without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png"}
SUPPORTED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/avi", "video/webm"}


def encode_image_base64(frame) -> str:
    """Encode an OpenCV BGR frame to a base64 JPEG string."""
    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not success:
        raise RuntimeError("Failed to encode image as JPEG")
    return base64.b64encode(buffer).decode("utf-8")


# ---------------------------------------------------------------------------
# Image endpoint (Phase 1)
# ---------------------------------------------------------------------------

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """
    Accept an uploaded image, run YOLOv8 person detection, and return:
      - person_count
      - density_label + density_color
      - annotated_image (base64 JPEG with bounding boxes)
      - heatmap_image  (base64 JPEG with blended heatmap overlay)
    """
    if file.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG or PNG.",
        )

    image_bytes = await file.read()

    try:
        detection = detect_people(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    person_count = detection["person_count"]
    boxes = detection["boxes"]
    w = detection["frame_width"]
    h = detection["frame_height"]
    annotated = detection["annotated_image"]

    density_label, density_color = classify_density(person_count, w, h)
    heatmap = generate_heatmap(boxes, w, h, annotated)

    return {
        "person_count": person_count,
        "density_label": density_label,
        "density_color": density_color,
        "annotated_image": encode_image_base64(annotated),
        "heatmap_image": encode_image_base64(heatmap),
    }


# ---------------------------------------------------------------------------
# Video endpoints (Phase 2)
# ---------------------------------------------------------------------------

@app.post("/detect-video")
async def detect_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Accept a video upload and start background processing.
    Returns a job_id immediately — poll /jobs/{job_id} for results.
    """
    if file.content_type not in SUPPORTED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload an MP4, MOV, or AVI.",
        )

    # Write upload to a temp file so OpenCV can read it via VideoCapture
    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(await file.read())
    tmp.close()

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "progress": 0.0}

    background_tasks.add_task(process_video, job_id, tmp.name)

    return {"job_id": job_id, "status": "queued"}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Poll this endpoint to check processing status and retrieve results."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    return jobs[job_id]


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}
