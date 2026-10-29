"use client";

import { ChevronRight, Flame, Sparkles } from "lucide-react";

import type { QuestSnapshot } from "@/types/quest";

export function QuestHud({
  snapshot,
  onOpen,
}: {
  snapshot: QuestSnapshot;
  onOpen: () => void;
}) {
  const found = snapshot.collectedShellIds.length;
  const total = snapshot.period.shellSet.shells.length;
  const stamps = snapshot.checkedInVenueIds.length;
  const name = snapshot.profile?.displayName;
  const progress = total > 0 ? Math.min(100, (found / total) * 100) : 0;

  return (
    <div className="pointer-events-none absolute top-20 left-3 z-20 sm:top-24 sm:left-5">
      <button
        type="button"
        onClick={onOpen}
        aria-label={
          snapshot.joined
            ? `${name ?? "Explorer"}: ${snapshot.todayPoints} points today, ${found} of ${total} shells found, ${stamps} venue stamps. Open the Beach Quest.`
            : "Join the Beach Quest and start finding shells. Open the Beach Quest."
        }
        className="pointer-events-auto flex w-[min(13.5rem,calc(100vw-1.5rem))] items-center gap-2 rounded-2xl border border-white/15 bg-brand-deep/85 p-2 text-left text-white shadow-lift backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime text-brand-deep">
          <Sparkles aria-hidden="true" className="size-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[10px] font-bold tracking-[0.16em] text-lime uppercase">
            {snapshot.joined ? (name ?? "Explorer") : "Join the quest"}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-white/85">
            <span
              key={snapshot.todayPoints}
              className="quest-chip-pop inline-block"
            >
              {snapshot.todayPoints} pts
            </span>
            <span aria-hidden="true" className="text-white/35">
              ·
            </span>
            <span>
              {found}/{total} shells
            </span>
          </span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/15">
            <span
              className="block h-full rounded-full bg-lime transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </span>
        </span>

        {snapshot.streak > 1 ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-1.5 py-1 text-[10px] font-semibold text-lime"
            title={`${snapshot.streak}-day streak`}
          >
            <Flame aria-hidden="true" className="size-3" />
            {snapshot.streak}
          </span>
        ) : (
          <ChevronRight
            aria-hidden="true"
            className="size-3.5 shrink-0 text-white/45"
          />
        )}
      </button>
    </div>
  );
}
