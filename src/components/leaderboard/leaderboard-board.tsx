"use client";

import {
  ArrowUpRight,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ensureAnonymousSession,
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { LeaderboardRow, LeaderboardScope } from "@/types/leaderboard";

const POLL_MS = 30_000;

interface RawLeaderboardRow {
  rank: number | string;
  display_name: string;
  points: number;
  shells: number;
  checkins: number;
  is_you: boolean;
}

interface PresenceResult {
  ok?: boolean;
  count?: number;
}

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
});

function scopeLabel(scope: LeaderboardScope): string {
  return scope === "daily" ? "today" : "all time";
}

export function LeaderboardBoard() {
  const [scope, setScope] = useState<LeaderboardScope>("daily");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const selectScope = (nextScope: LeaderboardScope) => {
    if (nextScope === scope) {
      return;
    }

    setLoading(true);
    setScope(nextScope);
  };

  const refresh = () => {
    setLoading(true);
    setRefreshToken((value) => value + 1);
  };

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const load = async () => {
      if (!isSupabaseConfigured()) {
        if (active) {
          setLoading(false);
          setError(
            "Live sync is not configured yet. Add the Supabase URL and publishable key to enable the shared board.",
          );
        }
        return;
      }

      const supabase = getSupabaseClient();

      if (!supabase) {
        if (active) {
          setLoading(false);
          setError("Live sync is not configured yet.");
        }
        return;
      }

      let sessionReady = false;

      try {
        await ensureAnonymousSession();
        sessionReady = true;
      } catch {
        // The leaderboard RPC is readable by anonymous visitors, so a board can
        // still load even when anonymous auth is unavailable.
      }

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_leaderboard",
          { p_scope: scope, p_limit: 50 },
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!active) {
          return;
        }

        const nextRows = ((data ?? []) as RawLeaderboardRow[])
          .filter(
            (row) =>
              row &&
              typeof row.display_name === "string" &&
              row.display_name.trim().length > 0,
          )
          .map((row) => ({
            rank: Number(row.rank),
            displayName: row.display_name,
            points: Number(row.points),
            shells: Number(row.shells),
            checkins: Number(row.checkins),
            isYou: Boolean(row.is_you),
          }))
          .filter(
            (row) =>
              Number.isFinite(row.rank) &&
              Number.isFinite(row.points) &&
              Number.isFinite(row.shells) &&
              Number.isFinite(row.checkins),
          );

        setRows(nextRows);
        setError(null);
        setUpdatedAt(new Date());
        setLoading(false);

        if (sessionReady) {
          const { data: presenceData } = await supabase.rpc(
            "touch_presence",
          );
          const nextPresence = presenceData as PresenceResult | null;

          if (
            active &&
            nextPresence?.ok &&
            typeof nextPresence.count === "number"
          ) {
            setPresence(nextPresence.count);
          }
        }
      } catch {
        if (active) {
          setLoading(false);
          setError(
            "The live board is taking a break. Check your connection and try again.",
          );
        }
      }
    };

    void load();

    timer = window.setInterval(() => {
      if (!document.hidden) {
        void load();
      }
    }, POLL_MS);

    const handleVisibility = () => {
      if (!document.hidden) {
        void load();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;

      if (timer !== null) {
        window.clearInterval(timer);
      }

      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scope, refreshToken]);

  return (
    <div className="rounded-[2rem] border border-brand-deep/15 bg-cream p-5 text-brand-deep shadow-lift sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-[10px] font-bold tracking-[0.2em] text-brand-deep/60 uppercase">
            {scope === "daily" ? "Today's explorers" : "All-time explorers"}
          </p>
          <p className="mt-1 text-sm text-brand-deep/70">
            Scores are validated on the server. Choose a display name on the
            beach map to appear here.
          </p>
        </div>

        <div
          role="group"
          aria-label="Leaderboard period"
          className="flex shrink-0 rounded-full border border-brand-deep/10 bg-brand-deep/5 p-1"
        >
          {(
            [
              ["daily", "Today"],
              ["all-time", "All time"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() => selectScope(value)}
              className={
                scope === value
                  ? "min-h-11 rounded-full bg-brand-deep px-3.5 py-1.5 font-display text-[9px] font-bold tracking-[0.08em] text-lime uppercase"
                  : "min-h-11 rounded-full px-3.5 py-1.5 font-display text-[9px] font-bold tracking-[0.08em] text-brand-deep/60 uppercase transition hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-brand-deep/10 pt-3 text-[10px] text-brand-deep/60">
        <span className="inline-flex items-center gap-1.5">
          <Users aria-hidden="true" className="size-3.5" />
          {presence > 0
            ? `${presence} ${presence === 1 ? "explorer" : "explorers"} here now`
            : "Waiting for the first check-in"}
        </span>
        {updatedAt && (
          <span>
            Updated {timeFormatter.format(updatedAt)} IST
          </span>
        )}
        <button
          type="button"
          onClick={refresh}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[9px] font-bold tracking-[0.08em] uppercase transition hover:bg-brand-deep/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Refresh
        </button>
      </div>

      <div className="mt-4" aria-busy={loading}>
        {loading ? (
          <div
            className="space-y-2"
            role="status"
            aria-label="Loading the leaderboard"
          >
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="h-16 rounded-2xl bg-brand-deep/5 motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-coral/40 bg-coral/15 px-4 py-5" role="alert">
            <p className="text-sm leading-relaxed text-brand-deep/80">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-deep px-4 py-2 font-display text-[9px] font-bold tracking-[0.08em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-deep/20 bg-white/50 px-5 py-9 text-center">
            <Trophy
              aria-hidden="true"
              className="mx-auto size-8 text-brand-deep/35"
            />
            <p className="mt-3 text-base font-medium">
              No scores {scope === "daily" ? "today" : "yet"}.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-brand-deep/65">
              Find a shell or check in at a venue to claim the first spot.
            </p>
            <Link
              href="/explore"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-deep px-5 py-2.5 font-display text-[10px] font-bold tracking-[0.08em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              Open the beach map
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        ) : (
          <ol
            aria-label={`${scopeLabel(scope)} leaderboard`}
            className="space-y-1.5"
          >
            {rows.map((row) => (
              <li
                key={`${row.rank}-${row.displayName}-${row.points}`}
                className={
                  row.isYou
                    ? "flex items-center gap-3 rounded-2xl border border-brand/25 bg-lime/45 px-3.5 py-3"
                    : "flex items-center gap-3 rounded-2xl border border-brand-deep/8 bg-white/60 px-3.5 py-3 odd:bg-white/80"
                }
              >
                <span
                  aria-label={`Rank ${row.rank}`}
                  className={
                    row.rank <= 3
                      ? "grid size-9 shrink-0 place-items-center rounded-full bg-brand-deep font-display text-xs font-bold text-lime"
                      : "grid size-9 shrink-0 place-items-center rounded-full border border-brand-deep/15 font-display text-xs font-bold text-brand-deep/70"
                  }
                >
                  {row.rank <= 3 ? (
                    <Trophy aria-hidden="true" className="size-4" />
                  ) : (
                    row.rank
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {row.displayName}
                    </span>
                    {row.isYou && (
                      <span className="rounded-full bg-brand-deep px-1.5 py-0.5 font-display text-[8px] font-bold tracking-[0.08em] text-lime uppercase">
                        You
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-brand-deep/60">
                    {row.shells} {row.shells === 1 ? "shell" : "shells"} ·{" "}
                    {row.checkins}{" "}
                    {row.checkins === 1 ? "venue stamp" : "venue stamps"}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-display text-lg font-bold">
                    {row.points}
                  </span>
                  <span className="block text-[9px] font-semibold tracking-[0.08em] text-brand-deep/50 uppercase">
                    points
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="mt-5 border-t border-brand-deep/10 pt-3 text-[10px] leading-relaxed text-brand-deep/55">
        The board refreshes every 30 seconds. One shell and one stamp per venue
        per day; the full shell set adds a 50-point bonus. Server checks stop
        duplicate and rapid submissions, but walking to a shell is an
        on-device rule. Names can be moderated by the event team.
      </p>
    </div>
  );
}
