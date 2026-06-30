import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Power, Sparkles, Trash2, Download } from "lucide-react";
import { UNIVERSES, type UniverseId } from "@/lib/universes";
import { generateComicPanels, type ComicStory } from "@/lib/backend";
import { play, stopAllSounds } from "@/lib/sfx";
import { SoundToggle } from "@/components/SoundToggle";

export const Route = createFileRoute("/universe/$type")({
  head: ({ params }) => {
    const u = UNIVERSES[params.type as UniverseId];
    const name = u ? u.name : "Universe";
    return {
      meta: [
        { title: `${name} — Multiverse` },
        {
          name: "description",
          content: u ? u.description : "A stylized universe.",
        },
      ],
    };
  },
  beforeLoad: ({ params }) => {
    if (!UNIVERSES[params.type as UniverseId]) throw notFound();
  },
  component: UniversePage,
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="font-display text-4xl">Reality glitched</h1>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="rounded border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest hover:bg-card"
      >
        Try again
      </button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <h1 className="font-display text-6xl">Unknown Universe</h1>
      <Link to="/" className="font-mono text-xs uppercase tracking-widest underline">
        ← Back to picker
      </Link>
    </div>
  ),
});

function UniversePage() {
  const { type } = Route.useParams();
  const universe = UNIVERSES[type as UniverseId];
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]); // raw captured data URLs
  const [panels, setPanels] = useState<string[]>([]); // stylized panels
  const [story, setStory] = useState<ComicStory | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [ghibliStrength, setGhibliStrength] = useState(0.6);
  const [mangaInkIntensity, setMangaInkIntensity] = useState(0.78);

  useEffect(() => {
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCam() {
    setError(null);
    play("power", 0.5);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Camera permission denied";
      setError(msg);
    }
  }

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  function captureFrame() {
    if (!videoRef.current || !streaming) return;
    play("shutter", 0.7);
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setFrames((f) => [...f, c.toDataURL("image/jpeg", 0.92)]);
  }

  async function generatePanels() {
    if (frames.length === 0) return;
    play("generate", 0.6);
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await generateComicPanels(universe.id, frames, {
        strength: universe.id === "ghibli" ? ghibliStrength : undefined,
        inkIntensity: universe.id === "manga" ? mangaInkIntensity : undefined,
      });
      setPanels(result.panels);
      setStory(result.story);
      play("whoosh", 0.5);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Python backend could not generate panels";
      setGenerateError(`${msg}. Start the backend with: npm run backend`);
    } finally {
      setGenerating(false);
    }
  }

  function clearAll() {
    play("back", 0.4);
    setFrames([]);
    setPanels([]);
    setStory(null);
    setGenerateError(null);
  }

  async function downloadComicPage() {
    if (panels.length === 0) return;
    const images = await Promise.all(panels.map(loadImage));
    const panelWidth = 640;
    const panelHeight = 480;
    const columns = panels.length <= 2 ? 1 : 2;
    const rows = Math.ceil(panels.length / columns);
    const gap = 24;
    const padding = 36;
    const titleHeight = 86;
    const footerHeight = 42;
    const canvas = document.createElement("canvas");
    canvas.width = padding * 2 + columns * panelWidth + (columns - 1) * gap;
    canvas.height = padding * 2 + titleHeight + rows * panelHeight + (rows - 1) * gap + footerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = universe.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 44px sans-serif";
    ctx.fillText(story?.title || `${universe.name} COMIC`, padding, 58);
    ctx.font = "18px serif";
    ctx.fillText(story?.premise || universe.tagline, padding, 84);

    images.forEach((image, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + col * (panelWidth + gap);
      const y = padding + titleHeight + row * (panelHeight + gap);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(x - 5, y - 5, panelWidth + 10, panelHeight + 10);
      ctx.drawImage(image, x, y, panelWidth, panelHeight);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + 30, y + 30, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.font = "700 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), x + 30, y + 31);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      const caption = story?.captions[index];
      if (caption) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.fillRect(x + 14, y + panelHeight - 54, panelWidth - 28, 38);
        ctx.fillStyle = "#0a0a0a";
        ctx.font = "700 16px sans-serif";
        ctx.fillText(caption, x + 26, y + panelHeight - 29);
      }
    });

    ctx.font = "14px monospace";
    ctx.fillStyle = "rgba(10, 10, 10, 0.72)";
    ctx.fillText("COMICVERSE", padding, canvas.height - 24);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${universe.id}-comic-page.png`;
    a.click();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SoundToggle />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: universe.gradient }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.8 }}
      />
      <div className="pointer-events-none absolute inset-0 halftone-bg text-white/[0.04]" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <button
          onClick={() => {
            stopAllSounds();
            router.navigate({ to: "/" });
          }}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to multiverse
        </button>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>{universe.number} / 03</span>
          <span className="h-1 w-8" style={{ backgroundColor: universe.color }} />
          <span>{universe.subtitle}</span>
        </div>
      </header>

      {/* Title strip */}
      <section className="relative z-10 px-6 pb-6 md:px-12">
        <div
          className="font-display text-[18vw] leading-[0.85] md:text-[9rem]"
          style={{ fontFamily: universe.font, color: universe.color }}
        >
          {universe.name}
        </div>
        <p className="mt-2 max-w-2xl font-serif-display text-lg italic text-muted-foreground md:text-xl">
          "{universe.tagline}" — {universe.description}
        </p>
      </section>

      {/* Studio */}
      <section className="relative z-10 grid grid-cols-1 gap-6 px-6 pb-10 md:px-12 lg:grid-cols-[1.4fr_1fr]">
        {/* Webcam viewer */}
        <div className="relative">
          <div
            className="relative aspect-video w-full overflow-hidden rounded-sm border bg-black"
            style={{ borderColor: `color-mix(in oklab, ${universe.color} 60%, transparent)` }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{
                filter: streaming
                  ? `saturate(${universe.filter.saturate}) contrast(${universe.filter.contrast}) brightness(${universe.filter.brightness}) hue-rotate(${universe.filter.hueRotate}deg) sepia(${universe.filter.sepia})`
                  : "none",
              }}
            />
            {!streaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center">
                <div className="font-display text-3xl tracking-wider" style={{ color: universe.color }}>
                  CAMERA OFFLINE
                </div>
                <p className="max-w-sm font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Power the lens to begin your transformation.
                </p>
                {error && (
                  <p className="mt-2 max-w-sm rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
            )}
            {/* Reticle / corners */}
            <Corners color={universe.color} />
            {/* HUD */}
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white backdrop-blur">
              <span
                className={`h-1.5 w-1.5 rounded-full ${streaming ? "animate-pulse bg-red-500" : "bg-white/30"}`}
              />
              {streaming ? "Recording reality" : "Standby"}
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white backdrop-blur">
              Frames: {frames.length.toString().padStart(2, "0")}
            </div>
          </div>

          {/* Control bar */}
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton
              onClick={streaming ? () => { play("back", 0.5); stopCam(); } : startCam}
              color={universe.color}
              icon={<Power className="h-4 w-4" />}
              label={streaming ? "Stop Webcam" : "Start Webcam"}
              tone={streaming ? "ghost" : "solid"}
            />
            <ActionButton
              onClick={captureFrame}
              disabled={!streaming}
              color={universe.color}
              icon={<Camera className="h-4 w-4" />}
              label="Capture Frame"
              tone="ghost"
            />
            <ActionButton
              onClick={generatePanels}
              disabled={frames.length === 0 || generating}
              color={universe.color}
              icon={<Sparkles className="h-4 w-4" />}
              label={generating ? "Generating…" : `Generate Comic (${frames.length})`}
              tone="solid"
            />
            {(frames.length > 0 || panels.length > 0) && (
              <ActionButton
                onClick={clearAll}
                color={universe.color}
                icon={<Trash2 className="h-4 w-4" />}
                label="Clear"
                tone="ghost"
              />
            )}
          </div>
          {universe.id === "ghibli" && (
            <div className="mt-4 max-w-md rounded-sm border border-border/70 bg-black/20 px-4 py-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <span>Strength</span>
                <span>{ghibliStrength.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.8"
                step="0.05"
                value={ghibliStrength}
                onChange={(event) => setGhibliStrength(Number(event.target.value))}
                className="w-full accent-[var(--ghibli)]"
                aria-label="Ghibli stylization strength"
              />
            </div>
          )}
          {universe.id === "manga" && (
            <div className="mt-4 max-w-md rounded-sm border border-border/70 bg-black/20 px-4 py-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <span>Ink intensity</span>
                <span>{Math.round(mangaInkIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={mangaInkIntensity}
                onChange={(event) => setMangaInkIntensity(Number(event.target.value))}
                className="w-full accent-[var(--manga)]"
                aria-label="Manga ink intensity"
              />
            </div>
          )}
          {generateError && (
            <p className="mt-3 max-w-2xl rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {generateError}
            </p>
          )}

          {/* Raw frames strip */}
          {frames.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Keyframes
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {frames.map((f, i) => (
                  <motion.img
                    key={i}
                    src={f}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-20 w-32 flex-none rounded-sm border border-border object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comic preview */}
        <div className="relative">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-wide">COMIC PANEL</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {panels.length} panel{panels.length === 1 ? "" : "s"}
              </span>
              {panels.length > 0 && (
                <button
                  onClick={downloadComicPage}
                  className="flex h-8 items-center gap-2 rounded-sm border border-border px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition hover:bg-card"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Page
                </button>
              )}
            </div>
          </div>

          <div
            className="relative grain min-h-[400px] overflow-hidden rounded-sm p-4 shadow-2xl"
            style={{ background: universe.background }}
          >
            <AnimatePresence mode="popLayout">
              {panels.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-[380px] flex-col items-center justify-center gap-3 text-center"
                >
                  <div
                    className="font-display text-5xl"
                    style={{ color: universe.color, fontFamily: universe.font }}
                  >
                    BLANK PAGE
                  </div>
                  <p className="max-w-xs font-serif-display italic text-black/70">
                    Capture a few frames, then hit Generate. Your story starts here.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {story && (
                    <div className="mb-4 border-b border-black/15 pb-3 text-black">
                      <div className="font-display text-3xl leading-none">{story.title}</div>
                      <p className="mt-1 font-serif-display text-base italic text-black/70">
                        {story.premise}
                      </p>
                    </div>
                  )}
                  <div
                    className={`grid gap-3 ${
                      panels.length === 1
                        ? "grid-cols-1"
                        : panels.length === 2
                          ? "grid-cols-1"
                          : "grid-cols-2"
                    }`}
                  >
                    {panels.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30, rotate: i % 2 === 0 ? -1.5 : 1.5 }}
                        animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -0.6 : 0.6 }}
                        transition={{ delay: i * 0.12, duration: 0.5 }}
                        className="group relative aspect-[4/3] overflow-hidden"
                        style={{ border: universe.borderStyle }}
                      >
                        <img src={p} className="h-full w-full object-cover" />
                        <div
                          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm text-black"
                          style={{ backgroundColor: universe.color }}
                        >
                          {i + 1}
                        </div>
                        {story?.captions[i] && (
                          <div className="absolute inset-x-2 bottom-2 bg-white/90 px-2 py-1 text-xs font-semibold leading-tight text-black">
                            {story.captions[i]}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  {story?.ending && (
                    <p className="mt-4 font-serif-display text-base italic text-black/70">
                      {story.ending}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {generating && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div
                  className="font-display text-4xl"
                  style={{ color: universe.color, fontFamily: universe.font }}
                >
                  RENDERING…
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Processing runs through the local Python/OpenCV backend.
          </p>
        </div>
      </section>
    </main>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load generated panel"));
    image.src = src;
  });
}

function Corners({ color }: { color: string }) {
  const c = "absolute h-5 w-5 border-2";
  return (
    <>
      <span className={`${c} left-2 top-2 border-b-0 border-r-0`} style={{ borderColor: color }} />
      <span className={`${c} right-2 top-2 border-b-0 border-l-0`} style={{ borderColor: color }} />
      <span className={`${c} bottom-2 left-2 border-r-0 border-t-0`} style={{ borderColor: color }} />
      <span className={`${c} bottom-2 right-2 border-l-0 border-t-0`} style={{ borderColor: color }} />
    </>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  color,
  disabled,
  tone,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
  disabled?: boolean;
  tone: "solid" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => !disabled && play("hover", 0.2)}
      disabled={disabled}
      className="group relative flex items-center gap-2 overflow-hidden rounded-sm px-5 py-3 font-mono text-xs uppercase tracking-[0.25em] transition disabled:cursor-not-allowed disabled:opacity-40"
      style={
        tone === "solid"
          ? { backgroundColor: color, color: "#0a0a0a" }
          : {
              backgroundColor: "transparent",
              color: "var(--foreground)",
              border: `1px solid color-mix(in oklab, ${color} 70%, transparent)`,
            }
      }
    >
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
      {tone === "ghost" && (
        <span
          className="absolute inset-0 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 20%, transparent)` }}
        />
      )}
    </button>
  );
}
