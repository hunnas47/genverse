"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { VENUES } from "@/data/venues";
import { VENUE_CATEGORY_LABELS } from "@/lib/venues";
import { cn } from "@/lib/utils";
import type { Venue, VenueCategory } from "@/types/venue";

const CATEGORY_ORDER: VenueCategory[] = [
  "stage",
  "expo",
  "facility",
  "booth",
];

const CATEGORY_HEADINGS: Record<VenueCategory, string> = {
  stage: "Stages",
  expo: "Expo spaces",
  facility: "Facilities",
  booth: "Booths",
};

/**
 * Venue picker used by the minimap. Choosing a venue asks the scene to walk to
 * its nearest walkable point; the venue panel opens on arrival.
 */
export function VenueDirectory({
  nearbyVenueId,
  onNavigate,
  onClose,
}: {
  nearbyVenueId: string | null;
  onNavigate: (venue: Venue) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = "venue-directory-title";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-brand-deep/65 p-3 backdrop-blur-sm sm:items-center sm:justify-end sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby="venue-directory-description"
        className="pointer-events-auto flex max-h-[min(82dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-brand-deep/15 bg-cream text-brand-deep shadow-lift sm:max-h-[calc(100dvh-4rem)] sm:w-[420px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-deep/10 p-5">
          <div>
            <p className="font-display text-[9px] font-bold tracking-[0.24em] text-brand-deep/75 uppercase">
              Beach directory
            </p>
            <h2
              id={titleId}
              className="mt-1 text-2xl leading-tight font-medium"
            >
              Find a venue
            </h2>
            <p
              id="venue-directory-description"
              className="mt-1 max-w-xs text-xs leading-relaxed text-brand-deep/75"
            >
              Choose a venue to walk there. Its panel opens when you arrive.
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close venue directory"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-deep/10 text-brand-deep/70 transition hover:bg-brand-deep/15 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-4">
          {CATEGORY_ORDER.map((category) => {
            const venues = VENUES.filter(
              (venue) => venue.category === category,
            );

            if (venues.length === 0) {
              return null;
            }

            return (
              <div key={category} className="mb-5 last:mb-0">
                <h3 className="font-display text-[10px] font-bold tracking-[0.2em] text-brand-deep/75 uppercase">
                  {CATEGORY_HEADINGS[category]}
                </h3>

                <ul className="mt-2 space-y-2">
                  {venues.map((venue) => {
                    const isNearby = venue.id === nearbyVenueId;
                    const canNavigate = Boolean(venue.mapPosition);

                    return (
                      <li key={venue.id}>
                        <div className="flex items-center gap-3 rounded-2xl border border-brand-deep/10 bg-white/55 p-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-deep font-display text-[10px] font-bold text-lime">
                            {venue.mapLabel}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm leading-tight font-medium">
                                {venue.name}
                              </p>
                              {isNearby && (
                                <span className="rounded-full bg-lime px-1.5 py-0.5 font-display text-[8px] font-bold tracking-[0.08em] text-brand-deep uppercase">
                                  Nearby
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-brand-deep/75">
                              {VENUE_CATEGORY_LABELS[venue.category]}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={!canNavigate}
                            onClick={() => onNavigate(venue)}
                            className={cn(
                              "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3 py-2 font-display text-[9px] font-bold tracking-[0.08em] uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep",
                              canNavigate
                                ? isNearby
                                  ? "bg-lime text-brand-deep hover:bg-brand-deep hover:text-lime"
                                  : "bg-brand-deep text-lime hover:bg-brand-deep/90"
                                : "cursor-not-allowed bg-brand-deep/10 text-brand-deep/75",
                            )}
                          >
                            {canNavigate
                              ? isNearby
                                ? "Open"
                                : "Walk here"
                              : "Map TBA"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

        </div>
      </section>
    </div>
  );
}
