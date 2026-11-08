"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

import { VENUE_MAP, getVenueAccent } from "@/data/venue-map";
import { VENUES_BY_ID } from "@/data/venues";
import {
  formatDayShort,
  formatSessionTimeRange,
  getNowAndNext,
  getProgrammeDay,
  getProgrammeDayAt,
  getSessionSpeakers,
  isAllCapsTitle,
  isMalayalam,
  PROGRAMME_DAYS,
  SESSIONS,
} from "@/lib/programme";
import { useEventClock } from "@/lib/use-event-clock";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/session";

const ONE_PER_DAY = PROGRAMME_DAYS.flatMap((day) => {
  const session = SESSIONS.find((item) => item.dayId === day.id);
  return session ? [session] : [];
});

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

function ProgrammePreviewCard({
  session,
  live,
}: {
  session: Session;
  live: boolean;
}) {
  const venue = VENUES_BY_ID.get(session.venueId);
  const day = getProgrammeDay(session.dayId);
  const summary = sessionSummary(session);
  const accent = venue ? getVenueAccent(venue) : null;
  const mapPosition = venue?.mapPosition;

  return (
    <Link
      href={`/sessions?session=${session.id}`}
      style={
        accent ? ({ "--venue-accent": accent.css } as CSSProperties) : undefined
      }
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-cream p-5 pt-6 text-brand-deep shadow-soft transition hover:border-lime/60 hover:shadow-lift focus-visible:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-safe:hover:-translate-y-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-[var(--venue-accent,var(--brand-soft))]"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[var(--venue-accent,var(--brand-deep))] px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.12em] text-brand-deep uppercase ring-1 ring-brand-deep/10">
          {venue?.mapLabel ?? session.venueId}
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.12em] text-brand-deep uppercase">
            <span className="size-1.5 rounded-full bg-brand-deep motion-safe:animate-pulse" />
            Now
          </span>
        ) : (
          <span className="font-display text-[11px] font-semibold tracking-[0.12em] text-brand-deep/70 uppercase">
            {day ? formatDayShort(day) : session.day}
          </span>
        )}
      </div>

      <h3
        lang={isMalayalam(session.title) ? "ml" : undefined}
        className={cn(
          "mt-4 text-balance leading-snug font-medium",
          isAllCapsTitle(session.title)
            ? "text-base tracking-[0.01em]"
            : "text-lg",
        )}
      >
        {session.title}
      </h3>
      <p className="mt-1 text-xs font-medium text-brand-deep/70">
        {venue?.name ?? "Venue to be announced"}
      </p>

      <p className="mt-4 font-display text-xs font-semibold tracking-[0.08em] text-brand-deep/70 uppercase">
        {formatSessionTimeRange(session)}
      </p>
      {summary ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-brand-deep/75">
          {summary}
        </p>
      ) : (
        mapPosition && (
          // No published description: show where the session happens instead
          // of leaving a blank card.
          <div
            aria-hidden="true"
            className="relative mt-4 h-20 overflow-hidden rounded-2xl ring-1 ring-brand-deep/10"
          >
            {/* Translate by the venue's fraction of the image so the venue
                sits exactly at the strip's center. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative crop of an already-loaded asset */}
            <img
              src={VENUE_MAP.image.previewSrc}
              alt=""
              loading="lazy"
              className="absolute top-1/2 left-1/2 w-[260%] max-w-none transition duration-700 motion-safe:group-hover:scale-105"
              style={{
                transform: `translate(-${((mapPosition.x / VENUE_MAP.image.width) * 100).toFixed(2)}%, -${((mapPosition.y / VENUE_MAP.image.height) * 100).toFixed(2)}%)`,
                transformOrigin: `${((mapPosition.x / VENUE_MAP.image.width) * 100).toFixed(2)}% ${((mapPosition.y / VENUE_MAP.image.height) * 100).toFixed(2)}%`,
              }}
            />
            <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--venue-accent,var(--lime))] shadow" />
          </div>
        )
      )}

      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-display text-[11px] font-bold tracking-[0.14em] uppercase">
        View session
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

/**
 * One session per day before and after the event. On 13–15 Nov (IST) it
 * switches to what is running now and what starts next, once the client clock
 * is known.
 */
export function ProgrammePreview() {
  const now = useEventClock();
  const today = now === null ? undefined : getProgrammeDayAt(now);
  const nowNext = now !== null && today ? getNowAndNext(now, 3) : null;
  const liveIds = new Set(nowNext?.now.map((session) => session.id));
  const eventSessions = nowNext
    ? [...nowNext.now, ...nowNext.next].slice(0, 3)
    : [];
  const sessions = eventSessions.length > 0 ? eventSessions : ONE_PER_DAY;

  return (
    <>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {sessions.map((session) => (
          <ProgrammePreviewCard
            key={session.id}
            session={session}
            live={liveIds.has(session.id)}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-white/60">
        {eventSessions.length > 0
          ? "Happening now and next."
          : "Showing one session from each day."}{" "}
        All times are event-local (Asia/Kolkata, IST).
      </p>
    </>
  );
}
