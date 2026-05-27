import tempfile
import os
import cv2
import torch
from ultralytics import YOLO

from density import classify_density

# Reuse the same model instance as detector.py would, but we load it here
# independently so video_processor can be imported on its own.
model = YOLO("yolov8s.pt")

# In-memory job store: job_id → job dict.
# Fine for a single-user local app; would be replaced with Redis/DB in production.
jobs: dict[str, dict] = {}


def process_video(job_id: str, video_path: str, sample_interval: float = 1.0):
    """
    Process a video file frame by frame, sampling one frame per second.
    Updates the jobs dict in-place so the polling endpoint can track progress.

    Args:
        job_id:          UUID string identifying this job
        video_path:      Path to the temporary video file on disk
        sample_interval: Seconds between sampled frames (default: 1 frame/sec)
    """
    jobs[job_id]["status"] = "processing"

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = "Could not open video file."
        _cleanup(video_path)
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    # How many frames to skip between samples
    frame_step = max(1, int(fps * sample_interval))

    timeline = []
    frame_idx = 0

    with torch.no_grad():
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Only process every frame_step frames
            if frame_idx % frame_step == 0:
                timestamp = frame_idx / fps

                h, w = frame.shape[:2]

                # Resize for speed — same cap as the image endpoint
                MAX_WIDTH = 1280
                if w > MAX_WIDTH:
                    scale = MAX_WIDTH / w
                    frame = cv2.resize(frame, (MAX_WIDTH, int(h * scale)), interpolation=cv2.INTER_AREA)
                    h, w = frame.shape[:2]

                results = model.predict(frame, classes=[0], device="cuda", conf=0.25, imgsz=1280, verbose=False, save=False)
                count = sum(len(r.boxes) for r in results)
                label, color = classify_density(count, w, h)

                timeline.append({
                    "time": round(timestamp, 2),
                    "count": count,
                    "density": label,
                    "density_color": color,
                })

                # Update progress so the frontend can show a progress bar
                jobs[job_id]["progress"] = round(frame_idx / max(total_frames, 1), 2)

            frame_idx += 1

    cap.release()
    _cleanup(video_path)

    if not timeline:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = "No frames could be processed."
        return

    counts = [f["count"] for f in timeline]
    peak_count = max(counts)
    avg_count = round(sum(counts) / len(counts), 1)
    _, peak_color = classify_density(peak_count, w, h)

    jobs[job_id].update({
        "status": "done",
        "progress": 1.0,
        "result": {
            "duration": round(duration, 2),
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "sampled_frames": len(timeline),
            "peak_count": peak_count,
            "avg_count": avg_count,
            "peak_color": peak_color,
            "timeline": timeline,
        },
    })


def _cleanup(path: str):
    try:
        os.remove(path)
    except OSError:
        pass
