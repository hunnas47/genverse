import {
  QUEST_EVENT_DAY_IDS,
  QUEST_ROTATION_EPOCH,
  SHELL_SETS,
} from "@/data/quest";
import type { QuestEvent, QuestPeriod } from "@/types/quest";

const DAY_MS = 86_400_000;

const periodFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const labelFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Formats an instant as the Asia/Kolkata calendar day, e.g. "2026-11-13". */
export function toPeriodId(date: Date): string {
  const parts = periodFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to format the current quest day.");
  }

  return `${year}-${month}-${day}`;
}

function periodIdToUtcMs(periodId: string): number {
  const [year, month, day] = periodId.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid quest period: ${periodId}`);
  }

  return Date.UTC(year, month - 1, day);
}

/** Adds whole calendar days to a YYYY-MM-DD period id. */
export function addDays(periodId: string, days: number): string {
  return new Date(periodIdToUtcMs(periodId) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function daysBetween(fromPeriodId: string, toPeriodId: string): number {
  return Math.round(
    (periodIdToUtcMs(toPeriodId) - periodIdToUtcMs(fromPeriodId)) / DAY_MS,
  );
}

export function isEventDay(periodId: string): boolean {
  return QUEST_EVENT_DAY_IDS.includes(periodId);
}

/** Picks the shell set for a period; stable across clients and the future server. */
export function getShellSetForPeriod(periodId: string) {
  const offset = daysBetween(QUEST_ROTATION_EPOCH, periodId);
  const index = ((offset % SHELL_SETS.length) + SHELL_SETS.length) % SHELL_SETS.length;

  return SHELL_SETS[index];
}

export function getQuestPeriod(now: Date = new Date()): QuestPeriod {
  const id = toPeriodId(now);

  return {
    id,
    shellSet: getShellSetForPeriod(id),
    isEventDay: isEventDay(id),
  };
}

/** Human label for a quest day, e.g. "Fri, 13 Nov". */
export function formatPeriodLabel(periodId: string): string {
  return labelFormatter.format(new Date(`${periodId}T12:00:00+05:30`));
}

/**
 * Counts consecutive active days from a set of period ids. If today has no
 * activity yet, the streak is counted from yesterday so a morning visit does
 * not erase it.
 */
export function computeStreakFromDays(
  activeDays: Iterable<string>,
  todayPeriodId: string,
): number {
  const days = new Set(activeDays);

  let cursor = days.has(todayPeriodId)
    ? todayPeriodId
    : addDays(todayPeriodId, -1);
  let streak = 0;

  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/**
 * Counts consecutive active days from quest events. Bonus events are ignored
 * because they belong to a day that already has a shell or venue event.
 */
export function computeStreak(
  events: readonly QuestEvent[],
  todayPeriodId: string,
): number {
  return computeStreakFromDays(
    events
      .filter((event) => event.kind !== "bonus")
      .map((event) => event.periodId),
    todayPeriodId,
  );
}
