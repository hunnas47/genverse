"use client";

import { Home, Shell, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LeaderboardOverlay } from "@/components/explore/leaderboard-overlay";
import { AVATAR_ASSETS } from "@/game/avatar";
import { cn } from "@/lib/utils";
import type { QuestSnapshot, QuestSyncInfo } from "@/types/quest";

const HUD_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-brand-deep/85 text-lime shadow-lift sm:backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

function ProfileButton({
  snapshot,
  sync,
  onOpen,
}: {
  snapshot: QuestSnapshot | null;
  sync: QuestSyncInfo;
  onOpen: () => void;
}) {
  // "local" means no backend is configured, which is not an outage.
  const offline = sync.status === "offline" || sync.status === "error";
  const found = snapshot?.collectedShellIds.length ?? 0;
  const total = snapshot?.period.shellSet.shells.length ?? 0;
  const points = snapshot?.todayPoints ?? 0;
  const progress = total > 0 ? Math.min(100, (found / total) * 100) : 0;
  const name = snapshot?.profile?.displayName;
  const joined = snapshot?.joined ?? false;
  const baseLabel = joined
    ? `${name ?? "Explorer"} profile. ${points} points today, ${found} of ${total} shells found. Open your Beach Quest profile.`
    : `Beach Quest: ${found} of ${total} shells found today. Open the quest and choose a name to join the leaderboard.`;
  const label = offline
    ? `${baseLabel} Offline: your progress is saved on this phone and will sync when you reconnect.`
    : baseLabel;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      title={joined ? "Your profile" : "Join the Beach Quest"}
      data-testid="profile-button"
      data-tour="profile"
      className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/25 bg-brand-deep/85 py-0.5 pr-3.5 pl-0.5 text-white shadow-lift sm:backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
    >
      <span className="relative grid size-10 shrink-0 place-items-center">
        {offline && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -left-0.5 z-10 size-3 rounded-full border-2 border-brand-deep bg-coral"
          />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-white/15"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(var(--lime) ${progress}%, transparent 0)`,
          }}
        />
        <span className="relative size-9 overflow-hidden rounded-full border border-brand-deep/30 bg-lavender">
          <Image
            src={AVATAR_ASSETS.down}
            alt=""
            fill
            sizes="36px"
            className="object-cover object-top"
          />
        </span>
      </span>

      <span aria-hidden="true" className="flex flex-col items-start leading-none">
        <span
          key={found}
          className={cn(
            "flex items-center gap-1 font-display text-[13px] font-bold text-lime tabular-nums",
            found > 0 && "quest-chip-pop",
          )}
        >
          <Shell className="size-3.5" />
          {found}/{total}
        </span>
        <span
          className={cn(
            "mt-1 font-display text-[9px] font-bold tracking-[0.14em] uppercase",
            offline ? "text-coral" : "text-white/75",
          )}
        >
          {offline ? "Saved offline" : joined ? `${points} pts` : "Join quest"}
        </span>
      </span>
    </button>
  );
}

export function ExploreHud({
  snapshot,
  sync,
  leaderboardOpen,
  onOpenProfile,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: {
  snapshot: QuestSnapshot | null;
  sync: QuestSyncInfo;
  leaderboardOpen: boolean;
  onOpenProfile: () => void;
  onOpenLeaderboard: () => void;
  onCloseLeaderboard: () => void;
}) {
  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <Link
            href="/"
            aria-label="Back to the GEN M home page"
            title="Home"
            className={HUD_BUTTON}
          >
            <Home aria-hidden="true" className="size-4" />
          </Link>
          <div className="hidden min-w-0 items-center rounded-2xl border border-white/15 bg-brand-deep/85 p-2 pr-4 text-white shadow-lift sm:backdrop-blur-md lg:flex">
            <div>
              <Image
                src="/images/genm-logo.png"
                alt="GEN M"
                width={512}
                height={177}
                loading="eager"
                className="h-7 w-auto"
              />
              <p className="mt-1 font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
                Genverse Explorer
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <ProfileButton
            snapshot={snapshot}
            sync={sync}
            onOpen={onOpenProfile}
          />

          <button
            type="button"
            onClick={onOpenLeaderboard}
            aria-label="Open the Beach Quest leaderboard"
            title="Leaderboard"
            data-tour="leaderboard"
            className={HUD_BUTTON}
          >
            <Trophy aria-hidden="true" className="size-5" />
          </button>
        </div>
      </header>

      <LeaderboardOverlay open={leaderboardOpen} onClose={onCloseLeaderboard} />
    </>
  );
}
