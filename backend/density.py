import cv2
import numpy as np


def classify_density(person_count: int, frame_width: int, frame_height: int) -> tuple[str, str]:
    """
    Return (label, color) using a hybrid of absolute count and pixel density.

    Pure pixel-density breaks on wide-angle shots (e.g. Shibuya crossing) where
    many people are spread across a large frame. The hybrid triggers on whichever
    signal fires first, so close-up and aerial shots both classify correctly.
    """
    frame_area = frame_width * frame_height
    pixel_density = person_count / frame_area * 10_000

    # Packed:   30+ people OR very high pixel density (close-up)
    if person_count >= 30 or pixel_density >= 3:
        return "Packed",   "red"
    # Moderate: 15+ people OR medium pixel density
    elif person_count >= 15 or pixel_density >= 1.5:
        return "Moderate", "orange"
    # Light:    5+ people OR any detectable density
    elif person_count >= 5 or pixel_density >= 0.5:
        return "Light",    "yellow"
    else:
        return "Empty",    "green"


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
