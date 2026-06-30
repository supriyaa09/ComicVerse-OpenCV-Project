import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, setMuted, preloadAll } from "@/lib/sfx";

export function SoundToggle() {
  const [muted, set] = useState(false);
  useEffect(() => {
    set(isMuted());
    preloadAll();
  }, []);
  return (
    <button
      onClick={() => {
        const next = !muted;
        setMuted(next);
        set(next);
      }}
      className="fixed top-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition hover:scale-110 hover:border-white/60"
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}
