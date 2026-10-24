"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

type GameStatus = "loading" | "ready" | "error";

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const container: HTMLDivElement = host;

    let cancelled = false;

    async function boot() {
      try {
        const { createGame } = await import("@/game/create-game");
        if (cancelled) {
          return;
        }

        const game = await createGame({
          parent: container,
          onReady: () => {
            if (!cancelled) {
              setStatus("ready");
            }
          },
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
      const game = gameRef.current;
      gameRef.current = null;
      game?.destroy(true);
      container.replaceChildren();
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <div
        ref={hostRef}
        role="application"
        aria-label="GEN M beach explorer preview. Walk with W, A, S, D or the arrow keys."
        tabIndex={0}
        className="h-full w-full touch-none select-none outline-none [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      />

      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b6f8e] px-6">
          {status === "error" ? (
            <div
              role="alert"
              className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#0b2f36]/90 p-5 text-center text-white shadow-2xl"
            >
              <p className="text-sm font-semibold">The beach did not load</p>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                {errorMessage ?? "An unexpected error stopped the game."}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0b2f36] transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white">
              <span
                aria-hidden="true"
                className="size-8 rounded-full border-2 border-white/25 border-t-white motion-safe:animate-spin"
              />
              <p className="text-xs font-medium tracking-[0.22em] uppercase">
                Preparing the beach
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
