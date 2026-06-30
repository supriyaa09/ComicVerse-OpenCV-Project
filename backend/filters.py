from __future__ import annotations

import base64
import math
import re
from typing import Literal

import cv2
import numpy as np

Universe = Literal["manga", "cartoon", "ghibli"]

DATA_URL_RE = re.compile(r"^data:image/[^;]+;base64,", re.IGNORECASE)


def decode_data_url(data_url: str) -> np.ndarray:
    payload = DATA_URL_RE.sub("", data_url)
    image_bytes = base64.b64decode(payload)
    encoded = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image frame")
    return image


def encode_png_data_url(image: np.ndarray) -> str:
    ok, encoded = cv2.imencode(".png", image)
    if not ok:
        raise ValueError("Could not encode generated panel")
    payload = base64.b64encode(encoded.tobytes()).decode("ascii")
    return f"data:image/png;base64,{payload}"


def resize_panel(image: np.ndarray, width: int = 640, height: int = 480) -> np.ndarray:
    return cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)


def stylize(image: np.ndarray, universe: Universe, ink_intensity: float = 0.72) -> np.ndarray:
    image = resize_panel(image)
    if universe == "manga":
        return manga_panel(image, ink_intensity)
    if universe == "cartoon":
        return cartoon_panel(image)
    if universe == "ghibli":
        return ghibli_panel(image)
    raise ValueError(f"Unsupported universe: {universe}")


def manga_panel(image: np.ndarray, ink_intensity: float = 0.72) -> np.ndarray:
    ink_intensity = float(np.clip(ink_intensity, 0.3, 1.0))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    smooth = cv2.bilateralFilter(gray, 9, 60, 60)
    equalized = cv2.equalizeHist(smooth)
    dark_threshold = int(98 + ink_intensity * 70)
    ink = cv2.adaptiveThreshold(
        smooth,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        21,
        int(9 - ink_intensity * 4),
    )
    edges = cv2.Canny(smooth, 70, 150)
    ink[edges > 0] = 0

    h, w = ink.shape
    tones = np.full_like(ink, 255)
    yy, xx = np.indices((h, w))
    dark = smooth < dark_threshold
    very_dark = equalized < int(82 + ink_intensity * 52)
    mid = (smooth >= dark_threshold) & (smooth < min(220, dark_threshold + 62))
    tones[(xx + yy) % 8 == 0] = 190
    tones[(xx - yy) % 10 == 0] = np.minimum(tones[(xx - yy) % 10 == 0], 215)
    ink[dark] = np.where(tones[dark] < 220, 0, np.minimum(ink[dark], 90))
    ink[very_dark] = 0
    ink[mid & (((xx // 4) + (yy // 4)) % max(2, int(5 - ink_intensity * 3)) == 0)] = int(
        100 - ink_intensity * 55
    )

    kernel = np.ones((2, 2), np.uint8)
    if ink_intensity > 0.65:
        ink = cv2.erode(ink, kernel, iterations=1)
    if ink_intensity > 0.85:
        ink = cv2.erode(ink, kernel, iterations=1)

    panel = cv2.cvtColor(ink, cv2.COLOR_GRAY2BGR)
    panel = cv2.copyMakeBorder(panel, 10, 10, 10, 10, cv2.BORDER_CONSTANT, value=(8, 8, 8))
    panel = cv2.resize(panel, (w, h), interpolation=cv2.INTER_AREA)

    center = (w // 2, h // 2)
    for angle in range(0, 360, 12):
        rad = math.radians(angle)
        start = (
            int(center[0] + math.cos(rad) * min(w, h) * 0.25),
            int(center[1] + math.sin(rad) * min(w, h) * 0.25),
        )
        end = (
            int(center[0] + math.cos(rad) * max(w, h)),
            int(center[1] + math.sin(rad) * max(w, h)),
        )
        cv2.line(panel, start, end, (25, 25, 25), 1, cv2.LINE_AA)
    return panel


def cartoon_panel(image: np.ndarray) -> np.ndarray:
    color = image.copy()
    for _ in range(3):
        color = cv2.bilateralFilter(color, 9, 85, 85)

    hsv = cv2.cvtColor(color, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.55, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * 1.12, 0, 255)
    color = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    levels = 6
    color = np.floor(color / (256 / levels)) * (255 / (levels - 1))
    color = np.clip(color, 0, 255).astype(np.uint8)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 7)
    edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 6)
    edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    panel = cv2.bitwise_and(color, edges)
    return cv2.detailEnhance(panel, sigma_s=8, sigma_r=0.18)


def ghibli_panel(image: np.ndarray) -> np.ndarray:
    softened = cv2.edgePreservingFilter(image, flags=1, sigma_s=70, sigma_r=0.35)
    watercolor = cv2.stylization(softened, sigma_s=80, sigma_r=0.28)

    lab = cv2.cvtColor(watercolor, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[..., 0] = np.clip(lab[..., 0] * 1.08, 0, 255)
    watercolor = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    warm = np.full_like(watercolor, (24, 18, 6), dtype=np.uint8)
    panel = cv2.addWeighted(watercolor, 0.88, warm, 0.12, 0)
    blur = cv2.GaussianBlur(panel, (0, 0), 10)
    panel = cv2.addWeighted(panel, 0.86, blur, 0.14, 8)

    h, w, _ = panel.shape
    noise = np.random.default_rng(7).normal(0, 5, (h, w, 1)).astype(np.int16)
    paper = np.clip(panel.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    vignette = radial_vignette(w, h)
    return np.clip(paper.astype(np.float32) * vignette[..., None], 0, 255).astype(np.uint8)


def radial_vignette(width: int, height: int) -> np.ndarray:
    y, x = np.ogrid[:height, :width]
    cx, cy = width / 2, height / 2
    distance = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    max_distance = np.sqrt(cx**2 + cy**2)
    return 1.0 - 0.22 * np.clip(distance / max_distance, 0, 1)
