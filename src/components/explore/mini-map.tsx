"use client";

import { List } from "lucide-react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { VENUES } from "@/data/venues";
import {
  VENUE_MAP,
  VENUE_MARKER_COLORS,
} from "@/data/venue-map";
import { cn } from "@/lib/utils";
import type { MapPoint } from "@/types/map";

function toCssColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

/**
 * Compact overview of the venue map. Pointer clicks become walk-to-point
 * requests; keyboard activation opens the directory, which is the precise,
 * accessible way to pick a venue.
 */
export function MiniMap({
  playerPosition,
  target,
  onNavigate,
  onOpenDirectory,
  className,
}: {
  playerPosition: MapPoint | null;
  target: MapPoint | null;
  onNavigate: (point: MapPoint) => void;
  onOpenDirectory: () => void;
  className?: string;
}) {
  const handleMapClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      onOpenDirectory();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const worldX =
      ((event.clientX - rect.left) / rect.width) * VENUE_MAP.world.width;
    const worldY =
      ((event.clientY - rect.top) / rect.height) * VENUE_MAP.world.height;
    const bounds = VENUE_MAP.playableBounds;
    const inset = VENUE_MAP.player.radius;

    onNavigate({
      x: Math.min(
        Math.max(worldX, bounds.x + inset),
        bounds.x + bounds.width - inset,
      ),
      y: Math.min(
        Math.max(worldY, bounds.y + inset),
        bounds.y + bounds.height - inset,
      ),
    });
  };

  return (
    <section
      className={cn(
        "pointer-events-auto w-[136px] rounded-2xl border border-white/15 bg-brand-deep/85 p-2 text-white shadow-lift backdrop-blur-md sm:w-[176px]",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleMapClick}
        aria-label="Mini map. Tap or click to walk to a point. Press Enter to open the venue directory. Your position is marked in lime."
        className="relative block w-full overflow-hidden rounded-xl border border-white/20 bg-cream/10 transition hover:border-lime/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        style={{
          aspectRatio: `${VENUE_MAP.world.width} / ${VENUE_MAP.world.height}`,
          backgroundImage: `url("${VENUE_MAP.image.src}")`,
          backgroundSize: "100% 100%",
        }}
      >
        {VENUES.map((venue) => {
          if (!venue.mapPosition) {
            return null;
          }

          return (
            <span
              key={venue.id}
              aria-hidden="true"
              className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/85 shadow-sm"
              style={{
                left: `${(venue.mapPosition.x / VENUE_MAP.world.width) * 100}%`,
                top: `${(venue.mapPosition.y / VENUE_MAP.world.height) * 100}%`,
                backgroundColor: toCssColor(
                  VENUE_MARKER_COLORS[venue.category],
                ),
              }}
            />
          );
        })}

        {target && (
          <span
            data-testid="mini-map-target"
            aria-hidden="true"
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-deep bg-cream shadow"
            style={{
              left: `${(target.x / VENUE_MAP.world.width) * 100}%`,
              top: `${(target.y / VENUE_MAP.world.height) * 100}%`,
            }}
          />
        )}

        {playerPosition && (
          <span
            data-testid="mini-map-player"
            aria-hidden="true"
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-deep bg-lime shadow"
            style={{
              left: `${(playerPosition.x / VENUE_MAP.world.width) * 100}%`,
              top: `${(playerPosition.y / VENUE_MAP.world.height) * 100}%`,
            }}
          />
        )}
      </button>

      <button
        type="button"
        onClick={onOpenDirectory}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-lime px-2 py-2 font-display text-[10px] font-bold tracking-[0.12em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      >
        <List aria-hidden="true" className="size-3.5" />
        Directory
      </button>
    </section>
  );
}
