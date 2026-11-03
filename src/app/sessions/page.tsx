import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { Suspense } from "react";

import { ActionLink } from "@/components/site/action-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WaveDivider } from "@/components/site/wave-divider";
import { SessionsPageContent } from "@/components/sessions/sessions-page-content";
import { VENUES } from "@/data/venues";
import {
  formatProgrammeVerifiedDate,
  PROGRAMME_DAYS,
  PROGRAMME_NOTICE,
  PROGRAMME_SOURCE,
  SESSIONS,
  SPEAKERS,
} from "@/lib/programme";
import type { SearchParams } from "@/types/search";

export const metadata: Metadata = {
  title: "Programme | GEN M Explorer",
  description:
    "Browse the official GEN M session programme by day and venue, then locate each venue on the beach map.",
};

function SessionsLoading() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="h-44 rounded-[2rem] bg-lime/30 motion-safe:animate-pulse" />
      <div className="h-32 rounded-3xl bg-white/10 motion-safe:animate-pulse" />
      <div className="h-32 rounded-3xl bg-white/10 motion-safe:animate-pulse" />
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
  const mapMarkerCount = VENUES.filter((venue) => venue.mapPosition).length;

  const stats = [
    { value: SESSIONS.length, label: "sessions" },
    ...(SPEAKERS.length > 0
      ? [{ value: SPEAKERS.length, label: "speakers" }]
      : []),
    { value: stageCount, label: "stages" },
    { value: mapMarkerCount, label: "map markers" },
  ];

  return (
    <main className="min-h-dvh overflow-hidden bg-brand text-white">
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_100%_at_20%_0%,rgba(89,100,174,0.6)_0%,rgba(44,45,111,0.15)_55%,rgba(44,45,111,0.95)_100%)]" />
          <div className="grain absolute inset-0 opacity-[0.06]" />
        </div>
        <div
          aria-hidden="true"
          className="absolute -top-24 right-0 size-80 rounded-full bg-lime/10 blur-3xl"
        />

        <SiteHeader />

        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16 lg:pb-20">
          <div className="max-w-3xl">
            <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
              Official schedule
            </p>
            <h1 className="mt-3 text-[clamp(3.2rem,8vw,6.5rem)] leading-[0.94] font-medium tracking-[-0.02em] text-cream">
              Programme
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              Browse every official session by day or venue, then search titles,
              descriptions, and talks. Open a session for its overview, talks,
              and official source link, then locate its venue on the beach map.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ActionLink href="/explore">
              Open the map
              <ArrowRight aria-hidden="true" className="size-4" />
            </ActionLink>
            <ActionLink
              href={PROGRAMME_SOURCE}
              variant="outline"
              external
            >
              Official source
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </ActionLink>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {stats.map((stat) => (
              <span
                key={stat.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/60"
              >
                <span className="font-display text-sm font-bold text-lime">
                  {stat.value}
                </span>
                {stat.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/10 px-3 py-1.5 text-xs text-lime/80">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              {PROGRAMME_DAYS.length} days
            </span>
          </div>

          <p className="mt-4 text-[11px] text-white/60">
            {PROGRAMME_NOTICE} · Verified {formatProgrammeVerifiedDate()} · All
            times Asia/Kolkata (IST)
          </p>
        </div>
      </section>

      <WaveDivider className="bg-brand-deep text-brand" />

      <section className="bg-brand pt-2 pb-16 text-white sm:pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<SessionsLoading />}>
            <SessionsPageContent searchParams={searchParams} />
          </Suspense>
        </div>
      </section>

      <WaveDivider className="bg-brand text-brand-deep" />
      <SiteFooter />
    </main>
  );
}
