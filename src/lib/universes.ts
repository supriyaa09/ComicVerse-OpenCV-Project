export type UniverseId = "manga" | "cartoon" | "ghibli";

export interface Universe {
  id: UniverseId;
  name: string;
  tagline: string;
  subtitle: string;
  number: string;
  // CSS color token name
  color: string;
  gradient: string;
  shadow: string;
  font: string;
  // Visual processing settings used when "generating" panels
  filter: {
    saturate: number;
    contrast: number;
    brightness: number;
    hueRotate: number;
    blur: number;
    sepia: number;
  };
  // Panel chrome
  borderStyle: string;
  background: string;
  // Lore copy
  description: string;
}

export const UNIVERSES: Record<UniverseId, Universe> = {
  manga: {
    id: "manga",
    name: "MANGA",
    number: "01",
    tagline: "Ink. Speed. Fury.",
    subtitle: "Shōnen Protocol",
    color: "var(--manga)",
    gradient: "var(--gradient-manga)",
    shadow: "var(--shadow-glow-manga)",
    font: "var(--font-display)",
    filter: {
      saturate: 0,
      contrast: 1.8,
      brightness: 1.05,
      hueRotate: 0,
      blur: 0.3,
      sepia: 0,
    },
    borderStyle: "4px solid #0a0a0a",
    background: "#f5f1e6",
    description:
      "High-contrast black & white. Screen tones, speed lines, dramatic close-ups. You are the protagonist now.",
  },
  cartoon: {
    id: "cartoon",
    name: "CARTOON",
    number: "02",
    tagline: "Pop. Punch. Pow!",
    subtitle: "Saturday Morning Mode",
    color: "var(--cartoon)",
    gradient: "var(--gradient-cartoon)",
    shadow: "var(--shadow-glow-cartoon)",
    font: "var(--font-display)",
    filter: {
      saturate: 2.2,
      contrast: 1.4,
      brightness: 1.1,
      hueRotate: 0,
      blur: 0,
      sepia: 0,
    },
    borderStyle: "5px solid #111",
    background: "#fff8d6",
    description:
      "Loud colors, bold outlines, kapow energy. Every frame is a punchline waiting to happen.",
  },
  ghibli: {
    id: "ghibli",
    name: "GHIBLI",
    number: "03",
    tagline: "Wind. Wonder. Whisper.",
    subtitle: "Painted Realms",
    color: "var(--ghibli)",
    gradient: "var(--gradient-ghibli)",
    shadow: "var(--shadow-glow-ghibli)",
    font: "var(--font-serif)",
    filter: {
      saturate: 1.1,
      contrast: 0.95,
      brightness: 1.08,
      hueRotate: -8,
      blur: 0.6,
      sepia: 0.18,
    },
    borderStyle: "2px solid #c9b78a",
    background: "#f3ead4",
    description:
      "Soft watercolor light, gentle wind, painted skies. The quiet magic of an everyday miracle.",
  },
};

export const UNIVERSE_LIST: Universe[] = [UNIVERSES.manga, UNIVERSES.cartoon, UNIVERSES.ghibli];
