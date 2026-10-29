"use client";

import { Move, Sparkles, Stamp, X } from "lucide-react";

export function ExploreGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section
      role="region"
      aria-label="Quick start guide"
      className="explore-guide pointer-events-auto absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+13rem)] z-30 rounded-2xl border border-white/15 bg-brand-deep/95 p-4 text-white shadow-lift backdrop-blur-md lg:right-auto lg:bottom-6 lg:left-5 lg:w-[22rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[9px] font-bold tracking-[0.22em] text-lime uppercase">
            Quick start
          </p>
          <p className="mt-1 text-sm font-medium">Three ways to explore</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss the quick start guide"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      <ol className="mt-3 grid gap-2 text-[11px] leading-relaxed text-white/75">
        <li className="flex items-start gap-2">
          <Move aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-lime" />
          Drag the joystick or tap the map to move.
        </li>
        <li className="flex items-start gap-2">
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-lime"
          />
          Walk near a glowing shell to collect it.
        </li>
        <li className="flex items-start gap-2">
          <Stamp
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-lime"
          />
          Open a venue and check in for points.
        </li>
      </ol>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-lime px-4 py-2 font-display text-[10px] font-bold tracking-[0.12em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      >
        Start exploring
      </button>
    </section>
  );
}
