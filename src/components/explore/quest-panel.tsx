"use client";

import {
  ArrowUpRight,
  Check,
  Flame,
  MapPin,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { VENUES } from "@/data/venues";
import { VENUE_CATEGORY_LABELS } from "@/lib/venues";
import { formatPeriodLabel } from "@/lib/quest/period";
import type { QuestSnapshot, QuestSyncInfo } from "@/types/quest";

const MAP_VENUES = VENUES.filter((venue) => venue.mapPosition);

export function QuestPanel({
  snapshot,
  sync,
  onClose,
  onJoinRequest,
}: {
  snapshot: QuestSnapshot;
  sync: QuestSyncInfo;
  onClose: () => void;
  onJoinRequest: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = "quest-panel-title";
  const found = snapshot.collectedShellIds.length;
  const total = snapshot.period.shellSet.shells.length;
  const checkedIn = snapshot.checkedInVenueIds.length;
  const presenceLabel =
    sync.presenceCount === 1
      ? "1 explorer here now"
      : `${sync.presenceCount} explorers here now`;
  const statusMessage =
    sync.status === "online"
      ? sync.pendingCount > 0
        ? `Syncing ${sync.pendingCount} saved ${
            sync.pendingCount === 1 ? "action" : "actions"
          }…`
        : sync.presenceCount > 0
          ? `Shared leaderboard is live · ${presenceLabel}`
          : "Shared leaderboard is live."
      : sync.status === "connecting"
        ? "Connecting to the shared leaderboard…"
        : sync.status === "error"
          ? (sync.error ??
            "Live sync is unavailable. Progress is saved on this device.")
          : sync.status === "offline"
            ? "Offline — progress is saved on this device and will sync automatically."
            : "Live sync is not configured. Progress is saved on this device.";
  const statusDot =
    sync.status === "online"
      ? "bg-brand"
      : sync.status === "connecting"
        ? "bg-brand-deep/40 motion-safe:animate-pulse"
        : "bg-coral";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="pointer-events-none absolute inset-0 z-30"
    >
      <div className="pointer-events-auto absolute inset-x-3 bottom-3 max-h-[min(78dvh,38rem)] overflow-y-auto overscroll-contain rounded-[2rem] border border-brand-deep/15 bg-cream p-5 text-brand-deep shadow-lift sm:inset-x-auto sm:top-24 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-12rem)] sm:w-[400px] sm:p-6">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-brand-deep/20 sm:hidden"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-deep px-2.5 py-1 font-display text-[9px] font-bold tracking-[0.14em] text-lime uppercase">
              <Sparkles aria-hidden="true" className="size-3" />
              Beach Quest
            </span>
            <h2
              id={titleId}
              className="mt-3 text-xl leading-tight font-medium sm:text-2xl"
            >
              {snapshot.period.shellSet.name}
            </h2>
            <p className="mt-1 text-xs text-brand-deep/70">
              {formatPeriodLabel(snapshot.period.id)}
              {snapshot.period.isEventDay ? " · Event day" : ""}
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close the Beach Quest"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-deep/10 text-brand-deep/70 transition hover:bg-brand-deep/15 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-deep/10 bg-brand-deep/5 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="font-display text-[9px] font-bold tracking-[0.18em] text-brand-deep/60 uppercase">
              Explorer
            </p>
            <p className="truncate text-sm font-semibold">
              {snapshot.profile?.displayName || "Guest explorer"}
            </p>
          </div>
          <button
            type="button"
            onClick={onJoinRequest}
            className="min-h-10 shrink-0 rounded-full border border-brand-deep/15 bg-white px-3 py-1.5 font-display text-[9px] font-bold tracking-[0.08em] text-brand-deep uppercase transition hover:border-brand-deep/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            {snapshot.joined ? "Change name" : "Set name"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-brand-deep/10 bg-white/70 px-3 py-2.5 text-center">
            <p className="font-display text-lg font-bold text-brand-deep">
              {snapshot.todayPoints}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.08em] text-brand-deep/60 uppercase">
              Today
            </p>
          </div>
          <div className="rounded-2xl border border-brand-deep/10 bg-white/70 px-3 py-2.5 text-center">
            <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-brand-deep">
              <Trophy aria-hidden="true" className="size-4 text-brand" />
              {snapshot.totalPoints}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.08em] text-brand-deep/60 uppercase">
              Total
            </p>
          </div>
          <div className="rounded-2xl border border-brand-deep/10 bg-white/70 px-3 py-2.5 text-center">
            <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-brand-deep">
              <Flame aria-hidden="true" className="size-4 text-coral" />
              {snapshot.streak}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.08em] text-brand-deep/60 uppercase">
              Streak
            </p>
          </div>
        </div>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[9px] font-bold tracking-[0.2em] text-brand-deep/70 uppercase">
              Today&apos;s shells
            </p>
            <span className="font-display text-[10px] font-bold text-brand-deep/70">
              {found}/{total}
            </span>
          </div>

          <ul className="mt-2 grid grid-cols-5 gap-1.5">
            {snapshot.period.shellSet.shells.map((shell, index) => {
              const isFound = snapshot.collectedShellIds.includes(shell.id);

              return (
                <li
                  key={shell.id}
                  aria-label={`Shell ${index + 1}: ${isFound ? "found" : "still hidden"}`}
                  className={
                    isFound
                      ? "grid aspect-square place-items-center rounded-xl border border-brand/20 bg-lime text-brand-deep"
                      : "grid aspect-square place-items-center rounded-xl border border-brand-deep/10 bg-brand-deep/5 text-brand-deep/35"
                  }
                >
                  {isFound ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <span className="font-display text-[10px] font-bold">
                      {index + 1}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="mt-2 text-[10px] leading-relaxed text-brand-deep/60">
            Walk close to a glowing shell to collect it. Find the full set for a
            50-point bonus.
          </p>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[9px] font-bold tracking-[0.2em] text-brand-deep/70 uppercase">
              Venue passport
            </p>
            <span className="font-display text-[10px] font-bold text-brand-deep/70">
              {checkedIn}/{MAP_VENUES.length}
            </span>
          </div>

          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            {MAP_VENUES.map((venue) => {
              const isCheckedIn = snapshot.checkedInVenueIds.includes(venue.id);

              return (
                <li
                  key={venue.id}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 odd:bg-brand-deep/[0.035]"
                >
                  <span
                    className={
                      isCheckedIn
                        ? "grid size-6 shrink-0 place-items-center rounded-full bg-brand-deep text-lime"
                        : "grid size-6 shrink-0 place-items-center rounded-full border border-brand-deep/15 text-brand-deep/40"
                    }
                  >
                    {isCheckedIn ? (
                      <Check aria-hidden="true" className="size-3" />
                    ) : (
                      <MapPin aria-hidden="true" className="size-3" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">
                      {venue.name}
                    </span>
                    <span className="block text-[9px] text-brand-deep/60 uppercase">
                      {venue.mapLabel} · {VENUE_CATEGORY_LABELS[venue.category]}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-2 text-[10px] leading-relaxed text-brand-deep/60">
            Open a venue and tap check in for 25 points. One stamp per venue per
            day.
          </p>
        </section>

        <div className="mt-5 border-t border-brand-deep/10 pt-3">
          <Link
            href="/leaderboard"
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-brand-deep/[0.04] px-3 py-2 font-display text-[10px] font-bold tracking-[0.1em] text-brand-deep uppercase transition hover:bg-brand-deep/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <span className="flex items-center gap-2">
              <Trophy aria-hidden="true" className="size-4 text-brand" />
              Shared leaderboard
            </span>
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>

          <p className="mt-2.5 flex items-start gap-2 text-[10px] leading-relaxed text-brand-deep/60">
            <span
              aria-hidden="true"
              className={`mt-1 size-1.5 shrink-0 rounded-full ${statusDot}`}
            />
            <span role="status">{statusMessage}</span>
          </p>

          {sync.error &&
            sync.status !== "error" &&
            sync.status !== "offline" &&
            sync.status !== "local" && (
              <p role="status" className="mt-1 text-[10px] leading-relaxed text-coral">
                {sync.error}
              </p>
            )}
        </div>
      </div>
    </aside>
  );
}
