import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Sparkles,
} from "lucide-react";

import { ProgrammePreview } from "@/components/home/programme-preview";
import { ActionLink } from "@/components/site/action-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WaveDivider } from "@/components/site/wave-divider";
import { VENUE_MAP } from "@/data/venue-map";
import { VENUES } from "@/data/venues";
import {
  formatDayShort,
  formatProgrammeVerifiedDate,
  PROGRAMME_DAYS,
  PROGRAMME_NOTICE,
  SESSIONS,
  SPEAKERS,
} from "@/lib/programme";
import { formatActiveDays } from "@/lib/venues";
import type { Venue } from "@/types/venue";

export const metadata: Metadata = {
  title: "GENVerse | GEN M Explorer",
  description:
    "Explore the GEN M beach venue, find every stage, and browse the official session programme.",
};

const stageVenues = VENUES.filter((venue) => venue.category === "stage");
const previewVenues = stageVenues.slice(0, 3);
// Everything else worth a direct link: the remaining mapped stages and the
// expo spaces. Facilities are on the map and in its directory.
const alsoOnMap = VENUES.filter(
  (venue) =>
    venue.mapPosition &&
    !previewVenues.includes(venue) &&
    (venue.category === "stage" || venue.category === "expo"),
);
const unmappedStages = stageVenues.filter((venue) => !venue.mapPosition);

function mapObjectPosition(venue: Venue): string | undefined {
  if (!venue.mapPosition) {
    return undefined;
  }

  return `${Math.round(
    (venue.mapPosition.x / VENUE_MAP.image.width) * 100,
  )}% ${Math.round(
    (venue.mapPosition.y / VENUE_MAP.image.height) * 100,
  )}%`;
}

function VenuePreviewCard({ venue }: { venue: Venue }) {
  const activeDays = formatActiveDays(venue.activeDays);
  const objectPosition = mapObjectPosition(venue);

  return (
    <Link
      href={`/explore?venue=${venue.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-brand-deep/40 text-white shadow-soft transition hover:border-lime/45 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 transition duration-700 motion-safe:group-hover:scale-105"
          style={{
            backgroundImage: `url('${VENUE_MAP.image.src}')`,
            backgroundPosition: objectPosition,
            backgroundRepeat: "no-repeat",
            backgroundSize: "240% auto",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(44,45,111,0.08)_0%,rgba(44,45,111,0.86)_100%)]" />
        <span className="absolute top-3 left-3 rounded-full border border-white/20 bg-brand-deep/80 px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase backdrop-blur">
          {venue.mapLabel}
        </span>
        <span className="absolute right-3 bottom-3 rounded-full bg-lime px-2.5 py-1 font-display text-[9px] font-bold tracking-[0.12em] text-brand-deep uppercase">
          Stage
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg leading-snug font-medium">{venue.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/90">
          {venue.description}
        </p>

        {activeDays && (
          <p className="mt-4 inline-flex items-center gap-1.5 font-display text-[10px] font-semibold tracking-[0.08em] text-lime uppercase">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            {activeDays}
          </p>
        )}

        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-display text-[10px] font-bold tracking-[0.14em] text-lime uppercase">
          View on map
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-brand-deep text-white">
      <section className="relative overflow-hidden bg-brand-deep">
        <div aria-hidden="true" className="absolute inset-0">
          <Image
            src={VENUE_MAP.image.src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-[0.14]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(70%_90%_at_30%_20%,rgba(89,100,174,0.55)_0%,rgba(44,45,111,0.2)_55%,rgba(44,45,111,0.95)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(12deg,rgba(64,70,139,0.4)_0%,rgba(44,45,111,0.2)_55%,rgba(75,78,125,0.45)_100%)]" />
          <div className="grain absolute inset-0 opacity-[0.07]" />
        </div>

        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 size-72 rounded-full bg-brand/50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute top-40 -right-24 size-96 rounded-full bg-lime/10 blur-3xl"
        />

        <SiteHeader />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-14 sm:gap-12 sm:px-6 sm:pt-12 sm:pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:pt-16 lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.18em] text-lime uppercase">
              <MapPin aria-hidden="true" className="size-3.5" />
              13–15 November 2026 · Kozhikode Beach
            </p>

            <h1 className="mt-6 max-w-4xl text-balance text-[clamp(3.2rem,7.4vw,6.4rem)] leading-[0.94] font-medium tracking-[-0.02em] text-cream">
              Find your way around the{" "}
              <span className="text-lime">confluence.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
              Walk the detailed beach, find every stage, and plan your day
              with the official GEN M programme.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/explore" size="lg">
                Open the map
                <ArrowRight aria-hidden="true" className="size-4" />
              </ActionLink>
              <ActionLink href="/sessions" variant="outline" size="lg">
                Browse the programme
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </ActionLink>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles aria-hidden="true" className="size-3.5 text-lime" />
                {PROGRAMME_NOTICE} · Verified{" "}
                {formatProgrammeVerifiedDate()}
              </span>
              <span>{SESSIONS.length} sessions</span>
              {SPEAKERS.length > 0 && (
                <span>{SPEAKERS.length} speakers</span>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-brand/35 p-2 shadow-lift">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem]">
                <Image
                  src={VENUE_MAP.image.src}
                  alt="Detailed GEN M beach venue map"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(44,45,111,0.12)_0%,rgba(44,45,111,0.56)_100%)]" />
                <div className="grain absolute inset-0 opacity-[0.08]" />

                <span className="absolute top-[42%] left-[10%] inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-brand-deep/85 px-2.5 py-1.5 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase shadow-lg backdrop-blur">
                  <span className="size-1.5 rounded-full bg-lime" /> S1
                </span>
                <span className="absolute top-[49%] left-[27%] hidden items-center gap-1.5 rounded-full border border-white/20 bg-brand-deep/85 px-2.5 py-1.5 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase shadow-lg backdrop-blur sm:inline-flex">
                  <span className="size-1.5 rounded-full bg-lime" /> S2
                </span>
                <span className="absolute top-[36%] left-[63%] hidden items-center gap-1.5 rounded-full border border-white/20 bg-brand-deep/85 px-2.5 py-1.5 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase shadow-lg backdrop-blur md:inline-flex">
                  <span className="size-1.5 rounded-full bg-lime" /> S3
                </span>
                <span className="absolute top-[54%] left-[88%] inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-brand-deep/85 px-2.5 py-1.5 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase shadow-lg backdrop-blur">
                  <span className="size-1.5 rounded-full bg-lime" /> S5
                </span>

                <span className="absolute bottom-[29%] left-[46%] inline-flex items-center gap-2 rounded-full bg-lime px-2.5 py-1.5 font-display text-[9px] font-bold tracking-[0.1em] text-brand-deep uppercase shadow-lg">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full rounded-full bg-brand-deep/50 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-brand-deep" />
                  </span>
                  You are here
                </span>

                <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/15 bg-brand-deep/85 p-4 backdrop-blur-md sm:inset-x-4 sm:bottom-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-[9px] font-bold tracking-[0.2em] text-lime uppercase">
                      Beach explorer
                    </p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/90">
                      Live map
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-white">
                    Every stage, expo, and facility in one place.
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                    Open the map to walk the beach and open venue details.
                  </p>
                  <Link
                    href="/explore"
                    className="mt-3 inline-flex items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.14em] text-lime uppercase transition hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  >
                    Open full map
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -left-4 hidden w-44 rounded-2xl border border-lime/30 bg-lime p-4 text-brand-deep shadow-lift sm:block">
              <p className="font-display text-[9px] font-bold tracking-[0.18em] uppercase">
                Official programme
              </p>
              <p className="mt-1 font-display text-3xl font-black leading-none">
                {SESSIONS.length}
              </p>
              <p className="mt-1 text-xs text-brand-deep/75">
                sessions across {PROGRAMME_DAYS.length} days
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-y border-white/10 bg-brand">
        <div className="flex overflow-hidden py-3">
          <div className="marquee-track flex w-max">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center gap-8 pr-8 font-display text-xs font-semibold tracking-[0.18em] whitespace-nowrap text-white/90 uppercase"
              >
                {stageVenues.map((venue) => (
                  <span key={`${copy}-${venue.id}`} className="flex items-center gap-3">
                    <span className="text-lime">{venue.mapLabel}</span>
                    {venue.name}
                    <span className="text-white/25">/</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <WaveDivider className="bg-brand text-brand-deep" />

      <section
        id="programme"
        className="relative overflow-hidden bg-brand-deep py-12 text-white sm:py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
                Official schedule
              </p>
              <h2 className="mt-3 text-[clamp(2.8rem,6vw,4.8rem)] leading-none font-medium text-cream">
                Programme
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
                Three days, {SESSIONS.length} sessions, one beach. Open a session
                for its overview, talks, and the official source link.
              </p>
            </div>
            <ActionLink href="/sessions">
              Explore all sessions
              <ArrowRight aria-hidden="true" className="size-4" />
            </ActionLink>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {PROGRAMME_DAYS.map((day) => (
              <Link
                key={day.id}
                href={`/sessions?day=${day.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-lime/40 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                <CalendarDays aria-hidden="true" className="size-3.5 text-lime" />
                {formatDayShort(day)}
              </Link>
            ))}
            <Link
              href="/sessions"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-4 py-2 font-display text-xs font-bold tracking-[0.08em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              All days
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          <ProgrammePreview />
        </div>
      </section>

      <WaveDivider className="bg-brand-deep text-brand" />

      <section
        id="venues"
        className="relative overflow-hidden bg-brand py-12 text-white sm:py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
                Conference stages
              </p>
              <h2 className="mt-3 text-[clamp(2.8rem,6vw,4.8rem)] leading-none font-medium text-cream">
                Venues
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90">
                Explore the stages and spaces around the beach. Each marker opens
                a venue panel with its official sessions.
              </p>
            </div>
            <ActionLink href="/explore">
              Open the venue map
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </ActionLink>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {previewVenues.map((venue) => (
              <VenuePreviewCard key={venue.id} venue={venue} />
            ))}
          </div>

          <div id="expo" className="mt-8 scroll-mt-6">
            <p className="font-display text-[10px] font-bold tracking-[0.18em] text-lime uppercase">
              Also on the map
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {alsoOnMap.map((venue) => (
                <Link
                  key={venue.id}
                  href={`/explore?venue=${venue.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-brand-deep/30 px-4 py-2 text-xs text-white transition hover:border-lime/45 hover:bg-brand-deep/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  <span className="font-display font-bold tracking-[0.08em] text-lime">
                    {venue.mapLabel}
                  </span>
                  {venue.name}
                  {venue.category === "expo" && (
                    <span className="rounded-full bg-lime/15 px-2 py-0.5 font-display text-[9px] font-bold tracking-[0.1em] text-lime uppercase">
                      Expo
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
          {unmappedStages.length > 0 && (
            <p className="mt-4 text-[11px] leading-relaxed text-white/90">
              {unmappedStages
                .map((venue) => `${venue.mapLabel} (${venue.name})`)
                .join(", ")}{" "}
              {unmappedStages.length === 1 ? "has" : "have"} no published map
              location yet, so {unmappedStages.length === 1 ? "it is" : "they are"}{" "}
              not shown on the beach map.
            </p>
          )}
        </div>
      </section>

      <WaveDivider className="bg-brand text-brand-deep" />
      <SiteFooter />
    </main>
  );
}