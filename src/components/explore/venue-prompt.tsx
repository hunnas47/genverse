import { ArrowRight } from "lucide-react";

import { VENUE_CATEGORY_LABELS } from "@/lib/venues";
import type { Venue } from "@/types/venue";

export function VenuePrompt({
  venue,
  onOpen,
}: {
  venue: Venue;
  onOpen: () => void;
}) {
  return (
    <div
      aria-live="polite"
      className="venue-prompt pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-20 flex justify-center px-3 sm:px-5 lg:bottom-6 lg:justify-start"
    >
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto flex max-w-[min(19rem,calc(100vw-1.5rem))] items-center gap-2.5 rounded-2xl border border-brand-deep/15 bg-cream px-3 py-2 text-left text-brand-deep shadow-lift transition hover:border-brand-deep/30 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-deep font-display text-xs font-bold text-lime"
        >
          {venue.mapLabel}
        </span>

        <span className="min-w-0">
          <span className="block font-display text-[11px] font-bold tracking-[0.16em] text-brand-deep/75 uppercase">
            {VENUE_CATEGORY_LABELS[venue.category]} · Nearby
          </span>
          <span className="block truncate text-sm font-semibold">
            {venue.name}
          </span>
        </span>

        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-deep/10 px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.08em] text-brand-deep/75 uppercase">
          View
          <ArrowRight aria-hidden="true" className="size-3" />
        </span>
      </button>
    </div>
  );
}
