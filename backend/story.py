from __future__ import annotations

import base64
import json
import os
from typing import Any

import cv2
import numpy as np
import requests
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


class StoryResult(BaseModel):
    title: str = "Untitled Comic"
    premise: str = ""
    captions: list[str] = Field(default_factory=list)
    ending: str = ""


def generate_story_from_frames(frames: list[np.ndarray], universe: str) -> StoryResult:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return fallback_story(len(frames), universe)

    image_parts = []
    for index, frame in enumerate(frames[:5], start=1):
        image_parts.append({"type": "text", "text": f"Keyframe {index}:"})
        image_parts.append(
            {
                "type": "image_url",
                "image_url": {"url": encode_frame_for_groq(frame)},
            }
        )

    prompt = (
        "You are a comic writer. Use these webcam keyframes as visual evidence and create a short "
        f"{universe} comic story. Return only JSON with keys: title, premise, captions, ending. "
        "captions must be an array with one caption per keyframe, in order. Keep each caption under "
        "14 words. Make the user feel like the main character."
    )

    response = requests.post(
        GROQ_CHAT_COMPLETIONS_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL),
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}, *image_parts],
                }
            ],
            "temperature": float(os.getenv("GROQ_TEMPERATURE", "0.8")),
            "max_completion_tokens": int(os.getenv("GROQ_MAX_COMPLETION_TOKENS", "600")),
            "response_format": {"type": "json_object"},
        },
        timeout=int(os.getenv("GROQ_TIMEOUT_SECONDS", "45")),
    )

    if response.status_code >= 400:
        raise RuntimeError(f"Groq story error {response.status_code}: {response.text[:500]}")

    content = response.json()["choices"][0]["message"]["content"]
    return normalize_story(json.loads(content), len(frames), universe)


def encode_frame_for_groq(frame: np.ndarray) -> str:
    h, w = frame.shape[:2]
    max_side = 768
    scale = min(max_side / max(w, h), 1.0)
    if scale < 1.0:
        frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    if not ok:
        raise ValueError("Could not encode frame for Groq")

    payload = base64.b64encode(encoded.tobytes()).decode("ascii")
    return f"data:image/jpeg;base64,{payload}"


def normalize_story(raw: dict[str, Any], frame_count: int, universe: str) -> StoryResult:
    story = StoryResult.model_validate(raw)
    if not story.captions:
        story.captions = fallback_story(frame_count, universe).captions

    if len(story.captions) < frame_count:
        extra = fallback_story(frame_count, universe).captions
        story.captions.extend(extra[len(story.captions) : frame_count])

    story.captions = story.captions[:frame_count]
    return story


def fallback_story(frame_count: int, universe: str) -> StoryResult:
    captions = [
        "A quiet moment becomes the first panel of a bigger destiny.",
        "The hero studies the scene before choosing their next move.",
        "Energy gathers as the world shifts into comic-book motion.",
        "The main character steps forward and claims the frame.",
        "A final glance turns the scene into legend.",
    ]
    return StoryResult(
        title=f"{universe.title()} Awakening",
        premise="A normal webcam moment becomes the opening scene of a comic adventure.",
        captions=captions[:frame_count],
        ending="The next chapter is waiting just outside the frame.",
    )
