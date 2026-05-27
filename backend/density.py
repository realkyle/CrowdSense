import cv2
import numpy as np


# Thresholds are people-per-10k-pixels. These are rough starting estimates —
# expect to tune them once you test on real images.
def classify_density(person_count: int, frame_width: int, frame_height: int) -> tuple[str, str]:
    """Return (label, color) for the given count and frame dimensions."""
    frame_area = frame_width * frame_height
    density = person_count / frame_area * 10_000

    if density < 1:
        return "Empty", "green"
    elif density < 3:
        return "Light", "yellow"
    elif density < 6:
        return "Moderate", "orange"
    else:
        return "Packed", "red"


def generate_heatmap(
    boxes: list[list[int]],
    frame_width: int,
    frame_height: int,
    base_frame: np.ndarray,
) -> np.ndarray:
    """
    Build a JET colormap heatmap blended over base_frame.

    Each bounding box center contributes a Gaussian blob to an accumulator
    array. The result is normalized, colorized, and blended with the original.
    """
    # Accumulator — float32 so the Gaussian values don't clip
    heat = np.zeros((frame_height, frame_width), dtype=np.float32)

    for x1, y1, x2, y2 in boxes:
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2

        # Blob radius scales with box height so larger (closer) people get bigger blobs
        box_h = max(y2 - y1, 1)
        radius = max(box_h // 2, 20)

        # Draw a filled white circle and blur it to create a soft Gaussian blob
        blob = np.zeros((frame_height, frame_width), dtype=np.float32)
        cv2.circle(blob, (cx, cy), radius, 1.0, -1)
        ksize = radius * 2 + 1  # kernel size must be odd
        blob = cv2.GaussianBlur(blob, (ksize, ksize), 0)
        heat += blob

    if heat.max() > 0:
        heat = heat / heat.max()  # normalize to [0, 1]

    # Convert to uint8 for colormap application
    heat_uint8 = (heat * 255).astype(np.uint8)
    colormap = cv2.applyColorMap(heat_uint8, cv2.COLORMAP_JET)

    # Blend: 60% original, 40% heatmap — adjust alpha to taste
    blended = cv2.addWeighted(base_frame, 0.6, colormap, 0.4, 0)
    return blended
