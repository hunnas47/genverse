"use client";

import {
  ArrowUpRight,
  Check,
  LoaderCircle,
  Sparkles,
  Stamp,
  X,
} from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";

import {
  formatSessionTimeRange,
  getSessionSpeakers,
  getSessionsForVenue,
  groupSessionsByDay,
  isMalayalam,
} from "@/lib/programme";
import { cn } from "@/lib/utils";
import { formatActiveDays, VENUE_CATEGORY_LABELS } from "@/lib/venues";
import type { Venue } from "@/types/venue";

const STAMP_DURATION_MS = 1800;

export const VenuePanel = memo(function VenuePanel({
  venue,
  onClose,
  checkedIn,
  checkInPending = false,
  onCheckIn,
}: {
  venue: Venue;
  onClose: () => void;
  checkedIn: boolean;
  checkInPending?: boolean;
  onCheckIn: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const stampTimerRef = useRef<number | null>(null);
  const previousVenueIdRef = useRef(venue.id);
  const previousCheckedInRef = useRef(checkedIn);
  const [stampActive, setStampActive] = useState(false);
  const titleId = `venue-panel-title-${venue.id}`;
  const activeDays = formatActiveDays(venue.activeDays);
  const sessions = getSessionsForVenue(venue.id);
  const sessionGroups = groupSessionsByDay(sessions);

  useEffect(() => {
    if (previousVenueIdRef.current !== venue.id) {
      previousVenueIdRef.current = venue.id;
      previousCheckedInRef.current = checkedIn;
      setStampActive(false);
      return;
    }

    if (!previousCheckedInRef.current && checkedIn) {
      previousCheckedInRef.current = true;
      setStampActive(true);

      try {
        // Haptics are optional. Some browsers expose vibrate but reject the
        // call, which must not take down the stamp or the page.
        navigator.vibrate?.([18, 40, 35]);
      } catch {
        // Ignore unsupported or blocked vibration.
      }

      if (stampTimerRef.current !== null) {
        window.clearTimeout(stampTimerRef.current);
      }

      stampTimerRef.current = window.setTimeout(() => {
        stampTimerRef.current = null;
        setStampActive(false);
      }, STAMP_DURATION_MS);
    } else {
      previousCheckedInRef.current = checkedIn;
    }
  }, [checkedIn, venue.id]);

  useEffect(() => {
    return () => {
      if (stampTimerRef.current !== null) {
        window.clearTimeout(stampTimerRef.current);
      }
    };
  }, []);

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
      {stampActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center overflow-hidden pb-72 sm:pb-0"
        >
          <div className="relative grid size-44 place-items-center sm:size-52">
            <div className="quest-stamp-glow absolute -inset-4 rounded-full bg-lime/30 opacity-0 blur-2xl" />
            <span className="quest-stamp-ring absolute inset-0 rounded-full border-2 border-lime/70 opacity-0" />
            <span
              className="quest-stamp-ring absolute inset-5 rounded-full border border-dashed border-brand-deep/40 opacity-0"
              style={{ animationDelay: "120ms" }}
            />
            <div className="quest-stamp-slam relative grid size-36 place-items-center rounded-full border-[3px] border-brand-deep bg-lime text-brand-deep shadow-[0_20px_60px_rgba(28,29,58,0.45)] sm:size-44">
              <span className="absolute inset-2 rounded-full border border-brand-deep/35" />
              <span className="font-display text-[10px] font-bold tracking-[0.3em] uppercase">
                GEN M
              </span>
              <span className="mt-0.5 font-display text-2xl font-black tracking-[0.06em] uppercase sm:text-3xl">
                Stamped
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 font-display text-[10px] font-bold tracking-[0.14em] uppercase">
                <Check aria-hidden="true" className="size-3" />
                {venue.mapLabel} · +25 pts
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-3 bottom-3 max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain rounded-[2rem] border border-brand-deep/15 bg-cream p-5 text-brand-deep shadow-lift sm:inset-x-auto sm:top-24 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-7rem)] sm:w-[400px] sm:p-6">
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
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-deep/10 text-brand-deep/70 transition hover:bg-brand-deep/15 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {venue.description && (
          <p className="mt-4 text-sm leading-relaxed text-brand-deep/75">
            {venue.description}
          </p>
        )}

        {venue.mapPosition && (
          <div
            className={cn(
              "relative mt-4 rounded-2xl border border-brand/20 bg-lime/35 p-3.5",
              stampActive && "quest-card-thud",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.18em] text-brand-deep/70 uppercase">
                  <Sparkles aria-hidden="true" className="size-3" />
                  Beach Quest
                </p>
                <p
                  role="status"
                  className="mt-1 text-xs leading-relaxed text-brand-deep/75"
                >
                  {checkedIn
                    ? "Stamped today. You earned 25 points here."
                    : checkInPending
                      ? "Stamping your passport…"
                      : "Check in for 25 quest points. One stamp per venue per day."}
                </p>
              </div>

              <button
                type="button"
                onClick={onCheckIn}
                disabled={checkedIn || checkInPending}
                aria-busy={checkInPending || undefined}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 font-display text-[10px] font-bold tracking-[0.08em] uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep active:scale-95 disabled:cursor-default disabled:active:scale-100",
                  checkedIn
                    ? "bg-brand-deep text-lime"
                    : checkInPending
                      ? "bg-brand-deep/80 text-lime"
                      : "bg-brand-deep text-lime hover:bg-brand-deep/90",
                )}
              >
                {checkInPending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 motion-safe:animate-spin"
                  />
                ) : checkedIn ? (
                  <Check aria-hidden="true" className="size-3.5" />
                ) : (
                  <Stamp aria-hidden="true" className="size-3.5" />
                )}
                {checkInPending
                  ? "Stamping…"
                  : checkedIn
                    ? "Stamped"
                    : "Check in"}
              </button>
            </div>
          </div>
        )}

        {activeDays && (
          <div className="mt-4">
            <p className="font-display text-[10px] font-bold tracking-[0.22em] text-brand-deep/70 uppercase">
              Programme days
            </p>
            <p className="mt-1 text-sm text-brand-deep/80">{activeDays}</p>
          </div>
        )}

        {venue.note && (
          <p className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 px-3.5 py-2.5 text-xs leading-relaxed text-brand-deep/75">
            {venue.note}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-brand-deep/10 bg-brand-deep/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[10px] font-bold tracking-[0.22em] text-brand-deep/70 uppercase">
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
              No sessions are listed for this venue.
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
                            <span className="block font-display text-[10px] font-bold tracking-[0.08em] text-brand-deep/70 uppercase">
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
                              <span className="mt-0.5 block truncate text-[11px] text-brand-deep/70">
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
                className="inline-flex min-h-11 items-center gap-1.5 font-display text-[10px] font-bold tracking-[0.1em] text-brand-deep uppercase underline decoration-brand-deep/20 underline-offset-4 transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
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
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-deep px-4 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            Official venue page
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        )}

      </div>
    </aside>
  );
});
