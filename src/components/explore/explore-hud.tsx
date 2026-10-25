import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  MapPin,
  Move,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ActionLink } from "@/components/site/action-link";

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid min-w-6 place-items-center rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-display text-[10px] font-bold text-white shadow-sm">
      {children}
    </kbd>
  );
}

function ControlsContent({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <p className="font-display text-[9px] font-bold tracking-[0.24em] text-lime uppercase">
        Explorer controls
      </p>
      <p className="mt-1 text-sm font-medium">Explore the beach</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/60">
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

      <p className="mt-3 max-w-xs text-[10px] leading-relaxed text-white/60 sm:text-[11px]">
        Approach a venue marker and press E or Enter to open its panel and see
        its sessions.
      </p>

      {!compact && (
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/60">
          <Move aria-hidden="true" className="size-3.5 text-lime" />
          The camera follows your character.
        </p>
      )}

      <Link
        href="/sessions"
        className="pointer-events-auto mt-3 inline-flex min-h-10 items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.1em] text-lime uppercase transition hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      >
        Browse the full programme
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>
    </>
  );
}

export function ExploreHud() {
  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-white/15 bg-brand-deep/85 p-2 pr-4 text-white shadow-lift backdrop-blur-md">
          <Link
            href="/"
            aria-label="Back to the GEN M home page"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
          <div className="min-w-0">
            <Image
              src="/images/genm-logo.png"
              alt="GEN M"
              width={512}
              height={177}
              className="h-6 w-auto sm:h-7"
            />
            <p className="mt-1 font-display text-[9px] font-bold tracking-[0.22em] text-lime uppercase">
              Beach Explorer
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <ActionLink href="/sessions" size="sm">
            Programme
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </ActionLink>
          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-brand-deep/75 px-3 py-2 font-display text-[9px] font-bold tracking-[0.16em] text-white/60 uppercase shadow-lift backdrop-blur-md sm:flex">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-lime" />
            Venue map
            <span className="text-white/30">/</span>
            Interactions on
          </div>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <section className="pointer-events-auto hidden max-w-sm rounded-2xl border border-white/15 bg-brand-deep/85 p-4 text-white shadow-lift backdrop-blur-md sm:block">
          <ControlsContent />
        </section>

        <details className="group pointer-events-auto relative max-w-sm sm:hidden">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-white/20 bg-brand-deep/85 px-4 py-2 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase shadow-lift backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime [&::-webkit-details-marker]:hidden">
            <MapPin aria-hidden="true" className="size-3.5" />
            Controls
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="absolute bottom-full left-0 mb-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-white/15 bg-brand-deep/95 p-4 text-white shadow-lift backdrop-blur-md">
            <ControlsContent compact />
          </div>
        </details>

        <p className="hidden max-w-48 rounded-full border border-white/10 bg-brand-deep/65 px-3 py-1.5 text-right text-[10px] leading-relaxed text-white/70 backdrop-blur-sm md:block">
          Camera follows your character. The sea and major structures block
          movement.
        </p>
      </div>
    </>
  );
}
