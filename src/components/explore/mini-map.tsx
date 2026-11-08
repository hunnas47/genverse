"use client";

import { List, Map as MapIcon, X } from "lucide-react";
import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { VENUES } from "@/data/venues";
import { VENUE_MAP, getVenueAccent } from "@/data/venue-map";
import { cn } from "@/lib/utils";
import type { MapPoint } from "@/types/map";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Compact overview of the venue map. Pointer clicks become walk-to-point
 * requests; keyboard activation opens the directory, which is the precise,
 * accessible way to pick a venue.
 */
export function MiniMap({
  playerPosition,
  shells = [],
  target,
  onNavigate,
  onOpenDirectory,
  className,
}: {
  playerPosition: MapPoint | null;
  /** Today's shells that are still to be found. */
  shells?: readonly MapPoint[];
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
      data-tour="minimap"
      className={cn(
        "pointer-events-auto w-[148px] rounded-2xl border border-white/20 bg-brand-deep/55 p-1.5 text-white shadow-soft ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 sm:w-[184px]",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleMapClick}
        aria-label={`Mini map. Tap or click to walk to a point. Press Enter to open the venue directory. You are the navy dot with a lime ring${shells.length > 0 ? `; ${shells.length} shells left to find are lime dots` : ""}.`}
        className="relative block w-full overflow-hidden rounded-xl border border-white/25 bg-cream/10 transition hover:border-lime/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        style={{
          aspectRatio: `${VENUE_MAP.world.width} / ${VENUE_MAP.world.height}`,
          backgroundImage: `url("${VENUE_MAP.image.previewSrc}")`,
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
                backgroundColor: getVenueAccent(venue).css,
              }}
            />
          );
        })}

        {shells.map((shell) => (
          <span
            key={`${shell.x}:${shell.y}`}
            aria-hidden="true"
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime shadow-[0_0_0_2px_rgba(237,242,181,0.35)] motion-safe:animate-pulse"
            style={{
              left: `${(shell.x / VENUE_MAP.world.width) * 100}%`,
              top: `${(shell.y / VENUE_MAP.world.height) * 100}%`,
            }}
          />
        ))}

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
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-lime bg-brand-deep shadow"
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
        data-tour="directory"
        className="mt-1.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-lime/45 px-1.5 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-lime uppercase transition hover:border-lime hover:bg-lime hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      >
        <List aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">Directory</span>
      </button>
    </section>
  );
}

/** Small mobile-only entry point that replaces the always-open minimap. */
export function MapButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open the map and venue directory"
      aria-haspopup="dialog"
      title="Map and directory"
      data-testid="map-button"
      data-tour="map"
      className={cn(
        "pointer-events-auto grid size-11 place-items-center rounded-full border border-white/20 bg-brand-deep/85 text-lime shadow-lift backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
        className,
      )}
    >
      <MapIcon aria-hidden="true" className="size-4" />
    </button>
  );
}

/** Bottom sheet used on phones so the map never sits on top of the game. */
export function MapDrawer({
  open,
  playerPosition,
  shells,
  target,
  onNavigate,
  onOpenDirectory,
  onClose,
}: {
  open: boolean;
  playerPosition: MapPoint | null;
  shells?: readonly MapPoint[];
  target: MapPoint | null;
  onNavigate: (point: MapPoint) => void;
  onOpenDirectory: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = "explore-map-title";

  useEffect(() => {
    if (!open) {
      return;
    }

    closeRef.current?.focus();

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
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
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

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-brand-deep/65 p-3 backdrop-blur-sm sm:items-center"
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
        aria-describedby="explore-map-description"
        data-testid="map-drawer"
        className="explore-map-drawer pointer-events-auto max-h-[min(88dvh,44rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[2rem] border border-brand-deep/15 bg-cream p-4 text-brand-deep shadow-lift sm:p-5 [@media(max-height:520px)]:p-3"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[10px] font-bold tracking-[0.2em] text-brand-deep/75 uppercase">
              Genverse Explorer
            </p>
            <h2 id={titleId} className="mt-1 text-xl leading-tight font-medium">
              Find your way
            </h2>
            <p
              id="explore-map-description"
              className="mt-1 text-xs leading-relaxed text-brand-deep/75"
            >
              Tap the map to walk there, or open the directory to choose a
              venue.
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the map"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-deep/10 text-brand-deep/70 transition hover:bg-brand-deep/15 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div
          className="mx-auto mt-4 w-full"
          style={{ maxWidth: "min(100%, 60dvh)" }}
        >
          <MiniMap
            playerPosition={playerPosition}
            shells={shells}
            target={target}
            onNavigate={onNavigate}
            onOpenDirectory={onOpenDirectory}
            className="w-full sm:w-full"
          />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-brand-deep/70 [@media(max-height:520px)]:hidden">
          You are the navy dot with a lime ring, and the white dot is where
          you&apos;re walking. Small lime dots are shells still to find.
        </p>
      </section>
    </div>
  );
}
