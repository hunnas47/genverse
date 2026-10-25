"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

import { VenuePanel } from "@/components/explore/venue-panel";
import { VenuePrompt } from "@/components/explore/venue-prompt";
import { VENUES_BY_ID } from "@/data/venues";
import { GameEventBridge } from "@/game/event-bridge";

type GameStatus = "loading" | "ready" | "error";

export function GameCanvas({
  focusVenueId = null,
}: {
  focusVenueId?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nearbyVenueId, setNearbyVenueId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const container: HTMLDivElement = host;
    const bridge = new GameEventBridge();

    let cancelled = false;

    const unsubscribeReady = bridge.on("game:ready", () => {
      if (!cancelled) {
        setStatus("ready");
      }
    });
    const unsubscribeNearby = bridge.on("venue:nearby", ({ venueId }) => {
      if (!cancelled) {
        setNearbyVenueId(venueId);
      }
    });
    const unsubscribeInteract = bridge.on("venue:interact", ({ venueId }) => {
      if (!cancelled) {
        setSelectedVenueId(venueId);
      }
    });

    async function boot() {
      try {
        const { createGame } = await import("@/game/create-game");
        if (cancelled) {
          return;
        }

        const game = await createGame({
          parent: container,
          events: bridge,
          focusVenueId,
        });

        if (cancelled) {
          game.destroy(true);
          return;
        }

        gameRef.current = game;
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Unable to start the GEN M beach scene.", error);
        setErrorMessage(
          error instanceof Error ? error.message : "The game could not start.",
        );
        setStatus("error");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      unsubscribeReady();
      unsubscribeNearby();
      unsubscribeInteract();
      bridge.clear();

      const game = gameRef.current;
      gameRef.current = null;
      game?.destroy(true);
      container.replaceChildren();
    };
  }, [focusVenueId]);

  const nearbyVenue = nearbyVenueId
    ? (VENUES_BY_ID.get(nearbyVenueId) ?? null)
    : null;
  const selectedVenue = selectedVenueId
    ? (VENUES_BY_ID.get(selectedVenueId) ?? null)
    : null;

  const closeVenue = useCallback(() => {
    setSelectedVenueId(null);
    hostRef.current?.focus();
  }, []);

  return (
    <div className="absolute inset-0">
      <div
        ref={hostRef}
        role="application"
        aria-label="GEN M beach explorer. Walk with W, A, S, D or the arrow keys. Press E or Enter to view a nearby venue."
        tabIndex={0}
        className="h-full w-full touch-none select-none outline-none [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      />

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-brand-deep px-6">
          {status === "error" ? (
            <div
              role="alert"
              className="w-full max-w-sm rounded-[2rem] border border-brand-deep/15 bg-cream p-6 text-center text-brand-deep shadow-lift"
            >
              <p className="text-lg font-medium">The beach did not load</p>
              <p className="mt-2 text-xs leading-relaxed text-brand-deep/75">
                {errorMessage ?? "An unexpected error stopped the game."}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-brand-deep px-4 py-2 font-display text-[10px] font-bold tracking-[0.1em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white">
              <span
                aria-hidden="true"
                className="size-8 rounded-full border-2 border-lime/25 border-t-lime motion-safe:animate-spin"
              />
              <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
                Preparing the beach
              </p>
            </div>
          )}
        </div>
      )}

      {status === "ready" && nearbyVenue && !selectedVenue && (
        <VenuePrompt
          venue={nearbyVenue}
          onOpen={() => setSelectedVenueId(nearbyVenue.id)}
        />
      )}

      {selectedVenue && (
        <VenuePanel venue={selectedVenue} onClose={closeVenue} />
      )}
    </div>
  );
}
