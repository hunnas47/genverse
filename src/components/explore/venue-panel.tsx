"use client";

import { ArrowUpRight, MapPin, X } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useRef } from "react";

import {
  formatSessionTimeRange,
  getSessionSpeakers,
  getSessionsForVenue,
  groupSessionsByDay,
  isMalayalam,
} from "@/lib/programme";
import { formatActiveDays, VENUE_CATEGORY_LABELS } from "@/lib/venues";
import type { Venue } from "@/types/venue";

export const VenuePanel = memo(function VenuePanel({
  venue,
  onClose,
}: {
  venue: Venue;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = `venue-panel-title-${venue.id}`;
  const activeDays = formatActiveDays(venue.activeDays);
  const sessions = getSessionsForVenue(venue.id);
  const sessionGroups = groupSessionsByDay(sessions);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="pointer-events-none absolute inset-0 z-30"
    >
      <div className="pointer-events-auto absolute inset-x-3 bottom-3 max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain rounded-[2rem] border border-brand-deep/15 bg-cream p-5 text-brand-deep shadow-lift sm:inset-x-auto sm:top-24 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-12rem)] sm:w-[400px] sm:p-6">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-brand-deep/20 sm:hidden"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-deep px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase">
                {VENUE_CATEGORY_LABELS[venue.category]}
              </span>
              <span className="font-display text-[10px] font-bold tracking-[0.2em] text-brand-deep/70 uppercase">
                {venue.mapLabel}
              </span>
            </div>

            <h2
              id={titleId}
              className="mt-3 text-balance text-xl leading-tight font-medium sm:text-2xl"
            >
              {venue.name}
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close venue details"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-deep/10 text-brand-deep/70 transition hover:bg-brand-deep/15 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <p className="mt-4 rounded-2xl border border-brand-deep/10 bg-brand-deep/5 px-3.5 py-2.5 text-[11px] leading-relaxed text-brand-deep/75">
          {venue.verification === "official"
            ? "Official venue information verified from the GEN M website."
            : "Label from the supplied venue map. Official details are not verified yet."}
        </p>

        {venue.description && (
          <p className="mt-4 text-sm leading-relaxed text-brand-deep/75">
            {venue.description}
          </p>
        )}

        {activeDays && (
          <div className="mt-4">
            <p className="font-display text-[9px] font-bold tracking-[0.22em] text-brand-deep/70 uppercase">
              Programme days
            </p>
            <p className="mt-1 text-sm text-brand-deep/80">{activeDays}</p>
          </div>
        )}

        {venue.note && (
          <p className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 px-3.5 py-2.5 text-[11px] leading-relaxed text-brand-deep/70">
            {venue.note}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-brand-deep/10 bg-brand-deep/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[9px] font-bold tracking-[0.22em] text-brand-deep/70 uppercase">
              Sessions
            </p>
            {sessions.length > 0 && (
              <span className="font-display text-[10px] font-bold text-brand-deep/70">
                {sessions.length}
              </span>
            )}
          </div>

          {sessions.length === 0 ? (
            <p className="mt-1 text-xs leading-relaxed text-brand-deep/75">
              {venue.verification === "official"
                ? "No official sessions are listed for this venue."
                : "This map facility does not have a published session programme."}
            </p>
          ) : (
            <div className="mt-2 space-y-4">
              {sessionGroups.map((group) => (
                <div key={group.day.id}>
                  <p className="font-display text-[10px] font-bold tracking-[0.08em] text-brand-deep/70 uppercase">
                    {group.day.displayDate}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {group.sessions.map((session) => {
                      const speakers = getSessionSpeakers(session);
                      const summary = speakers
                        .slice(0, 2)
                        .map((speaker) => speaker.name)
                        .join(", ");
                      const remaining = speakers.length - 2;

                      return (
                        <li key={session.id}>
                          <Link
                            href={`/sessions?session=${session.id}`}
                            className="group -mx-2 block rounded-xl px-2 py-1.5 transition hover:bg-brand-deep/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
                          >
                            <span className="block font-display text-[9px] font-bold tracking-[0.08em] text-brand-deep/70 uppercase">
                              {formatSessionTimeRange(session)}
                            </span>
                            <span
                              lang={
                                isMalayalam(session.title) ? "ml" : undefined
                              }
                              className="mt-0.5 block text-xs leading-snug font-medium text-brand-deep/85 group-hover:text-brand-deep"
                            >
                              {session.title}
                            </span>
                            {speakers.length > 0 && (
                              <span className="mt-0.5 block truncate text-[10px] text-brand-deep/70">
                                {summary}
                                {remaining > 0 ? ` +${remaining} more` : ""}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              <Link
                href={`/sessions?venue=${venue.id}`}
                className="inline-flex min-h-10 items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.1em] text-brand-deep uppercase underline decoration-brand-deep/20 underline-offset-4 transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
              >
                View full programme
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          )}
        </div>

        {venue.officialUrl && (
          <a
            href={venue.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-deep px-4 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            Official venue page
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-brand-deep/70">
          <MapPin aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
          {venue.mapPosition
            ? "Map position is approximate and calibrated from the supplied artwork."
            : "This venue has no map marker yet."}
        </p>
      </div>
    </aside>
  );
});
