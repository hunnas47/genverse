"use client";

import { Home, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LeaderboardOverlay } from "@/components/explore/leaderboard-overlay";
import { AVATAR_ASSETS } from "@/game/avatar";
import type { QuestSnapshot } from "@/types/quest";

const HUD_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-brand-deep/85 text-lime shadow-lift backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

function ProfileButton({
  snapshot,
  onOpen,
}: {
  snapshot: QuestSnapshot | null;
  onOpen: () => void;
}) {
  const found = snapshot?.collectedShellIds.length ?? 0;
  const total = snapshot?.period.shellSet.shells.length ?? 0;
  const progress = total > 0 ? Math.min(100, (found / total) * 100) : 0;
  const name = snapshot?.profile?.displayName;
  const joined = snapshot?.joined ?? false;
  const label = joined
    ? `${name ?? "Explorer"} profile. ${snapshot?.todayPoints ?? 0} points today, ${found} of ${total} shells found. Open your Beach Quest profile.`
    : "Open the explorer profile and join the Beach Quest.";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      title={joined ? "Your profile" : "Join the Beach Quest"}
      data-testid="profile-button"
      className="relative grid size-11 shrink-0 place-items-center rounded-full border border-white/25 bg-brand-deep/85 shadow-lift backdrop-blur-md transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
    >
      <span aria-hidden="true" className="absolute inset-0 rounded-full bg-white/15" />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--lime) ${progress}%, transparent 0)`,
        }}
      />
      <span className="relative size-10 overflow-hidden rounded-full border border-brand-deep/30 bg-lavender">
        <Image
          src={AVATAR_ASSETS.down}
          alt=""
          fill
          sizes="40px"
          className="object-cover object-top"
        />
      </span>

      {joined && found > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-brand-deep bg-lime px-1 font-display text-[9px] font-bold text-brand-deep"
        >
          {found}
        </span>
      ) : !joined ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-brand-deep bg-lime"
        />
      ) : null}
    </button>
  );
}

export function ExploreHud({
  snapshot,
  leaderboardOpen,
  onOpenProfile,
  onOpenLeaderboard,
  onCloseLeaderboard,
}: {
  snapshot: QuestSnapshot | null;
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
          <div className="hidden min-w-0 items-center rounded-2xl border border-white/15 bg-brand-deep/85 p-2 pr-4 text-white shadow-lift backdrop-blur-md lg:flex">
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
          <ProfileButton snapshot={snapshot} onOpen={onOpenProfile} />

          <button
            type="button"
            onClick={onOpenLeaderboard}
            aria-label="Open the Beach Quest leaderboard"
            title="Leaderboard"
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
