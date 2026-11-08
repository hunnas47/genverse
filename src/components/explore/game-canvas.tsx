"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Footprints, Sparkles, X } from "lucide-react";
import type Phaser from "phaser";

import { ExploreHud } from "@/components/explore/explore-hud";
import { ExploreTour } from "@/components/explore/explore-tour";
import {
  MapButton,
  MapDrawer,
  MiniMap,
} from "@/components/explore/mini-map";
import { QuestJoinDialog } from "@/components/explore/quest-join-dialog";
import { QuestPanel } from "@/components/explore/quest-panel";
import { VenueDirectory } from "@/components/explore/venue-directory";
import { VenuePanel } from "@/components/explore/venue-panel";
import { VenuePrompt } from "@/components/explore/venue-prompt";
import { VirtualJoystick } from "@/components/explore/virtual-joystick";
import { VENUES_BY_ID } from "@/data/venues";
import { VENUE_MAP } from "@/data/venue-map";
import { GameEventBridge } from "@/game/event-bridge";
import { liveQuestStore } from "@/lib/quest/live-store";
import { useQuest } from "@/lib/quest/use-quest";
import type { MapPoint } from "@/types/map";
import type { QuestNameResult } from "@/types/quest";
import type { Venue } from "@/types/venue";

type GameStatus = "loading" | "ready" | "error";

const BOOT_TIMEOUT_MS = 15000;
// v2: the learn-by-doing guide replaced the v1 modal tour.
const TOUR_STORAGE_KEY = "genm:explore:tour:v2";
const SPAWN_MOVE_THRESHOLD = 28;
let tourSeenInMemory = false;

function hasSeenTour(): boolean {
  if (typeof window === "undefined" || tourSeenInMemory) {
    return true;
  }

  try {
    if (window.localStorage.getItem(TOUR_STORAGE_KEY) === "1") {
      return true;
    }
  } catch {
    // Fall through to session storage when local storage is blocked.
  }

  try {
    return window.sessionStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markTourSeen(): void {
  tourSeenInMemory = true;

  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    // Storage can be blocked; session storage is the fallback.
  }

  try {
    window.sessionStorage.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    // The tour still stays dismissed for this session.
  }
}

export function GameCanvas({
  focusVenueId = null,
}: {
  focusVenueId?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bridgeRef = useRef<GameEventBridge | null>(null);
  const hasMovedRef = useRef(false);
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
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [questPanelOpen, setQuestPanelOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  const [walkingVenueId, setWalkingVenueId] = useState<string | null>(null);
  const [questNotice, setQuestNotice] = useState<string | null>(null);
  const [questCelebration, setQuestCelebration] = useState<{
    points: number;
  } | null>(null);
  const [checkingInVenueId, setCheckingInVenueId] = useState<string | null>(
    null,
  );
  const quest = useQuest();
  const questPeriodId = quest.snapshot?.period.id ?? null;

  useEffect(() => {
    if (!quest.ready) {
      return;
    }

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
    setMapDrawerOpen(false);
    setLeaderboardOpen(false);
    hasMovedRef.current = false;
    setHasMoved(false);
    setQuestPanelOpen(false);
    setJoinDialogOpen(false);
    setQuestCelebration(null);

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
      if (cancelled) {
        return;
      }

      setPlayerPosition({ x, y });

      if (hasMovedRef.current) {
        return;
      }

      const distance = Math.hypot(
        x - VENUE_MAP.spawn.x,
        y - VENUE_MAP.spawn.y,
      );

      if (distance > SPAWN_MOVE_THRESHOLD) {
        hasMovedRef.current = true;
        setHasMoved(true);
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
      setWalkingVenueId(state.active ? state.venueId : null);

      if (state.active) {
        setSelectedVenueId(null);
      }

      if (state.reason === "unreachable") {
        setNavigationNotice(
          "No walkable route to that point. Try a spot on the beach.",
        );
      }
    });
    const unsubscribeShellFound = bridge.on(
      "quest:shell-found",
      ({ shellId }) => {
        void (async () => {
          const result = await liveQuestStore.collectShell(shellId);

          if (cancelled) {
            return;
          }

          if (result.accepted) {
            const points = result.points + result.bonusPoints;

            bridge.emit("quest:shell-result", {
              shellId,
              accepted: true,
              points: result.points,
              bonusPoints: result.bonusPoints,
            });

            if (result.bonusPoints > 0) {
              setQuestCelebration({ points });
              setQuestNotice(null);
            } else {
              setQuestNotice(`Shell found! +${points} points`);
            }

            try {
              navigator.vibrate?.(
                result.bonusPoints > 0 ? [20, 40, 20] : 12,
              );
            } catch {
              // Haptics are optional.
            }
          } else {
            bridge.emit("quest:shell-result", {
              shellId,
              accepted: false,
            });
          }
        })();
      },
    );

    async function boot() {
      try {
        const { createGame } = await import("@/game/create-game");
        if (cancelled) {
          return;
        }

        const snapshot = liveQuestStore.getSnapshot();
        const game = await createGame({
          parent: container,
          events: bridge,
          focusVenueId,
          shells: snapshot.period.shellSet.shells,
          collectedShellIds: snapshot.collectedShellIds,
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
      unsubscribeShellFound();
      bridge.clear();
      bridgeRef.current = null;

      const game = gameRef.current;
      gameRef.current = null;
      game?.destroy(true);
      container.replaceChildren();
    };
  }, [attempt, focusVenueId, quest.ready, questPeriodId]);

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

  useEffect(() => {
    if (!questNotice) {
      return;
    }

    const timer = window.setTimeout(() => setQuestNotice(null), 3200);

    return () => window.clearTimeout(timer);
  }, [questNotice]);

  useEffect(() => {
    if (!questCelebration) {
      return;
    }

    const timer = window.setTimeout(() => setQuestCelebration(null), 4000);

    return () => window.clearTimeout(timer);
  }, [questCelebration]);

  useEffect(() => {
    if (status !== "ready" || hasSeenTour()) {
      return;
    }

    const timer = window.setTimeout(() => setTourOpen(true), 350);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (
      !leaderboardOpen &&
      !mapDrawerOpen &&
      !questPanelOpen &&
      !joinDialogOpen
    ) {
      return;
    }

    bridgeRef.current?.emit("navigation:cancel", {});
    bridgeRef.current?.emit("input:move", { x: 0, y: 0 });
  }, [joinDialogOpen, leaderboardOpen, mapDrawerOpen, questPanelOpen]);

  const collectedShellKey =
    quest.snapshot?.collectedShellIds.join("|") ?? "";

  useEffect(() => {
    if (!collectedShellKey) {
      return;
    }

    bridgeRef.current?.emit("quest:sync-state", {
      collectedShellIds: collectedShellKey.split("|"),
    });
  }, [collectedShellKey]);

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
    setMapDrawerOpen(false);
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
    setMapDrawerOpen(false);
    setDirectoryOpen(true);
  }, []);

  const closeDirectory = useCallback(() => {
    setDirectoryOpen(false);
    hostRef.current?.focus();
  }, []);

  const openMapDrawer = useCallback(() => {
    bridgeRef.current?.emit("navigation:cancel", {});
    setSelectedVenueId(null);
    setDirectoryOpen(false);
    setQuestPanelOpen(false);
    setJoinDialogOpen(false);
    setMapDrawerOpen(true);
  }, []);

  const closeMapDrawer = useCallback(() => {
    setMapDrawerOpen(false);
    hostRef.current?.focus();
  }, []);

  const handleJoin = useCallback(
    async (name: string): Promise<QuestNameResult> => {
      const result = await liveQuestStore.join(name);

      if (result.ok) {
        setJoinDialogOpen(false);
        setQuestNotice(`Welcome, ${result.value}. Find today's shells!`);
      }

      return result;
    },
    [],
  );

  const dismissJoin = useCallback(() => {
    setJoinDialogOpen(false);
  }, []);

  const finishTour = useCallback(() => {
    setTourOpen(false);
    markTourSeen();
    hostRef.current?.focus();
  }, []);

  const cancelNavigation = useCallback(() => {
    bridgeRef.current?.emit("navigation:cancel", {});
  }, []);

  const openJoinDialog = useCallback(() => {
    setQuestPanelOpen(false);
    setJoinDialogOpen(true);
  }, []);

  const openProfile = useCallback(() => {
    bridgeRef.current?.emit("navigation:cancel", {});
    setSelectedVenueId(null);
    setDirectoryOpen(false);
    setMapDrawerOpen(false);
    setQuestPanelOpen(true);
  }, []);

  const closeQuestPanel = useCallback(() => {
    setQuestPanelOpen(false);
    hostRef.current?.focus();
  }, []);

  const replayTour = useCallback(() => {
    bridgeRef.current?.emit("navigation:cancel", {});
    setSelectedVenueId(null);
    setDirectoryOpen(false);
    setMapDrawerOpen(false);
    setQuestPanelOpen(false);
    setJoinDialogOpen(false);
    setLeaderboardOpen(false);
    setTourRun((value) => value + 1);
    setTourOpen(true);
    hostRef.current?.focus();
  }, []);

  const openLeaderboard = useCallback(() => {
    bridgeRef.current?.emit("navigation:cancel", {});
    setSelectedVenueId(null);
    setDirectoryOpen(false);
    setMapDrawerOpen(false);
    setQuestPanelOpen(false);
    setJoinDialogOpen(false);
    setLeaderboardOpen(true);
  }, []);

  const closeLeaderboard = useCallback(() => {
    setLeaderboardOpen(false);
    hostRef.current?.focus();
  }, []);

  // Stamps are earned by walking: only offer check-in when the avatar is
  // inside the venue's interaction radius (the server's speed check uses the
  // same radius).
  const canCheckInSelected = Boolean(
    selectedVenue?.mapPosition &&
      playerPosition &&
      Math.hypot(
        playerPosition.x - selectedVenue.mapPosition.x,
        playerPosition.y - selectedVenue.mapPosition.y,
      ) <=
        selectedVenue.mapPosition.interactionRadius + 4,
  );

  const walkToSelectedVenue = useCallback(() => {
    if (selectedVenue) {
      navigateToVenue(selectedVenue);
    }
  }, [navigateToVenue, selectedVenue]);

  const checkInSelectedVenue = useCallback(async () => {
    if (!selectedVenueId || checkingInVenueId || !canCheckInSelected) {
      return;
    }

    setCheckingInVenueId(selectedVenueId);
    const result = await liveQuestStore.checkInVenue(selectedVenueId);
    setCheckingInVenueId(null);

    if (result.accepted) {
      setQuestNotice(`Stamped! +${result.points} points`);
    } else if (result.reason === "already-checked-in") {
      setQuestNotice("Already stamped here today.");
    }
  }, [selectedVenueId, checkingInVenueId, canCheckInSelected]);

  const showBottomControls =
    status === "ready" &&
    !selectedVenue &&
    !directoryOpen &&
    !mapDrawerOpen &&
    !leaderboardOpen &&
    !questPanelOpen &&
    !joinDialogOpen;
  const showJoinDialog = joinDialogOpen;

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
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-deep px-4 py-2 font-display text-[11px] font-bold tracking-[0.1em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
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
              <p className="font-display text-[11px] font-bold tracking-[0.22em] text-lime uppercase">
                Preparing the beach
              </p>
            </div>
          )}
        </div>
      )}

      <ExploreHud
        snapshot={quest.snapshot}
        leaderboardOpen={leaderboardOpen}
        onOpenProfile={openProfile}
        onOpenLeaderboard={openLeaderboard}
        onCloseLeaderboard={closeLeaderboard}
      />

      {status === "ready" && mapFallbackMessage && (
        <div className="pointer-events-none absolute inset-x-0 top-36 z-30 flex justify-center px-3 sm:top-32">
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

      {status === "ready" && (
        // One column under the HUD so notices, the walking pill, and the
        // guide stack instead of overlapping.
        <div className="pointer-events-none absolute inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] z-30 flex flex-col items-center gap-2 px-3 sm:top-[calc(max(1.25rem,env(safe-area-inset-top))+4rem)]">
          {navigationNotice && (
            <div
              role="status"
              className="w-[min(20rem,100%)] rounded-2xl border border-brand-deep/15 bg-cream px-4 py-2.5 text-center text-xs leading-relaxed text-brand-deep shadow-lift"
            >
              {navigationNotice}
            </div>
          )}

          {questNotice && (
            <div
              role="status"
              className="max-w-[min(20rem,100%)] rounded-2xl border border-brand-deep/15 bg-cream px-3.5 py-2.5 text-center text-xs leading-relaxed text-brand-deep shadow-lift"
            >
              {questNotice}
            </div>
          )}

          {walkingVenueId && !selectedVenue && (
            <div
              role="status"
              className="pointer-events-auto flex max-w-[min(20rem,100%)] items-center gap-2 rounded-full border border-white/20 bg-brand-deep/90 py-1 pr-1 pl-3.5 text-white shadow-lift backdrop-blur-md"
            >
              <Footprints
                aria-hidden="true"
                className="size-4 shrink-0 text-lime"
              />
              <span className="min-w-0 truncate text-xs">
                Walking to{" "}
                <span className="font-semibold">
                  {VENUES_BY_ID.get(walkingVenueId)?.name ?? "the venue"}
                </span>
              </span>
              <button
                type="button"
                onClick={cancelNavigation}
                aria-label="Stop walking"
                className="grid size-11 shrink-0 place-items-center rounded-full text-lime transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          )}

          {tourOpen && (
            <ExploreTour
              key={tourRun}
              visible={
                !joinDialogOpen &&
                !selectedVenue &&
                !directoryOpen &&
                !mapDrawerOpen &&
                !leaderboardOpen &&
                !questPanelOpen
              }
              playerPosition={playerPosition}
              shellsFound={quest.snapshot?.collectedShellIds.length ?? 0}
              shellsTotal={quest.snapshot?.period.shellSet.shells.length ?? 0}
              checkIns={quest.snapshot?.checkedInVenueIds.length ?? 0}
              onClose={finishTour}
            />
          )}
        </div>
      )}

      {showBottomControls && (
        <>
          <VirtualJoystick
            onMove={handleJoystickMove}
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-20 lg:hidden"
          />
          <MapButton
            onClick={openMapDrawer}
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-20 lg:hidden"
          />
          <MiniMap
            playerPosition={playerPosition}
            target={navigationTarget}
            onNavigate={navigateToPoint}
            onOpenDirectory={openDirectory}
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-20 hidden lg:block"
          />
        </>
      )}

      <MapDrawer
        open={mapDrawerOpen}
        playerPosition={playerPosition}
        target={navigationTarget}
        onNavigate={navigateToPoint}
        onOpenDirectory={openDirectory}
        onClose={closeMapDrawer}
      />

      {status === "ready" &&
        navigationTarget &&
        !selectedVenue &&
        !directoryOpen &&
        !mapDrawerOpen &&
        !leaderboardOpen &&
        !questPanelOpen &&
        !joinDialogOpen &&
        !walkingVenueId && (
          <button
            type="button"
            onClick={cancelNavigation}
            className="pointer-events-auto absolute bottom-6 left-1/2 z-30 hidden min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/20 bg-brand-deep/90 px-3 py-2 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase shadow-lift backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime lg:inline-flex"
          >
            <X aria-hidden="true" className="size-3.5" />
            Stop walking
          </button>
        )}

      {status === "ready" &&
        nearbyVenue &&
        hasMoved &&
        !selectedVenue &&
        !directoryOpen &&
        !mapDrawerOpen &&
        !leaderboardOpen &&
        !navigationTarget &&
        !questPanelOpen &&
        !joinDialogOpen && (
          <VenuePrompt venue={nearbyVenue} onOpen={openNearbyVenue} />
        )}

      {selectedVenue && (
        <VenuePanel
          venue={selectedVenue}
          onClose={closeVenue}
          checkedIn={
            quest.snapshot?.checkedInVenueIds.includes(selectedVenue.id) ??
            false
          }
          checkInPending={checkingInVenueId === selectedVenue.id}
          canCheckIn={canCheckInSelected}
          onCheckIn={checkInSelectedVenue}
          onWalkHere={walkToSelectedVenue}
        />
      )}

      {directoryOpen && (
        <VenueDirectory
          nearbyVenueId={nearbyVenueId}
          onNavigate={navigateToVenue}
          onClose={closeDirectory}
        />
      )}

      {quest.snapshot && questPanelOpen && (
        <QuestPanel
          snapshot={quest.snapshot}
          sync={quest.sync}
          onClose={closeQuestPanel}
          onJoinRequest={openJoinDialog}
          onReplayTour={replayTour}
        />
      )}

      {showJoinDialog && (
        <QuestJoinDialog
          open
          initialName={quest.snapshot?.profile?.displayName ?? ""}
          onJoin={handleJoin}
          onDismiss={dismissJoin}
        />
      )}

      {questCelebration && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center px-6"
        >
          <div className="quest-celebration-pop relative overflow-hidden rounded-[2rem] border border-lime/30 bg-brand-deep/95 px-7 py-5 text-center text-white shadow-lift backdrop-blur-md">
            <span
              aria-hidden="true"
              className="absolute -top-10 left-1/2 size-28 -translate-x-1/2 rounded-full bg-lime/20 blur-2xl"
            />
            <Sparkles
              aria-hidden="true"
              className="relative mx-auto size-6 text-lime"
            />
            <p className="relative mt-2 font-display text-[11px] font-bold tracking-[0.22em] text-lime uppercase">
              Full set
            </p>
            <p className="relative mt-1 font-display text-3xl font-black text-cream">
              +{questCelebration.points}
            </p>
            <p className="relative mt-1 text-xs text-white/75">
              Every shell found today
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
