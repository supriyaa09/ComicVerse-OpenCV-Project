from __future__ import annotations

import base64
import io
import os

import cv2
import numpy as np
import requests
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

STABILITY_SD3_ENDPOINT = "https://api.stability.ai/v2beta/stable-image/generate/sd3"
DEFAULT_MODEL = "sd3.5-large"
DEFAULT_PROMPT = (
    "ghibli inspired anime portrait, soft watercolor lighting, hand painted background, "
    "warm natural colors, expressive face, clean linework, cinematic composition"
)
DEFAULT_NEGATIVE_PROMPT = (
    "photorealistic, blurry, distorted face, bad anatomy, extra fingers, text, watermark"
)


def generate_stability_ghibli_panel(image: np.ndarray, strength: float | None = None) -> str:
    api_key = os.getenv("STABILITY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "Missing STABILITY_API_KEY. Add your Stability AI API key to .env and restart the backend."
        )

    source = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = resize_for_stability(Image.fromarray(source).convert("RGB"))
    image_buffer = io.BytesIO()
    pil_image.save(image_buffer, format="PNG")
    image_buffer.seek(0)

    prompt = os.getenv("STABILITY_PROMPT") or os.getenv("GHIBLI_PROMPT") or DEFAULT_PROMPT
    negative_prompt = (
        os.getenv("STABILITY_NEGATIVE_PROMPT")
        or os.getenv("GHIBLI_NEGATIVE_PROMPT")
        or DEFAULT_NEGATIVE_PROMPT
    )
    model = os.getenv("STABILITY_MODEL", DEFAULT_MODEL)
    output_format = os.getenv("STABILITY_OUTPUT_FORMAT", "png")

    response = requests.post(
        STABILITY_SD3_ENDPOINT,
        headers={
            "authorization": f"Bearer {api_key}",
            "accept": "image/*",
        },
        files={"image": ("frame.png", image_buffer, "image/png")},
        data={
            "mode": "image-to-image",
            "model": model,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "strength": str(clamp_strength(strength)),
            "output_format": output_format,
        },
        timeout=int(os.getenv("STABILITY_TIMEOUT_SECONDS", "120")),
    )

    if response.status_code >= 400:
        raise RuntimeError(f"Stability AI error {response.status_code}: {response.text[:500]}")

    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        payload = response.json()
        image_base64 = payload.get("image")
        if not image_base64:
            raise RuntimeError("Stability AI response did not include an image")
        return f"data:image/{output_format};base64,{image_base64}"

    image_base64 = base64.b64encode(response.content).decode("ascii")
    return f"data:image/{output_format};base64,{image_base64}"


def resize_for_stability(image: Image.Image, max_side: int = 1024) -> Image.Image:
    width, height = image.size
    ratio = min(max_side / width, max_side / height, 1.0)
    new_width = max(64, int(width * ratio) // 8 * 8)
    new_height = max(64, int(height * ratio) // 8 * 8)
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)


def clamp_strength(strength: float | None) -> float:
    if strength is None:
        strength = float(os.getenv("STABILITY_STRENGTH", os.getenv("GHIBLI_STRENGTH", "0.6")))
    return max(0.1, min(1.0, float(strength)))
