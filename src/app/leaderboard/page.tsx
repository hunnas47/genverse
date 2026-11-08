import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

import { LeaderboardBoard } from "@/components/leaderboard/leaderboard-board";
import { ActionLink } from "@/components/site/action-link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  SHELL_POINTS,
  SHELL_SET_BONUS,
  VENUE_CHECKIN_POINTS,
} from "@/data/quest";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Beach Quest leaderboard",
  description:
    "See who is leading the GEN M Beach Quest today and all time. Find shells and stamp venues on the beach map to climb the board.",
  path: "/leaderboard",
});

export default function LeaderboardPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-brand-deep text-white">
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_100%_at_18%_0%,rgba(89,100,174,0.62)_0%,rgba(44,45,111,0.18)_55%,rgba(44,45,111,0.98)_100%)]" />
          <div className="grain absolute inset-0 opacity-[0.06]" />
        </div>
        <div
          aria-hidden="true"
          className="absolute -top-24 right-0 size-80 rounded-full bg-lime/10 blur-3xl"
        />

        <SiteHeader />

        <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16 lg:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/25 bg-lime/10 px-3 py-1.5 font-display text-[11px] font-bold tracking-[0.18em] text-lime uppercase">
              <Sparkles aria-hidden="true" className="size-3" />
              Beach Quest
            </span>
            <h1 className="mt-4 text-[clamp(3.2rem,8vw,6.5rem)] leading-[0.94] font-medium tracking-[-0.02em] text-cream">
              Leaderboard
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              Explore the beach, find today&apos;s shells, and stamp your venue
              passport. The board resets each day at midnight in Kozhikode, so
              there is always a reason to come back.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ActionLink href="/explore">
              Open the beach map
              <ArrowRight aria-hidden="true" className="size-4" />
            </ActionLink>
            <ActionLink href="/sessions" variant="outline">
              Official programme
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </ActionLink>
          </div>

          <p className="mt-4 text-[11px] text-white/55">
            Resets daily at midnight IST · Shell {SHELL_POINTS} points · Venue
            stamp {VENUE_CHECKIN_POINTS} points · Full shell set +
            {SHELL_SET_BONUS}
          </p>

          <div className="mt-8">
            <LeaderboardBoard showPodium />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
