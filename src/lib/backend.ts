import type { UniverseId } from "./universes";

const DEFAULT_BACKEND_URL = "http://localhost:8000";

type GenerateResponse = {
  universe: UniverseId;
  panels: string[];
  story: ComicStory;
};

export type ComicStory = {
  title: string;
  premise: string;
  captions: string[];
  ending: string;
};

type GenerateOptions = {
  strength?: number;
  inkIntensity?: number;
};

export async function generateComicPanels(
  universe: UniverseId,
  frames: string[],
  options: GenerateOptions = {},
): Promise<GenerateResponse> {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      universe,
      frames,
      strength: options.strength,
      ink_intensity: options.inkIntensity,
    }),
  });

  if (!response.ok) {
    const message = await readError(response);
    throw new Error(message || "Python backend could not generate panels");
  }

  const data = (await response.json()) as GenerateResponse;
  return data;
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? "";
  } catch {
    return "";
  }
}
