"use client";

import { useEffect, useMemo, useState } from "react";

import { SessionCard } from "@/components/sessions/session-card";
import { SessionsNowNext } from "@/components/sessions/sessions-now-next";
import { VENUES, VENUES_BY_ID } from "@/data/venues";
import {
  formatDayShort,
  getProgrammeDayAt,
  groupSessionsByDay,
  PROGRAMME_DAYS,
  SESSIONS,
} from "@/lib/programme";
import { useEventClock } from "@/lib/use-event-clock";
import { cn } from "@/lib/utils";

function dayChipClass(active: boolean): string {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 font-display text-[11px] font-bold tracking-[0.06em] whitespace-nowrap uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
    active
      ? "border-lime bg-lime text-brand-deep"
      : "border-white/20 bg-white/5 text-white/85 hover:border-white/40 hover:bg-white/10 hover:text-white",
  );
}

export function SessionBrowser({
  initialDayId,
  initialVenueId,
  initialSessionId,
}: {
  initialDayId?: string;
  initialVenueId?: string;
  initialSessionId?: string;
}) {
  const initialSession = initialSessionId
    ? SESSIONS.find((session) => session.id === initialSessionId)
    : undefined;
  const initialVenue =
    initialSession?.venueId ??
    (initialVenueId &&
    SESSIONS.some((session) => session.venueId === initialVenueId)
      ? initialVenueId
      : "all");
  const initialDay =
    initialDayId && PROGRAMME_DAYS.some((day) => day.id === initialDayId)
      ? initialDayId
      : "all";

  const hasDeepLink = Boolean(initialDayId || initialVenueId || initialSessionId);
  const now = useEventClock();
  const today = now === null ? undefined : getProgrammeDayAt(now);
  // null until the visitor picks a day. Without a deep link, event days open
  // on today; the client clock is only known after hydration.
  const [dayChoice, setDayChoice] = useState<string | null>(
    hasDeepLink ? initialDay : null,
  );
  const dayId = dayChoice ?? today?.id ?? "all";
  const [venueId, setVenueId] = useState(initialVenue);
  const [query, setQuery] = useState("");

  const venuesWithSessions = useMemo(() => {
    const venueIds = new Set(SESSIONS.map((session) => session.venueId));

    return VENUES.filter((venue) => venueIds.has(venue.id));
  }, []);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return SESSIONS.filter((session) => {
      if (dayId !== "all" && session.dayId !== dayId) {
        return false;
      }

      if (venueId !== "all" && session.venueId !== venueId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const venue = VENUES_BY_ID.get(session.venueId);
      const talks = session.talks.map((talk) => talk.title).join(" ");
      const haystack = [
        session.id,
        session.title,
        session.subtitle,
        session.description,
        venue?.name,
        venue?.mapLabel,
        talks,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [dayId, query, venueId]);

  const groups = useMemo(
    () => groupSessionsByDay(filteredSessions),
    [filteredSessions],
  );

  const hasFilters =
    dayId !== "all" || venueId !== "all" || query.trim().length > 0;
  const resultLabel = `${filteredSessions.length} ${
    filteredSessions.length === 1 ? "session" : "sessions"
  }`;

  useEffect(() => {
    if (!initialSessionId) {
      return;
    }

    // Wait a frame so the opened card is laid out before scrolling to it.
    const frame = requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      document
        .getElementById(`session-${initialSessionId}`)
        ?.scrollIntoView({
          block: "start",
          behavior: reduceMotion ? "auto" : "smooth",
        });
    });

    return () => cancelAnimationFrame(frame);
  }, [initialSessionId]);

  function clearFilters() {
    setDayChoice("all");
    setVenueId("all");
    setQuery("");
  }

  return (
    <div>
      <SessionsNowNext now={now} />

      {/* Day chips stay reachable while scrolling a long list. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-white/10 bg-brand/95 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div
          role="group"
          aria-label="Filter by day"
          className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            aria-pressed={dayId === "all"}
            onClick={() => setDayChoice("all")}
            className={dayChipClass(dayId === "all")}
          >
            All days
          </button>

          {PROGRAMME_DAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={dayId === day.id}
              onClick={() => setDayChoice(day.id)}
              className={dayChipClass(dayId === day.id)}
            >
              {formatDayShort(day)}
              {today?.id === day.id && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px]",
                    dayId === day.id
                      ? "bg-brand-deep text-lime"
                      : "bg-lime text-brand-deep",
                  )}
                >
                  Today
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <section
        aria-label="Session filters"
        className="mt-4 rounded-[2rem] border border-brand-deep/10 bg-lime p-4 text-brand-deep shadow-lift sm:p-6"
      >
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="session-venue-filter"
                className="font-display text-[10px] font-bold tracking-[0.18em] text-brand-deep/75 uppercase"
              >
                Venue
              </label>
              <select
                id="session-venue-filter"
                value={venueId}
                onChange={(event) => setVenueId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-2xl border border-brand-deep/15 bg-cream px-3 py-2 text-sm text-brand-deep shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
              >
                <option value="all">All venues</option>
                {venuesWithSessions.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.mapLabel} · {venue.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="session-search"
                className="font-display text-[10px] font-bold tracking-[0.18em] text-brand-deep/75 uppercase"
              >
                Search
              </label>
              <div className="relative mt-2">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-deep/70"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                {/* Browser extensions can inject a caret-color style before hydration. */}
                <input
                  id="session-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Session, talk, or venue"
                  suppressHydrationWarning
                  className="min-h-11 w-full rounded-2xl border border-brand-deep/15 bg-cream py-2 pr-3 pl-10 text-sm text-brand-deep shadow-sm transition placeholder:text-brand-deep/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-deep/10 pt-4">
          <p role="status" className="text-xs text-brand-deep/75">
            Showing {resultLabel} of {SESSIONS.length} · All times Asia/Kolkata
            (IST)
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-10 rounded-full px-2 font-display text-[10px] font-bold tracking-[0.12em] text-brand-deep/75 uppercase underline decoration-brand-deep/20 underline-offset-4 transition hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {groups.length > 0 ? (
        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <section
              key={group.day.id}
              aria-labelledby={`session-day-${group.day.id}`}
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-white/15 pb-3">
                <h2
                  id={`session-day-${group.day.id}`}
                  className="font-display text-sm font-bold tracking-[0.18em] text-lime uppercase"
                >
                  {group.day.displayDate}
                </h2>
                <span className="shrink-0 text-[11px] text-white/90">
                  {group.sessions.length}{" "}
                  {group.sessions.length === 1 ? "session" : "sessions"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {group.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    defaultOpen={session.id === initialSessionId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-[2rem] border border-dashed border-white/25 bg-brand-deep/25 px-5 py-12 text-center text-white">
          <p className="text-lg font-medium">No sessions match these filters.</p>
          <p className="mt-2 text-sm text-white/90">
            Try a different day, venue, or search term.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-lime px-5 py-2.5 font-display text-xs font-bold tracking-[0.08em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
