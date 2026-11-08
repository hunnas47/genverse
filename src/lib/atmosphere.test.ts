import { describe, expect, it } from "vitest";

import { getAtmospherePhase, getIstMinuteOfDay } from "@/lib/atmosphere";

/** A UTC timestamp for a wall-clock time in Asia/Kolkata. */
function ist(time: string): number {
  return Date.parse(`2026-11-14T${time}:00+05:30`);
}

describe("getIstMinuteOfDay", () => {
  it("reads the Kozhikode wall clock regardless of the UTC date", () => {
    expect(getIstMinuteOfDay(ist("00:00"))).toBe(0);
    expect(getIstMinuteOfDay(ist("05:29"))).toBe(5 * 60 + 29);
    expect(getIstMinuteOfDay(ist("23:59"))).toBe(23 * 60 + 59);
  });
});

describe("getAtmospherePhase", () => {
  it.each([
    ["02:00", "night"],
    ["05:59", "night"],
    ["06:00", "day"],
    ["12:00", "day"],
    ["16:29", "day"],
    ["16:30", "golden"],
    ["17:49", "golden"],
    ["17:50", "dusk"],
    ["18:39", "dusk"],
    ["18:40", "night"],
    ["21:30", "night"],
  ] as const)("%s IST is %s", (time, phase) => {
    expect(getAtmospherePhase(ist(time))).toBe(phase);
  });
});
