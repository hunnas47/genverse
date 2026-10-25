import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { VENUES } from "@/data/venues";
import {
  formatProgrammeVerifiedDate,
  PROGRAMME_DAYS,
  PROGRAMME_NOTICE,
  PROGRAMME_SOURCE,
  SESSIONS,
} from "@/lib/programme";

export const metadata: Metadata = {
  title: "GEN M Explorer",
  description:
    "Explore the GEN M beach venue and browse the official session programme.",
};

export default function Home() {
  const stageCount = VENUES.filter(
    (venue) => venue.category === "stage",
  ).length;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0b2f36] text-white">
      <div className="absolute inset-0">
        <Image
          src="/images/GEN-M-venue-map.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,47,54,0.55)_0%,rgba(11,47,54,0.82)_55%,#0b2f36_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.3em] text-[#f7c873] uppercase">
              GEN M
            </p>
            <p className="mt-1 text-sm font-semibold">
              Generational Student Confluence
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
          >
            Open map
            <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16 sm:py-24">
          <p className="text-[10px] font-semibold tracking-[0.24em] text-[#f7c873] uppercase">
            13–15 November 2026 · Kozhikode Beach
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Find your way around GEN M.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
            Explore the beach venue, discover the stages and expo spaces, and
            browse the official session programme.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/explore"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f7c873] px-5 py-3 text-sm font-bold text-[#0b2f36] transition hover:bg-[#f7c873]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore the venue map
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/sessions"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
            >
              Browse sessions
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#f7c873] uppercase">
                Programme
              </p>
              <p className="mt-1 text-sm font-semibold">
                {SESSIONS.length} sessions · {PROGRAMME_DAYS.length} days
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                {PROGRAMME_NOTICE} · Verified {formatProgrammeVerifiedDate()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#f7c873] uppercase">
                Venue map
              </p>
              <p className="mt-1 text-sm font-semibold">
                {stageCount} stages · expo &amp; facilities
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                Walk the illustrated beach and open venue panels.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-[9px] font-semibold tracking-[0.2em] text-[#f7c873] uppercase">
                Plan your day
              </p>
              <p className="mt-1 text-sm font-semibold">
                Filter by day, venue, or speaker
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                Session times are event-local (Asia/Kolkata).
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 pt-5 text-[11px] leading-relaxed text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Session information is from the official GEN M website. Venue map
            labels come from the supplied artwork.
          </p>
          <a
            href={PROGRAMME_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-semibold text-white/55 underline decoration-white/20 underline-offset-2 transition hover:text-white"
          >
            genm.in ↗
          </a>
        </footer>
      </div>
    </main>
  );
}
