import Link from "next/link";
import type { ReactNode } from "react";

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid min-w-6 place-items-center rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-white shadow-sm">
      {children}
    </kbd>
  );
}

export function ExploreHud() {
  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0b2f36]/80 p-2 pr-4 text-white shadow-xl backdrop-blur-md">
          <Link
            href="/"
            aria-label="Back to the GEN M home page"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold tracking-[0.3em] text-[#f7c873] uppercase">
              GEN M
            </p>
            <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
              Beach Explorer
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/sessions"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#f7c873] px-3.5 py-2 text-[10px] font-bold tracking-[0.16em] text-[#0b2f36] uppercase shadow-lg transition hover:bg-[#f7c873]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Programme
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-[#0b2f36]/75 px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-white/70 uppercase shadow-lg backdrop-blur-md sm:flex">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[#f7c873]"
            />
            Venue map
            <span className="text-white/35">/</span>
            Interactions on
          </div>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <section className="max-w-sm rounded-2xl border border-white/15 bg-[#0b2f36]/85 p-3.5 text-white shadow-2xl backdrop-blur-md sm:p-4">
          <p className="text-[9px] font-semibold tracking-[0.24em] text-[#f7c873] uppercase">
            Explorer controls
          </p>
          <p className="mt-1 text-sm font-medium">Explore the beach</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/60">
            <Key>W</Key>
            <Key>A</Key>
            <Key>S</Key>
            <Key>D</Key>
            <span className="px-1">or</span>
            <Key>↑</Key>
            <Key>←</Key>
            <Key>↓</Key>
            <Key>→</Key>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-white/60">
            <Key>E</Key>
            <span>or</span>
            <Key>Enter</Key>
            <span>view nearby venue</span>
          </div>

          <p className="mt-2.5 max-w-xs text-[10px] leading-relaxed text-white/50 sm:text-[11px]">
            Approach a venue marker and press E or Enter to open its panel and
            see its sessions.
          </p>

          <Link
            href="/sessions"
            className="pointer-events-auto mt-3 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[#f7c873] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
          >
            Browse the full programme
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <p className="hidden max-w-48 rounded-full border border-white/10 bg-[#0b2f36]/60 px-3 py-1.5 text-right text-[10px] leading-relaxed text-white/45 backdrop-blur-sm md:block">
          Camera follows your character. The sea and major structures block
          movement.
        </p>
      </div>
    </>
  );
}
