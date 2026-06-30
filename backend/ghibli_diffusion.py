from __future__ import annotations

import base64
import io
import os
import time
from functools import lru_cache

import cv2
import numpy as np
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

DEFAULT_MODEL_ID = "nitrosocke/Ghibli-Diffusion"
DEFAULT_PROMPT = (
    "ghibli style, soft anime portrait, hand painted watercolor background, "
    "warm natural light, clean expressive face, detailed eyes"
)
DEFAULT_NEGATIVE_PROMPT = (
    "low quality, blurry, distorted face, extra fingers, bad anatomy, text, watermark"
)


def should_use_diffusion() -> bool:
    mode = os.getenv("GHIBLI_BACKEND", "auto").strip().lower()
    if mode in {"opencv", "fast", "false", "0", "off"}:
        return False
    if mode in {"diffusion", "stable-diffusion", "true", "1", "on"}:
        return True

    try:
        import torch
    except ImportError:
        return False
    return torch.cuda.is_available()


def ghibli_diffusion_panel(image: np.ndarray, strength: float | None = None) -> Image.Image:
    pipe = load_model()
    source = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(source).convert("RGB")
    pil_image = resize_for_img2img(pil_image)

    prompt = os.getenv("GHIBLI_PROMPT", DEFAULT_PROMPT)
    negative_prompt = os.getenv("GHIBLI_NEGATIVE_PROMPT", DEFAULT_NEGATIVE_PROMPT)
    strength_value = clamp_strength(strength)
    guidance_scale = float(os.getenv("GHIBLI_GUIDANCE_SCALE", "7.5"))
    steps = int(os.getenv("GHIBLI_INFERENCE_STEPS", "30"))

    print("Generating Ghibli image...")
    start_time = time.time()
    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=pil_image,
        strength=strength_value,
        guidance_scale=guidance_scale,
        num_inference_steps=steps,
    ).images[0]
    print(f"Ghibli image generated in {time.time() - start_time:.2f} seconds")
    return result


@lru_cache(maxsize=1)
def load_model():
    try:
        import torch
        from diffusers import StableDiffusionImg2ImgPipeline
    except ImportError as exc:
        raise RuntimeError(
            "Ghibli Diffusion requires diffusers and torch. Run: python -m pip install -r requirements.txt"
        ) from exc

    model_id = os.getenv("GHIBLI_MODEL_ID", DEFAULT_MODEL_ID)
    token = os.getenv("HUGGINGFACE_TOKEN") or None
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    device = "cuda" if torch.cuda.is_available() else "cpu"

    print(f"Loading Ghibli model: {model_id}")
    pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
        model_id,
        torch_dtype=dtype,
        token=token,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe.to(device)
    pipe.enable_attention_slicing()
    print(f"Ghibli model loaded on {device}")
    return pipe


def resize_for_img2img(image: Image.Image, max_side: int = 512) -> Image.Image:
    width, height = image.size
    ratio = min(max_side / width, max_side / height, 1.0)
    new_width = max(64, int(width * ratio) // 8 * 8)
    new_height = max(64, int(height * ratio) // 8 * 8)
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)


def clamp_strength(strength: float | None) -> float:
    if strength is None:
        strength = float(os.getenv("GHIBLI_STRENGTH", "0.6"))
    return max(0.3, min(0.8, float(strength)))


def encode_pil_png_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{payload}"
