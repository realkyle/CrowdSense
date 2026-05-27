import cv2
import numpy as np
from ultralytics import YOLO

# Load model once at import time — avoids reloading on every request.
# "yolov8n.pt" downloads automatically on first run (~6MB).
model = YOLO("yolov8n.pt")


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

    # Run inference — classes=[0] restricts to "person" only, device="cuda" uses the GPU.
    # conf=0.4 filters weak detections to reduce false positives.
    results = model.predict(frame, classes=[0], device="cuda", conf=0.4, verbose=False)

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
