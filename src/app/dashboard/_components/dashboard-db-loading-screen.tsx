"use client";

import { useEffect, useState } from "react";

export type DashboardDbStatus = "idle" | "loading" | "ready" | "error";

const SPRITE_FRAME_WIDTH = 1024;
const SPRITE_FRAME_HEIGHT = 1536;
const PHRASE_CYCLE_MS = 1500;
const PHRASE_FADE_MS = 300;

const FUN_PHRASES = [
  "Pruning the daylilies...",
  "Deadheading blooms...",
  "Watering the beds...",
  "Spreading fresh mulch...",
  "Checking the soil...",
  "Dividing the clumps...",
  "Collecting seeds...",
  "Clearing out weeds...",
  "Setting row markers...",
  "Welcoming pollinators...",
  "Look, a bird...",
  "Chasing off the raccoon...",
  "Frog photoshoot...",
  "Snail patrol...",
  "Squirrel negotiations...",
  "Checking for new buds...",
  "Bee count...",
  "Admiring the blooms...",
  "Watering break...",
  "Just one more plant...",
  "Tag hunt...",
  "Scape count...",
  "Bud watch...",
  "Mulch monster: appeased...",
  "Cultivar ID: maybe...",
  "Late bloomer pep talk...",
  "Bloom timer: imminent...",
  "Deer deterrent duty...",
  "Hail check...",
  "Fence gap investigation...",
];

function DaylilyBloomSprite() {
  const displayWidth = 112;
  const displayHeight = 168;
  const scale = displayWidth / SPRITE_FRAME_WIDTH;

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      aria-hidden
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
      }}
    >
      <div
        className="daylily-bloom-sprite"
        style={{
          width: `${SPRITE_FRAME_WIDTH}px`,
          height: `${SPRITE_FRAME_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

export function DashboardDbLoadingScreen({
  status,
  isExiting,
}: {
  status: DashboardDbStatus;
  isExiting: boolean;
}) {
  const [phraseIndex, setPhraseIndex] = useState(() => {
    const seed = Math.floor(Date.now() / 1000);
    return seed % FUN_PHRASES.length;
  });
  const [isFadingPhrase, setIsFadingPhrase] = useState(false);

  useEffect(() => {
    if (status === "error" || isExiting) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isExiting, status]);

  useEffect(() => {
    if (status === "error") return;

    let fadeResetId: number | null = null;

    const phraseId = window.setInterval(() => {
      setIsFadingPhrase(true);
      fadeResetId = window.setTimeout(() => {
        setPhraseIndex((index) => (index + 1) % FUN_PHRASES.length);
        setIsFadingPhrase(false);
      }, PHRASE_FADE_MS);
    }, PHRASE_CYCLE_MS);

    return () => {
      window.clearInterval(phraseId);
      if (fadeResetId !== null) {
        window.clearTimeout(fadeResetId);
      }
    };
  }, [status]);

  return (
    <div
      className={
        "bg-background fixed inset-0 flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 transition-opacity duration-200 ease-out" +
        (isExiting ? " opacity-0" : " opacity-100")
      }
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="bg-background/80 w-full max-w-sm rounded-2xl border px-8 py-10 shadow-sm backdrop-blur">
        <div className="flex flex-col items-center gap-3 text-center">
          <DaylilyBloomSprite />

          <div className="text-base font-semibold tracking-tight">
            {status === "error"
              ? "Unable to load dashboard data"
              : "Fetching your catalog..."}
          </div>

          <div
            className="text-muted-foreground min-h-[2.5rem] text-sm leading-5"
          >
            {status === "error" ? (
              "Please refresh the page."
            ) : (
              <>
                <span
                  aria-hidden
                  className={
                    "inline-block transition-opacity duration-300 motion-reduce:transition-none" +
                    (isFadingPhrase ? " opacity-0" : " opacity-100")
                  }
                >
                  {FUN_PHRASES[phraseIndex]}
                </span>
                <span className="sr-only">Loading your catalog.</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
