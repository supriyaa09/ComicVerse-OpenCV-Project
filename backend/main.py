from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .filters import decode_data_url, encode_png_data_url, stylize
from .ghibli_diffusion import encode_pil_png_data_url, ghibli_diffusion_panel, should_use_diffusion
from .stability_ai import generate_stability_ghibli_panel
from .story import StoryResult, generate_story_from_frames

Universe = Literal["manga", "cartoon", "ghibli"]


class GenerateRequest(BaseModel):
    universe: Universe
    frames: list[str] = Field(min_length=1, max_length=8)
    strength: float | None = Field(default=None, ge=0.3, le=0.8)
    ink_intensity: float = Field(default=0.72, ge=0.3, le=1.0)


class GenerateResponse(BaseModel):
    universe: Universe
    panels: list[str]
    story: StoryResult


app = FastAPI(title="ComicVerse OpenCV Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "ComicVerse backend",
        "status": "ok",
        "frontend": "Open http://127.0.0.1:3000",
        "health": "http://127.0.0.1:8000/api/health",
    }


@app.post("/api/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest) -> GenerateResponse:
    panels: list[str] = []
    decoded_frames = [decode_data_url(frame) for frame in request.frames]
    try:
        story = generate_story_from_frames(decoded_frames, request.universe)
        for image in decoded_frames:
            if request.universe == "ghibli":
                if should_use_stability():
                    panels.append(generate_stability_ghibli_panel(image, request.strength))
                elif should_use_diffusion():
                    panel = ghibli_diffusion_panel(image, request.strength)
                    panels.append(encode_pil_png_data_url(panel))
                else:
                    panel = stylize(image, request.universe, request.ink_intensity)
                    panels.append(encode_png_data_url(panel))
            else:
                panel = stylize(image, request.universe, request.ink_intensity)
                panels.append(encode_png_data_url(panel))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Panel generation failed") from exc

    return GenerateResponse(universe=request.universe, panels=panels, story=story)


def should_use_stability() -> bool:
    backend = os.getenv("GHIBLI_BACKEND", "stability").strip().lower()
    return backend in {"stability", "stability-ai", "api", "stable-diffusion-api"}
