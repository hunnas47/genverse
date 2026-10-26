"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type Phaser from "phaser";

import { MiniMap } from "@/components/explore/mini-map";
import { VenueDirectory } from "@/components/explore/venue-directory";
import { VenuePanel } from "@/components/explore/venue-panel";
import { VenuePrompt } from "@/components/explore/venue-prompt";
import { VirtualJoystick } from "@/components/explore/virtual-joystick";
import { VENUES_BY_ID } from "@/data/venues";
import { GameEventBridge } from "@/game/event-bridge";
import type { MapPoint } from "@/types/map";
import type { Venue } from "@/types/venue";

type GameStatus = "loading" | "ready" | "error";

const BOOT_TIMEOUT_MS = 15000;

export function GameCanvas({
  focusVenueId = null,
}: {
  focusVenueId?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bridgeRef = useRef<GameEventBridge | null>(null);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [mapFallbackMessage, setMapFallbackMessage] = useState<string | null>(
    null,
  );
  const [nearbyVenueId, setNearbyVenueId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [playerPosition, setPlayerPosition] = useState<MapPoint | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<MapPoint | null>(
    null,
  );
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const container: HTMLDivElement = host;
    const bridge = new GameEventBridge();
    bridgeRef.current = bridge;

    let cancelled = false;
    let ready = false;

    setStatus("loading");
    setErrorMessage(null);
    setMapFallbackMessage(null);
    setNearbyVenueId(null);
    setSelectedVenueId(null);
    setPlayerPosition(null);
    setNavigationTarget(null);
    setDirectoryOpen(false);

    const bootTimeout = window.setTimeout(() => {
      if (cancelled || ready) {
        return;
      }

      setErrorMessage(
        "The beach is taking longer than expected to load. Check your connection, then try again.",
      );
      setStatus("error");
    }, BOOT_TIMEOUT_MS);

    const handleVisibilityChange = () => {
      const game = gameRef.current;

      if (!game) {
        return;
      }

      if (document.hidden) {
        game.loop.sleep();
      } else {
        game.loop.wake();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const unsubscribeReady = bridge.on("game:ready", () => {
      if (cancelled) {
        return;
      }

      ready = true;
      window.clearTimeout(bootTimeout);
      setStatus("ready");
    });
    const unsubscribeMapFallback = bridge.on(
      "game:map-fallback",
      ({ message }) => {
        if (!cancelled) {
          setMapFallbackMessage(message);
        }
      },
    );
    const unsubscribeNearby = bridge.on("venue:nearby", ({ venueId }) => {
      if (!cancelled) {
        setNearbyVenueId(venueId);
      }
    });
    const unsubscribeInteract = bridge.on("venue:interact", ({ venueId }) => {
      if (!cancelled) {
        setSelectedVenueId(venueId);
        setDirectoryOpen(false);
      }
    });
    const unsubscribePosition = bridge.on("player:position", ({ x, y }) => {
      if (!cancelled) {
        setPlayerPosition({ x, y });
      }
    });
    const unsubscribeNavigation = bridge.on("navigation:state", (state) => {
      if (cancelled) {
        return;
      }

      setNavigationTarget(
        state.active && state.targetX !== null && state.targetY !== null
          ? { x: state.targetX, y: state.targetY }
          : null,
      );

      if (state.active) {
        setSelectedVenueId(null);
      }

      if (state.reason === "unreachable") {
        setNavigationNotice(
          "No walkable route to that point. Try a spot on the beach.",
        );
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

        if (document.hidden) {
          game.loop.sleep();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        window.clearTimeout(bootTimeout);
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
      window.clearTimeout(bootTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeReady();
      unsubscribeMapFallback();
      unsubscribeNearby();
      unsubscribeInteract();
      unsubscribePosition();
      unsubscribeNavigation();
      bridge.clear();
      bridgeRef.current = null;

      const game = gameRef.current;
      gameRef.current = null;
      game?.destroy(true);
      container.replaceChildren();
    };
  }, [attempt, focusVenueId]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!navigationNotice) {
      return;
    }

    const timer = window.setTimeout(() => setNavigationNotice(null), 3200);

    return () => window.clearTimeout(timer);
  }, [navigationNotice]);

  const nearbyVenue = nearbyVenueId
    ? (VENUES_BY_ID.get(nearbyVenueId) ?? null)
    : null;
  const selectedVenue = selectedVenueId
    ? (VENUES_BY_ID.get(selectedVenueId) ?? null)
    : null;

  const openVenue = useCallback((venueId: string) => {
    bridgeRef.current?.emit("navigation:cancel", {});
    setSelectedVenueId(venueId);
    setDirectoryOpen(false);
    hostRef.current?.focus();
  }, []);

  const closeVenue = useCallback(() => {
    setSelectedVenueId(null);
    hostRef.current?.focus();
  }, []);

  const openNearbyVenue = useCallback(() => {
    if (nearbyVenueId) {
      openVenue(nearbyVenueId);
    }
  }, [nearbyVenueId, openVenue]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    bridgeRef.current?.emit("input:move", { x, y });
  }, []);

  const navigateToPoint = useCallback((point: MapPoint) => {
    hostRef.current?.focus();
    bridgeRef.current?.emit("navigation:goto", {
      target: { kind: "point", ...point },
    });
  }, []);

  const navigateToVenue = useCallback(
    (venue: Venue) => {
      if (!venue.mapPosition) {
        return;
      }

      if (nearbyVenueId === venue.id) {
        openVenue(venue.id);
        return;
      }

      setDirectoryOpen(false);
      hostRef.current?.focus();
      bridgeRef.current?.emit("navigation:goto", {
        target: { kind: "venue", venueId: venue.id },
      });
    },
    [nearbyVenueId, openVenue],
  );

  const openDirectory = useCallback(() => {
    bridgeRef.current?.emit("navigation:cancel", {});
    setDirectoryOpen(true);
  }, []);

  const closeDirectory = useCallback(() => {
    setDirectoryOpen(false);
    hostRef.current?.focus();
  }, []);

  const showBottomControls =
    status === "ready" && !selectedVenue && !directoryOpen;

  return (
    <div className="absolute inset-0">
      <div
        ref={hostRef}
        role="application"
        aria-label="GEN M beach explorer. Walk with W, A, S, D, the arrow keys, or the on-screen joystick. Tap or click the map to walk to a point. Press E or Enter to view a nearby venue, and Escape to stop walking."
        aria-keyshortcuts="W A S D ArrowUp ArrowDown ArrowLeft ArrowRight E Enter Escape"
        tabIndex={0}
        className="h-full w-full touch-none select-none [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-lime"
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
                onClick={retry}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-deep px-4 py-2 font-display text-[10px] font-bold tracking-[0.1em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
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

      {status === "ready" && mapFallbackMessage && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-3 sm:top-24">
          <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-brand-deep/15 bg-cream px-3.5 py-3 text-brand-deep shadow-lift">
            <p role="status" className="text-xs leading-relaxed">
              {mapFallbackMessage}
            </p>
            <button
              type="button"
              onClick={() => setMapFallbackMessage(null)}
              aria-label="Dismiss map loading notice"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-deep/10 text-brand-deep/70 transition hover:bg-brand-deep/15 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {showBottomControls && (
        <>
          <VirtualJoystick
            onMove={handleJoystickMove}
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-20 lg:hidden"
          />
          <MiniMap
            playerPosition={playerPosition}
            target={navigationTarget}
            onNavigate={navigateToPoint}
            onOpenDirectory={openDirectory}
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-20"
          />
        </>
      )}

      {status === "ready" &&
        nearbyVenue &&
        !selectedVenue &&
        !directoryOpen && (
          <VenuePrompt venue={nearbyVenue} onOpen={openNearbyVenue} />
        )}

      {selectedVenue && (
        <VenuePanel venue={selectedVenue} onClose={closeVenue} />
      )}

      {directoryOpen && (
        <VenueDirectory
          nearbyVenueId={nearbyVenueId}
          onNavigate={navigateToVenue}
          onClose={closeDirectory}
        />
      )}

      {status === "ready" && navigationNotice && (
        <div
          role="status"
          className="pointer-events-none absolute top-20 left-1/2 z-30 w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-brand-deep/15 bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-brand-deep shadow-lift sm:top-24"
        >
          {navigationNotice}
        </div>
      )}
    </div>
  );
}
