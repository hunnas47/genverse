import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Search,
  Sparkles,
  Waves,
} from "lucide-react";

import { ActionLink } from "@/components/site/action-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WaveDivider } from "@/components/site/wave-divider";
import { VENUE_MAP } from "@/data/venue-map";
import { VENUES, VENUES_BY_ID } from "@/data/venues";
import {
  formatDayShort,
  formatProgrammeVerifiedDate,
  formatSessionTimeRange,
  getSessionSpeakers,
  isMalayalam,
  PROGRAMME_DAYS,
  PROGRAMME_NOTICE,
  PROGRAMME_SOURCE,
  SESSIONS,
  SPEAKERS,
} from "@/lib/programme";
import { formatActiveDays } from "@/lib/venues";
import type { Session } from "@/types/session";
import type { Venue } from "@/types/venue";

export const metadata: Metadata = {
  title: "GENVerse | GEN M Explorer",
  description:
    "Explore the GEN M beach venue, find every stage, and browse the official session programme.",
};

const stageVenues = VENUES.filter((venue) => venue.category === "stage");
const mapVenues = VENUES.filter((venue) => venue.mapPosition);
const previewVenues = stageVenues.slice(0, 3);
const previewSessions = PROGRAMME_DAYS.flatMap((day) => {
  const session = SESSIONS.find((item) => item.dayId === day.id);
  return session ? [session] : [];
});

const stats = [
  {
    value: `${SESSIONS.length}`,
    label: "Sessions",
    note: "Official programme",
  },
  ...(SPEAKERS.length > 0
    ? [
        {
          value: `${SPEAKERS.length}`,
          label: "Speakers",
          note: "Across all sessions",
        },
      ]
    : []),
  {
    value: `${stageVenues.length}`,
    label: "Stages",
    note: "S1–S7",
  },
  {
    value: `${mapVenues.length}`,
    label: "Map markers",
    note: "Stages, expo & facilities",
  },
];

const features = [
  {
    icon: MapPin,
    title: "Venue map",
    description:
      "Walk the illustrated beach and open any stage, expo, or facility.",
  },
  {
    icon: CalendarDays,
    title: "Official programme",
    description:
      "Every session with its time, venue, overview, and official source link.",
  },
  {
    icon: Search,
    title: "Find anything",
    description:
      "Filter by day or venue, then search titles, descriptions, and talks.",
  },
  {
    icon: Waves,
    title: "Beach-ready",
    description:
      "A responsive layout designed for desktop, tablet, and phone screens.",
  },
] as const;

const planCards = [
  {
    icon: CalendarDays,
    title: "Official programme",
    description: `Browse all ${SESSIONS.length} sessions, open session details, and link each session back to its venue.`,
    href: "/sessions",
    label: "Open programme",
  },
  {
    icon: MapPin,
    title: "Find your venue",
    description:
      "Jump from any session to the beach map and focus the matching venue marker.",
    href: "/explore",
    label: "Open the map",
  },
  {
    icon: Search,
    title: "Plan by day",
    description:
      "Filter the programme by day, venue, or search term to build your own route.",
    href: "/sessions",
    label: "Start filtering",
  },
  {
    icon: Sparkles,
    title: "Source-checked",
    description: `Programme data was verified against the official GEN M site on ${formatProgrammeVerifiedDate()}.`,
    href: PROGRAMME_SOURCE,
    label: "Official source",
    external: true,
  },
] as const;

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

function sessionSummary(session: Session): string | null {
  const speakers = getSessionSpeakers(session);

  if (speakers.length > 0) {
    const names = speakers.slice(0, 2).map((speaker) => speaker.name);
    const remaining = speakers.length - names.length;

    return remaining > 0
      ? `${names.join(", ")} +${remaining} more`
      : names.join(", ");
  }

  return session.description ?? null;
}

function ProgrammePreviewCard({ session }: { session: Session }) {
  const venue = VENUES_BY_ID.get(session.venueId);
  const day = PROGRAMME_DAYS.find((item) => item.id === session.dayId);
  const summary = sessionSummary(session);

  return (
    <Link
      href={`/sessions?session=${session.id}`}
      className="group flex flex-col rounded-3xl border border-white/10 bg-cream p-5 text-brand-deep shadow-soft transition hover:border-lime/60 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-safe:hover:-translate-y-1"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-brand-deep px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase">
          {venue?.mapLabel ?? session.venueId}
        </span>
        <span className="font-display text-[10px] font-semibold tracking-[0.12em] text-brand-deep/70 uppercase">
          {day ? formatDayShort(day) : session.day}
        </span>
      </div>

      <h3
        lang={isMalayalam(session.title) ? "ml" : undefined}
        className="mt-4 text-balance text-lg leading-snug font-medium"
      >
        {session.title}
      </h3>
      <p className="mt-1 text-xs font-medium text-brand-deep/70">
        {venue?.name ?? "Venue to be announced"}
      </p>

      <p className="mt-4 font-display text-xs font-semibold tracking-[0.08em] text-brand-deep/70 uppercase">
        {formatSessionTimeRange(session)}
      </p>
      {summary && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-brand-deep/75">
          {summary}
        </p>
      )}

      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-display text-[10px] font-bold tracking-[0.14em] uppercase">
        View session
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
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

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:pt-16 lg:pb-28">
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

      <WaveDivider className="bg-brand-deep text-lime" />

      <section className="relative overflow-hidden bg-lime text-brand-deep">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-display text-[10px] font-bold tracking-[0.22em] text-brand-deep/75 uppercase">
                The confluence at a glance
              </p>
              <h2 className="mt-2 max-w-xl text-balance text-3xl leading-tight font-medium sm:text-4xl">
                Everything you need for three days at the beach.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-brand-deep/75">
              {PROGRAMME_NOTICE} verified {formatProgrammeVerifiedDate()}. The
              map covers stages, expo spaces, and visitor facilities.
            </p>
          </div>

          <dl
            className={`mt-10 grid grid-cols-2 gap-3 sm:gap-4 ${
              stats.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
            }`}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-brand-deep/10 bg-white/30 p-5 sm:p-6"
              >
                <dt className="font-display text-[10px] font-bold tracking-[0.18em] text-brand-deep/75 uppercase">
                  {stat.label}
                </dt>
                <dd className="mt-2 font-display text-[clamp(3rem,7vw,5.5rem)] leading-none font-black tracking-tight">
                  {stat.value}
                </dd>
                <p className="mt-2 text-[11px] text-brand-deep/75">
                  {stat.note}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <WaveDivider className="bg-lime text-brand" />

      <section className="relative overflow-hidden bg-brand py-16 text-white lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
              Who we are?
            </p>
            <h2 className="mt-3 text-balance text-[clamp(2.6rem,5vw,4.4rem)] leading-[1.02] font-medium text-cream">
              Your day, mapped.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90">
              GEN M Explorer is a visual guide to the beach confluence. Walk the
              detailed venue map, open any stage, and jump straight into the
              official programme. No printed map folding required.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/explore" variant="cream">
                Explore the venue map
                <ArrowRight aria-hidden="true" className="size-4" />
              </ActionLink>
              <ActionLink href="/sessions" variant="outline">
                Discover the programme
                <ArrowRight aria-hidden="true" className="size-4" />
              </ActionLink>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/15 bg-brand-deep/25 p-5 backdrop-blur-sm transition hover:bg-brand-deep/35"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-lime text-brand-deep">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-xs font-bold tracking-[0.14em] text-white uppercase">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/90">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <WaveDivider className="bg-brand text-brand-deep" />

      <section
        id="programme"
        className="relative overflow-hidden bg-brand-deep py-16 text-white lg:py-24"
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
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-lime/40 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                <CalendarDays aria-hidden="true" className="size-3.5 text-lime" />
                {formatDayShort(day)}
              </Link>
            ))}
            <Link
              href="/sessions"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-lime px-4 py-2 font-display text-xs font-bold tracking-[0.08em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              All days
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {previewSessions.map((session) => (
              <ProgrammePreviewCard key={session.id} session={session} />
            ))}
          </div>

          <p className="mt-4 text-xs text-white/60">
            Showing one session from each day. All times are event-local
            (Asia/Kolkata, IST).
          </p>
        </div>
      </section>

      <WaveDivider className="bg-brand-deep text-brand" />

      <section
        id="venues"
        className="relative overflow-hidden bg-brand py-16 text-white lg:py-24"
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-xs text-white/90">Also on the map:</p>
            <span className="rounded-full border border-white/10 bg-brand-deep/25 px-3 py-1.5 text-[11px] text-white/90">
              S4 · GEN M UNPLUGGED
            </span>
            <span className="rounded-full border border-white/10 bg-brand-deep/25 px-3 py-1.5 text-[11px] text-white/90">
              S6 · KIDZVERSE
            </span>
            <span className="rounded-full border border-white/10 bg-brand-deep/25 px-3 py-1.5 text-[11px] text-white/90">
              Expo &amp; facilities
            </span>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/90">
            S7 (NOORVERSE) has no published map location yet, so it is not shown
            on the beach map.
          </p>
        </div>
      </section>

      <WaveDivider className="bg-brand text-brand-deep" />

      <section
        id="expo"
        className="relative overflow-hidden bg-brand-deep py-16 text-white lg:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
          <div>
            <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
              Interactive experience
            </p>
            <h2 className="mt-3 font-display text-[clamp(3rem,9vw,7rem)] leading-none font-black tracking-tight text-lime">
              GEN M EXPO
            </h2>
            <p className="mt-4 max-w-xl text-2xl leading-tight font-medium text-cream sm:text-3xl">
              Step inside the expo.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
              The expo spaces are part of the beach map. Find them alongside the
              stages and facilities, then open a marker to see what is nearby.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/explore?venue=a1">
                Find the expo
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </ActionLink>
              <ActionLink href="/sessions" variant="outline">
                Browse sessions
                <ArrowRight aria-hidden="true" className="size-4" />
              </ActionLink>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-brand p-6 shadow-lift">
              <div
                aria-hidden="true"
                className="absolute -top-10 -right-10 size-40 rounded-full bg-lime/20 blur-2xl"
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="rounded-full border border-lime/20 bg-brand-deep/60 px-3 py-1.5 font-display text-[10px] font-bold tracking-[0.18em] text-lime uppercase">
                  On the map
                </span>
                <Waves aria-hidden="true" className="size-5 text-lime" />
              </div>
              <p className="relative mt-10 font-display text-6xl leading-none font-black text-cream">
                A1
              </p>
              <p className="relative mt-3 text-lg font-medium text-white">
                Lost City Expo
              </p>
              <p className="relative mt-2 text-sm leading-relaxed text-white/90">
                An expo tent on the beach map. Open the marker on the beach to
                explore the surrounding spaces.
              </p>
              <div className="relative mt-6 flex items-center gap-2 text-xs text-white/90">
                <MapPin aria-hidden="true" className="size-3.5 text-lime" />
                On the beach map
              </div>
            </div>

            <div className="absolute -right-3 -bottom-5 hidden rounded-2xl border border-lime/30 bg-lime px-4 py-3 text-brand-deep shadow-lift sm:block">
              <p className="font-display text-[9px] font-bold tracking-[0.18em] uppercase">
                Also on the map
              </p>
              <p className="mt-1 text-sm font-medium">Edu Expo · A3</p>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider className="bg-brand-deep text-brand" />

      <section className="relative overflow-hidden bg-brand py-16 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
            <div>
              <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
                Long-term horizon
              </p>
              <h2 className="mt-3 text-balance text-[clamp(2.6rem,5vw,4.4rem)] leading-[1.02] font-medium text-cream">
                Beyond the map.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/90">
                Use the programme and the map together: find a session, open its
                venue, and plan a route across the beach. The explorer keeps the
                official schedule within reach.
              </p>
              <ActionLink href="/sessions" variant="cream" className="mt-7">
                Plan your day
                <ArrowRight aria-hidden="true" className="size-4" />
              </ActionLink>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[2rem] border border-lime/20 bg-brand-deep p-6 shadow-lift sm:col-span-2">
                <p className="font-display text-[10px] font-bold tracking-[0.2em] text-lime uppercase">
                  The beach explorer
                </p>
                <h3 className="mt-3 text-balance text-2xl leading-tight font-medium text-cream sm:text-3xl">
                  One map. Three days. Every stage.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
                  The official programme is the backbone; the venue map is the
                  way in. Use both to move from a session title to a place on the
                  beach.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="font-display text-3xl leading-none font-black text-lime">
                      {SESSIONS.length}
                    </p>
                    <p className="mt-1 text-[11px] text-white/70">Sessions</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="font-display text-3xl leading-none font-black text-lime">
                      {mapVenues.length}
                    </p>
                    <p className="mt-1 text-[11px] text-white/70">Map markers</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="font-display text-3xl leading-none font-black text-lime">
                      {stageVenues.length}
                    </p>
                    <p className="mt-1 text-[11px] text-white/70">Stages</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="font-display text-3xl leading-none font-black text-lime">
                      {PROGRAMME_DAYS.length}
                    </p>
                    <p className="mt-1 text-[11px] text-white/70">Days</p>
                  </div>
                </div>
              </div>

              {planCards.map((card) => {
                const Icon = card.icon;
                const className =
                  "group flex flex-col rounded-3xl border border-brand-deep/10 bg-lavender p-5 text-brand-deep transition hover:border-brand-deep/20 hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-safe:hover:-translate-y-1";

                const content = (
                  <>
                    <Icon aria-hidden="true" className="size-5 text-brand" />
                    <h3 className="mt-4 font-display text-xs font-bold tracking-[0.14em] uppercase">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-brand-deep/75">
                      {card.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-display text-[10px] font-bold tracking-[0.14em] uppercase">
                      {card.label}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                  </>
                );

                if ("external" in card && card.external) {
                  return (
                    <a
                      key={card.title}
                      href={card.href}
                      target="_blank"
                      rel="noreferrer"
                      className={className}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <Link key={card.title} href={card.href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <WaveDivider className="bg-brand text-brand-deep" />
      <SiteFooter />
    </main>
  );
}
