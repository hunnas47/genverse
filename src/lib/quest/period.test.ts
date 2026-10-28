import { describe, expect, it } from "vitest";

import {
  addDays,
  computeStreak,
  daysBetween,
  formatPeriodLabel,
  getQuestPeriod,
  getShellSetForPeriod,
  toPeriodId,
} from "@/lib/quest/period";
import type { QuestEvent } from "@/types/quest";

function event(periodId: string, kind: QuestEvent["kind"] = "shell"): QuestEvent {
  return {
    id: `${kind}:${periodId}`,
    kind,
    ref: "test",
    periodId,
    points: 0,
    createdAt: `${periodId}T10:00:00+05:30`,
  };
}

describe("quest periods", () => {
  it("rolls over at Asia/Kolkata midnight, not UTC", () => {
    expect(toPeriodId(new Date("2026-11-12T18:29:00Z"))).toBe("2026-11-12");
    expect(toPeriodId(new Date("2026-11-12T18:30:00Z"))).toBe("2026-11-13");
    expect(getQuestPeriod(new Date("2026-11-12T18:30:00Z")).isEventDay).toBe(
      true,
    );
  });

  it("adds and measures calendar days across month and year boundaries", () => {
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-10-01", "2026-11-13")).toBe(43);
  });

  it("rotates shell sets deterministically", () => {
    const first = getShellSetForPeriod("2026-11-13");
    expect(getShellSetForPeriod("2026-11-13").id).toBe(first.id);
    expect(getShellSetForPeriod("2026-11-14").id).not.toBe(first.id);
    expect(getShellSetForPeriod("2026-11-15").id).not.toBe(first.id);
  });

  it("keeps a streak through a day with no activity yet", () => {
    const events = [
      event("2026-11-11"),
      event("2026-11-12"),
      event("2026-11-13", "checkin"),
    ];

    expect(computeStreak(events, "2026-11-13")).toBe(3);
    // Morning of the 14th, before the first find: the 13th still counts.
    expect(computeStreak(events, "2026-11-14")).toBe(3);
    expect(computeStreak(events, "2026-11-15")).toBe(0);
  });

  it("ignores bonus events when counting active days", () => {
    expect(computeStreak([event("2026-11-13", "bonus")], "2026-11-13")).toBe(0);
  });

  it("formats a readable period label", () => {
    expect(formatPeriodLabel("2026-11-13")).toContain("Nov");
  });
});
