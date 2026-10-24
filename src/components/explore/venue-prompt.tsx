import type { Venue } from "@/types/venue";

import { VENUE_CATEGORY_LABELS } from "@/lib/venues";

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
      className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-3 sm:top-24"
    >
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl border border-white/20 bg-[#0b2f36]/90 px-3 py-2.5 text-left text-white shadow-2xl backdrop-blur-md transition hover:border-[#f7c873]/60 hover:bg-[#0b2f36]/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c873]"
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f7c873] text-xs font-bold text-[#0b2f36]"
        >
          {venue.mapLabel}
        </span>

        <span className="min-w-0">
          <span className="block text-[9px] font-semibold tracking-[0.2em] text-[#f7c873] uppercase">
            {VENUE_CATEGORY_LABELS[venue.category]} · Nearby
          </span>
          <span className="block truncate text-sm font-semibold">
            {venue.name}
          </span>
        </span>

        <span className="ml-2 hidden shrink-0 items-center gap-1 text-[10px] text-white/55 sm:flex">
          <kbd className="inline-grid min-w-5 place-items-center rounded border border-white/20 bg-white/10 px-1 py-0.5 font-sans text-[10px] font-semibold text-white">
            E
          </kbd>
          <span>or</span>
          <kbd className="inline-grid min-w-10 place-items-center rounded border border-white/20 bg-white/10 px-1 py-0.5 font-sans text-[10px] font-semibold text-white">
            Enter
          </kbd>
          <span>to view</span>
        </span>

        <span className="ml-2 shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/75 sm:hidden">
          Tap to view
        </span>
      </button>
    </div>
  );
}
