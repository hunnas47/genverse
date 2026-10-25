"use client";

import { useMemo, useState } from "react";

import { SessionCard } from "@/components/sessions/session-card";
import { VENUES, VENUES_BY_ID } from "@/data/venues";
import {
  formatDayShort,
  getSessionSpeakers,
  groupSessionsByDay,
  PROGRAMME_DAYS,
  SESSIONS,
} from "@/lib/programme";

export function SessionBrowser({
  initialVenueId,
  initialSessionId,
}: {
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

  const [dayId, setDayId] = useState("all");
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
      const speakers = getSessionSpeakers(session)
        .map((speaker) => speaker.name)
        .join(" ");
      const talks = session.talks.map((talk) => talk.title).join(" ");
      const haystack = [
        session.id,
        session.title,
        session.subtitle,
        session.description,
        venue?.name,
        venue?.mapLabel,
        speakers,
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

  function clearFilters() {
    setDayId("all");
    setVenueId("all");
    setQuery("");
  }

  return (
    <div>
      <section
        aria-label="Session filters"
        className="rounded-3xl border border-[#0b2f36]/10 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#0b2f36]/45 uppercase">
              Day
            </p>
            <div
              role="group"
              aria-label="Filter by day"
              className="mt-2 flex flex-wrap gap-2"
            >
              <button
                type="button"
                aria-pressed={dayId === "all"}
                onClick={() => setDayId("all")}
                className={
                  dayId === "all"
                    ? "min-h-10 rounded-full border border-[#0b2f36] bg-[#0b2f36] px-3.5 py-2 text-xs font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
                    : "min-h-10 rounded-full border border-[#0b2f36]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#0b2f36]/70 transition hover:border-[#0b2f36]/30 hover:text-[#0b2f36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
                }
              >
                All days
              </button>

              {PROGRAMME_DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  aria-pressed={dayId === day.id}
                  onClick={() => setDayId(day.id)}
                  className={
                    dayId === day.id
                      ? "min-h-10 rounded-full border border-[#0b2f36] bg-[#0b2f36] px-3.5 py-2 text-xs font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
                      : "min-h-10 rounded-full border border-[#0b2f36]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#0b2f36]/70 transition hover:border-[#0b2f36]/30 hover:text-[#0b2f36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
                  }
                >
                  {formatDayShort(day)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <label
                htmlFor="session-venue-filter"
                className="text-[10px] font-bold tracking-[0.18em] text-[#0b2f36]/45 uppercase"
              >
                Venue
              </label>
              <select
                id="session-venue-filter"
                value={venueId}
                onChange={(event) => setVenueId(event.target.value)}
                className="mt-2 min-h-10 w-full rounded-xl border border-[#0b2f36]/15 bg-white px-3 py-2 text-sm text-[#0b2f36] shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
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
                className="text-[10px] font-bold tracking-[0.18em] text-[#0b2f36]/45 uppercase"
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
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#0b2f36]/35"
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
                  placeholder="Session, speaker, or venue"
                  suppressHydrationWarning
                  className="min-h-10 w-full rounded-xl border border-[#0b2f36]/15 bg-white py-2 pr-3 pl-10 text-sm text-[#0b2f36] shadow-sm transition placeholder:text-[#0b2f36]/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#0b2f36]/10 pt-3">
          <p role="status" className="text-xs text-[#0b2f36]/55">
            Showing {resultLabel} of {SESSIONS.length} · All times Asia/Kolkata
            (IST)
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-10 rounded-full px-2 text-xs font-semibold text-[#0b2f36]/60 underline decoration-[#0b2f36]/20 underline-offset-2 transition hover:text-[#0b2f36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {groups.length > 0 ? (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <section
              key={group.day.id}
              aria-labelledby={`session-day-${group.day.id}`}
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-[#0b2f36]/10 pb-2">
                <h2
                  id={`session-day-${group.day.id}`}
                  className="text-sm font-bold tracking-[0.16em] text-[#0b2f36]/60 uppercase"
                >
                  {group.day.displayDate}
                </h2>
                <span className="shrink-0 text-[11px] text-[#0b2f36]/40">
                  {group.sessions.length}{" "}
                  {group.sessions.length === 1 ? "session" : "sessions"}
                </span>
              </div>

              <div className="mt-3 space-y-3">
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
        <div className="mt-6 rounded-3xl border border-dashed border-[#0b2f36]/20 bg-white/60 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-[#0b2f36]">
            No sessions match these filters.
          </p>
          <p className="mt-1 text-xs text-[#0b2f36]/55">
            Try a different day, venue, or search term.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 min-h-10 rounded-full bg-[#0b2f36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0b2f36]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2f36]"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
