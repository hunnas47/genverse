import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SessionsPageContent } from "@/components/sessions/sessions-page-content";
import { VENUES } from "@/data/venues";
import {
  formatProgrammeVerifiedDate,
  PROGRAMME_DAYS,
  PROGRAMME_NOTICE,
  PROGRAMME_SOURCE,
  SESSIONS,
} from "@/lib/programme";
import type { SearchParams } from "@/types/search";

export const metadata: Metadata = {
  title: "Programme | GEN M",
  description:
    "Browse the official GEN M session programme by day, venue, and speaker, then locate each venue on the beach map.",
};

function SessionsLoading() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="h-44 rounded-3xl bg-white/60 motion-safe:animate-pulse" />
      <div className="h-32 rounded-2xl bg-white/60 motion-safe:animate-pulse" />
      <div className="h-32 rounded-2xl bg-white/60 motion-safe:animate-pulse" />
    </div>
  );
}

export default function SessionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const stageCount = VENUES.filter(
    (venue) => venue.category === "stage",
  ).length;

  return (
    <main className="min-h-dvh bg-[#f5efe2] text-[#0b2f36]">
      <header className="relative overflow-hidden bg-[#0b2f36] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(247,200,115,0.22),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(232,106,74,0.18),transparent_40%)]"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          <nav
            aria-label="Programme navigation"
            className="flex items-center justify-between gap-3"
          >
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
            >
              <span aria-hidden="true">←</span>
              GEN M
            </Link>
            <Link
              href="/explore"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#f7c873] px-3.5 py-2 text-xs font-bold text-[#0b2f36] transition hover:bg-[#f7c873]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Open the map
              <span aria-hidden="true">↗</span>
            </Link>
          </nav>

          <div className="mt-8 max-w-3xl sm:mt-12">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#f7c873] uppercase">
              13–15 November 2026 · Kozhikode Beach
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Programme
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              Browse the official sessions by day, venue, or speaker. Open a
              session for the full speaker list, then locate its venue on the
              beach map.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
            <span className="rounded-full bg-[#f7c873] px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-[#0b2f36] uppercase">
              Official programme
            </span>
            <span>
              {PROGRAMME_NOTICE} · Verified {formatProgrammeVerifiedDate()}
            </span>
            <span className="text-white/25">/</span>
            <span>{SESSIONS.length} sessions</span>
            <span className="text-white/25">/</span>
            <span>{PROGRAMME_DAYS.length} days</span>
            <span className="text-white/25">/</span>
            <span>{stageCount} stages</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={<SessionsLoading />}>
          <SessionsPageContent searchParams={searchParams} />
        </Suspense>
      </div>

      <footer className="border-t border-[#0b2f36]/10">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-[11px] leading-relaxed text-[#0b2f36]/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Session information is taken from the official GEN M programme.
            Times are event-local (Asia/Kolkata).
          </p>
          <a
            href={PROGRAMME_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-semibold text-[#0b2f36]/60 underline decoration-[#0b2f36]/20 underline-offset-2 transition hover:text-[#0b2f36]"
          >
            Official source ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
