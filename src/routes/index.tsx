import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { UNIVERSE_LIST, type Universe } from "@/lib/universes";
import { stopAllSounds } from "@/lib/sfx";
import { SoundToggle } from "@/components/SoundToggle";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MULTIVERSE — Choose Your Reality" },
      {
        name: "description",
        content: "Step into Manga, Cartoon, or Ghibli. Become a comic panel.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [hovered, setHovered] = useState<Universe | null>(null);

  useEffect(() => {
    stopAllSounds();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SoundToggle />

      {/* Background gradient that morphs with hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-50"
        animate={{
          background: hovered
            ? hovered.gradient
            : "radial-gradient(ellipse at center, oklch(0.18 0.02 270) 0%, oklch(0.06 0.01 270) 70%)",
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <div className="pointer-events-none absolute inset-0 halftone-bg text-white/[0.04]" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 md:px-14">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Multiverse / v1.0
          </span>
        </div>
        <nav className="hidden gap-8 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground md:flex">
          <span>03 Realms</span>
          <span>Webcam Required</span>
          <span className="flicker">● Live</span>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-8 pt-10 pb-6 md:px-14 md:pt-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-mono text-xs uppercase tracking-[0.4em] text-accent"
        >
          Turn Yourself Into Main Character
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="font-display mt-3 text-[14vw] leading-[0.85] md:text-[10rem]"
        >
          ComicVerse
          <br />
          <span className="text-stroke">YOUR UNIVERSE</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 max-w-xl font-serif-display text-lg italic text-muted-foreground md:text-xl"
        >
          Three stylized realms. One webcam. Capture frames, generate panels, and
          star in your own comic.
        </motion.p>
      </section>

      {/* Universe grid */}
      <section className="relative z-10 grid grid-cols-1 gap-4 px-8 pb-12 md:grid-cols-3 md:gap-6 md:px-14">
        {UNIVERSE_LIST.map((u, i) => (
          <UniverseCard
            key={u.id}
            universe={u}
            index={i}
            onHover={(v) => setHovered(v ? u : null)}
          />
        ))}
      </section>

      {/* Footer marquee */}
      <footer className="relative z-10 border-t border-border/40 px-8 py-5 md:px-14">
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>↳ Hover to preview · Click to enter</span>
          <span>No data leaves your device · 100% local</span>
          <span>© Multiverse Studio</span>
        </div>
      </footer>
    </main>
  );
}

function UniverseCard({
  universe,
  index,
  onHover,
}: {
  universe: Universe;
  index: number;
  onHover: (v: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => {
        onHover(true);
      }}
      onHoverEnd={() => onHover(false)}
    >
      <Link
        to="/universe/$type"
        params={{ type: universe.id }}
        className="group relative block aspect-[4/5] overflow-hidden rounded-sm border border-border/60 bg-card transition-all duration-500 hover:border-white/40"
        style={{ boxShadow: `0 1px 0 0 rgba(255,255,255,0.04) inset` }}
      >
        {/* Cover reference */}
        <img
          src={universe.coverImage}
          alt={`${universe.name} style cover reference`}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="eager"
        />

        {/* Color wash */}
        <motion.div
          className="absolute inset-0 opacity-35 mix-blend-color transition-opacity duration-500 group-hover:opacity-20"
          style={{ background: universe.gradient }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />
        <div className="pointer-events-none absolute inset-0 halftone-bg text-black/10" />

        {/* Number */}
        <div className="absolute left-5 top-5 font-mono text-xs uppercase tracking-[0.3em] text-white/80">
          {universe.number} / 03
        </div>

        {/* Hover-only floating tag */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute right-5 top-5 flex items-center gap-1 rounded-full border border-white/40 bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100"
        >
          Enter <ArrowUpRight className="h-3 w-3" />
        </motion.div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <div
            className="font-display text-6xl leading-none text-white transition-transform duration-500 group-hover:-translate-y-1 md:text-7xl"
            style={{ fontFamily: universe.font }}
          >
            {universe.name}
          </div>
          <div className="mt-2 font-mono text-xs uppercase tracking-[0.25em] text-white/70">
            {universe.subtitle}
          </div>
          <div
            className="mt-4 max-h-0 overflow-hidden text-sm text-white/85 transition-all duration-500 group-hover:max-h-32 group-hover:mt-4"
          >
            {universe.description}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4">
            <span className="font-serif-display text-base italic text-white">
              "{universe.tagline}"
            </span>
            <motion.div
              className="h-6 w-6 rounded-full"
              style={{ backgroundColor: universe.color }}
              whileHover={{ scale: 1.4 }}
            />
          </div>
        </div>

        {/* Border sweep */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ boxShadow: `inset 0 0 0 1px ${universe.color}, ${universe.shadow}` }}
        />
      </Link>
    </motion.div>
  );
}
