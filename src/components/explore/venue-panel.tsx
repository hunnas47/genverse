"use client";

import { useEffect, useRef } from "react";

import { formatActiveDays, VENUE_CATEGORY_LABELS } from "@/lib/venues";
import type { Venue } from "@/types/venue";

export function VenuePanel({
  venue,
  onClose,
}: {
  venue: Venue;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = `venue-panel-title-${venue.id}`;
  const activeDays = formatActiveDays(venue.activeDays);

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
      <div className="pointer-events-auto absolute inset-x-3 bottom-3 max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain rounded-3xl border border-white/20 bg-[#0b2f36]/95 p-5 text-white shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:top-24 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-12rem)] sm:w-[380px] sm:p-6">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f7c873] px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-[#0b2f36] uppercase">
                {VENUE_CATEGORY_LABELS[venue.category]}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">
                {venue.mapLabel}
              </span>
            </div>

            <h2
              id={titleId}
              className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {venue.name}
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close venue details"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl text-white/70 transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-white/60">
          {venue.verification === "official"
            ? "Official venue information verified from the GEN M website."
            : "Label from the supplied venue map. Official details are not verified yet."}
        </p>

        {venue.description && (
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            {venue.description}
          </p>
        )}

        {activeDays && (
          <div className="mt-4">
            <p className="text-[9px] font-semibold tracking-[0.22em] text-[#f7c873] uppercase">
              Programme days
            </p>
            <p className="mt-1 text-sm text-white/80">{activeDays}</p>
          </div>
        )}

        {venue.note && (
          <p className="mt-4 rounded-xl border border-[#f7c873]/20 bg-[#f7c873]/10 px-3 py-2 text-[11px] leading-relaxed text-[#f7c873]/85">
            {venue.note}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <p className="text-[9px] font-semibold tracking-[0.22em] text-white/45 uppercase">
            Sessions
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {venue.officialUrl
              ? "The session programme is not included in this preview yet. Official session details are available on the venue page."
              : "This map facility does not have a published session programme in this preview."}
          </p>
        </div>

        {venue.officialUrl && (
          <a
            href={venue.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0b2f36] transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
          >
            Official venue page
            <span aria-hidden="true">↗</span>
          </a>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-white/35">
          {venue.mapPosition
            ? "Map position is approximate and calibrated from the supplied artwork."
            : "This venue has no map marker yet."}
        </p>
      </div>
    </aside>
  );
}
