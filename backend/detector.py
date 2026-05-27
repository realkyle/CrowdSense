import cv2
import numpy as np
import torch
from ultralytics import YOLO

# Load model once at import time — avoids reloading on every request.
# "yolov8n.pt" downloads automatically on first run (~6MB).
# yolov8s (small) has ~3x more parameters than yolov8n and detects small/distant
# people much better. Still runs at 50+ FPS on the RTX 3060.
model = YOLO("yolov8s.pt")


def detect_people(image_bytes: bytes) -> dict:
    """
    Run YOLOv8 person detection on raw image bytes.

    Returns:
        {
            "person_count": int,
            "boxes": [[x1, y1, x2, y2], ...],   # absolute pixel coords
            "frame_width": int,
            "frame_height": int,
            "annotated_image": np.ndarray (BGR)
        }
    """
    # Decode bytes → OpenCV BGR array
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image. Make sure it's a valid JPEG or PNG.")

    h, w = frame.shape[:2]

    # Resize large images down to max 1280px wide before processing.
    # YOLO resizes to 640x640 internally anyway, so detection quality is unaffected.
    # This keeps the heatmap, annotated image, and response payload a manageable size.
    MAX_WIDTH = 1280
    if w > MAX_WIDTH:
        scale = MAX_WIDTH / w
        frame = cv2.resize(frame, (MAX_WIDTH, int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = frame.shape[:2]

    # torch.no_grad() prevents PyTorch from accumulating computation graphs across
    # requests — without it, VRAM slowly fills up and inference gets slower over time.
    # save=False stops Ultralytics from writing annotated images to a runs/ directory.
    # conf=0.25 catches small/distant people (e.g. wide-angle crowd shots) that
    # 0.4 would miss. Lower values increase false positives on non-crowd images.
    with torch.no_grad():
        # imgsz=1280 runs inference at full resolution instead of YOLO's default
        # 640px — critical for detecting small/distant people in wide-angle shots.
        results = model.predict(frame, classes=[0], device="cuda", conf=0.25, imgsz=1280, verbose=False, save=False)

    boxes = []
    annotated = frame.copy()

    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            boxes.append([x1, y1, x2, y2])
            # Draw bounding box and confidence score on the annotated copy
            conf = float(box.conf[0])
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                annotated,
                f"{conf:.2f}",
                (x1, y1 - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                1,
            )

    return {
        "person_count": len(boxes),
        "boxes": boxes,
        "frame_width": w,
        "frame_height": h,
        "annotated_image": annotated,
    }
