// Lightweight SFX manager backed by free Mixkit CDN sounds.
// All sounds are preloaded lazily and respect a global mute toggle.

const SOUNDS = {
  hover: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  select: "https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3",
  whoosh: "https://assets.mixkit.co/active_storage/sfx/2858/2858-preview.mp3",
  shutter: "https://assets.mixkit.co/active_storage/sfx/1108/1108-preview.mp3",
  generate: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  power: "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3",
  back: "https://assets.mixkit.co/active_storage/sfx/2566/2566-preview.mp3",
} as const;

export type SfxName = keyof typeof SOUNDS;

const cache = new Map<SfxName, HTMLAudioElement>();
const active = new Set<HTMLAudioElement>();
let muted = false;

if (typeof window !== "undefined") {
  muted = window.localStorage.getItem("sfx-muted") === "1";
}

export function isMuted() {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("sfx-muted", v ? "1" : "0");
  }
  if (v) stopAllSounds();
}

export function play(name: SfxName, volume = 0.5) {
  if (typeof window === "undefined" || muted) return;
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(SOUNDS[name]);
    audio.preload = "auto";
    cache.set(name, audio);
  }
  try {
    const clone = audio.cloneNode(true) as HTMLAudioElement;
    clone.volume = volume;
    active.add(clone);
    clone.addEventListener("ended", () => active.delete(clone), { once: true });
    void clone.play().catch(() => active.delete(clone));
  } catch {
    /* ignore */
  }
}

export function stopAllSounds() {
  active.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  active.clear();
}

export function preloadAll() {
  if (typeof window === "undefined") return;
  (Object.keys(SOUNDS) as SfxName[]).forEach((n) => {
    if (!cache.has(n)) {
      const a = new Audio(SOUNDS[n]);
      a.preload = "auto";
      cache.set(n, a);
    }
  });
}
