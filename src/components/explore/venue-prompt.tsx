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
      className="pointer-events-none absolute inset-x-0 top-32 z-20 flex justify-center px-3 sm:top-36"
    >
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl border border-brand-deep/15 bg-cream px-3 py-2.5 text-left text-brand-deep shadow-lift transition hover:border-brand-deep/30 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-deep font-display text-xs font-bold text-lime"
        >
          {venue.mapLabel}
        </span>

        <span className="min-w-0">
          <span className="block font-display text-[9px] font-bold tracking-[0.2em] text-brand-deep/70 uppercase">
            {VENUE_CATEGORY_LABELS[venue.category]} · Nearby
          </span>
          <span className="block truncate text-sm font-semibold">
            {venue.name}
          </span>
        </span>

        <span className="ml-2 hidden shrink-0 items-center gap-1 text-[10px] text-brand-deep/70 sm:flex">
          <kbd className="inline-grid min-w-5 place-items-center rounded border border-brand-deep/15 bg-brand-deep/5 px-1 py-0.5 font-display text-[10px] font-bold text-brand-deep">
            E
          </kbd>
          <span>or</span>
          <kbd className="inline-grid min-w-10 place-items-center rounded border border-brand-deep/15 bg-brand-deep/5 px-1 py-0.5 font-display text-[10px] font-bold text-brand-deep">
            Enter
          </kbd>
          <span>to view</span>
        </span>

        <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-deep/10 px-2.5 py-1 font-display text-[9px] font-bold tracking-[0.08em] text-brand-deep/75 uppercase sm:hidden">
          Tap to view
          <ArrowRight aria-hidden="true" className="size-3" />
        </span>
      </button>
    </div>
  );
}
