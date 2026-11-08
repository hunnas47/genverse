"use client";

import { Sparkles, Trophy, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { LeaderboardBoard } from "@/components/leaderboard/leaderboard-board";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LeaderboardOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = "explore-leaderboard-title";

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

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-brand-deep/80 p-0 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(event) => {
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
        className="relative flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-lime/20 bg-brand-deep text-white shadow-[0_28px_90px_rgba(16,18,44,0.6)] sm:max-h-[90dvh] sm:rounded-[2rem]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-24 -right-16 size-64 rounded-full bg-lime/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 size-64 rounded-full bg-coral/15 blur-3xl" />
          <div className="grain absolute inset-0 opacity-[0.05]" />
        </div>

        <header className="relative flex items-start justify-between gap-4 border-b border-white/10 px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime text-brand-deep shadow-lift">
              <Trophy aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold tracking-[0.2em] text-lime uppercase">
                <Sparkles aria-hidden="true" className="size-3" />
                Beach Quest
              </p>
              <h2
                id={titleId}
                className="mt-0.5 truncate font-display text-2xl leading-none font-black tracking-[0.02em] text-cream uppercase sm:text-3xl"
              >
                Leaderboard
              </h2>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the leaderboard"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white/75 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="relative overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2.5">
              <p className="font-display text-lg font-black text-lime">10</p>
              <p className="font-display text-[11px] font-bold tracking-[0.1em] text-white/55 uppercase">
                shells
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2.5">
              <p className="font-display text-lg font-black text-lime">+25</p>
              <p className="font-display text-[11px] font-bold tracking-[0.1em] text-white/55 uppercase">
                per stamp
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2.5">
              <p className="font-display text-lg font-black text-lime">+50</p>
              <p className="font-display text-[11px] font-bold tracking-[0.1em] text-white/55 uppercase">
                full set
              </p>
            </div>
          </div>

          <LeaderboardBoard showPodium />
        </div>
      </section>
    </div>
  );
}
