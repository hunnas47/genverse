import { describe, expect, it } from "vitest";

import { getQuestPeriod } from "@/lib/quest/period";
import { QuestStore, type QuestStorage } from "@/lib/quest/store";

class MemoryStorage implements QuestStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function advance(ms: number): void {
  now = new Date(now.getTime() + ms);
}

let now = new Date("2026-11-13T10:00:00+05:30");

function createStore(storage = new MemoryStorage()): QuestStore {
  return new QuestStore({ storage, now: () => now });
}

describe("QuestStore", () => {
  it("starts empty and joins with a display name", () => {
    now = new Date("2026-11-13T10:00:00+05:30");
    const store = createStore();

    expect(store.getSnapshot().profile).toBeNull();
    expect(store.getSnapshot().joined).toBe(false);

    expect(store.join("Ayesha K").ok).toBe(true);

    const snapshot = store.getSnapshot();
    expect(snapshot.joined).toBe(true);
    expect(snapshot.profile?.displayName).toBe("Ayesha K");
    expect(snapshot.todayPoints).toBe(0);
  });

  it("collects each shell once with a cooldown", () => {
    now = new Date("2026-11-13T10:00:00+05:30");
    const store = createStore();
    const shells = getQuestPeriod(now).shellSet.shells;

    store.join("Ayesha K");

    const first = store.collectShell(shells[0].id);
    expect(first).toEqual({ accepted: true, points: 10, bonusPoints: 0 });

    expect(store.collectShell(shells[0].id)).toEqual({
      accepted: false,
      reason: "already-collected",
    });
    expect(store.collectShell(shells[1].id)).toEqual({
      accepted: false,
      reason: "cooldown",
    });

    advance(2_000);
    expect(store.collectShell(shells[1].id).accepted).toBe(true);
    expect(store.getSnapshot().todayPoints).toBe(20);
  });

  it("awards the set bonus after the last shell", () => {
    now = new Date("2026-11-13T10:00:00+05:30");
    const store = createStore();
    const shells = getQuestPeriod(now).shellSet.shells;

    store.join("Ayesha K");

    let lastResult: ReturnType<QuestStore["collectShell"]> | null = null;

    for (const shell of shells) {
      advance(2_000);
      lastResult = store.collectShell(shell.id);
      expect(lastResult.accepted).toBe(true);
    }

    expect(lastResult).toEqual({
      accepted: true,
      points: 10,
      bonusPoints: 50,
    });

    const snapshot = store.getSnapshot();
    expect(snapshot.collectedShellIds).toHaveLength(shells.length);
    expect(snapshot.todayPoints).toBe(shells.length * 10 + 50);
    expect(snapshot.streak).toBe(1);
  });

  it("checks in once per venue per day and skips venues without a map position", () => {
    now = new Date("2026-11-13T10:00:00+05:30");
    const store = createStore();

    store.join("Ayesha K");

    expect(store.checkInVenue("s1")).toEqual({
      accepted: true,
      points: 25,
      bonusPoints: 0,
    });
    expect(store.checkInVenue("s1")).toEqual({
      accepted: false,
      reason: "already-checked-in",
    });
    expect(store.checkInVenue("s7")).toEqual({
      accepted: false,
      reason: "unknown-venue",
    });
    expect(store.checkInVenue("nope")).toEqual({
      accepted: false,
      reason: "unknown-venue",
    });
    expect(store.getSnapshot().checkedInVenueIds).toEqual(["s1"]);
  });

  it("rotates the hunt at midnight while keeping totals and streak", () => {
    now = new Date("2026-11-13T10:00:00+05:30");
    const storage = new MemoryStorage();
    const store = createStore(storage);
    const dayOne = getQuestPeriod(now).shellSet.shells;

    store.join("Ayesha K");
    advance(2_000);
    store.collectShell(dayOne[0].id);
    store.checkInVenue("s2");

    expect(store.getSnapshot().totalPoints).toBe(35);

    now = new Date("2026-11-14T10:00:00+05:30");
    const dayTwo = store.getSnapshot();

    expect(dayTwo.collectedShellIds).toEqual([]);
    expect(dayTwo.checkedInVenueIds).toEqual([]);
    expect(dayTwo.todayPoints).toBe(0);
    expect(dayTwo.totalPoints).toBe(35);
    // Yesterday still counts until today's first find.
    expect(dayTwo.streak).toBe(1);
    expect(dayTwo.period.shellSet.id).not.toBe(
      getQuestPeriod(new Date("2026-11-13T10:00:00+05:30")).shellSet.id,
    );

    expect(store.collectShell(dayOne[0].id)).toEqual({
      accepted: false,
      reason: "unknown-shell",
    });

    advance(2_000);
    expect(store.collectShell(dayTwo.period.shellSet.shells[0].id).accepted).toBe(
      true,
    );
    expect(store.getSnapshot().streak).toBe(2);
  });

  it("persists local progress and keeps the same guest profile when joining", () => {
    now = new Date("2026-11-13T10:00:00+05:30");
    const storage = new MemoryStorage();
    const store = createStore(storage);
    const shells = getQuestPeriod(now).shellSet.shells;

    advance(2_000);
    expect(store.collectShell(shells[0].id).accepted).toBe(true);

    const guest = store.getSnapshot();
    expect(guest.profile).not.toBeNull();
    expect(guest.joined).toBe(false);

    expect(store.join("Noor").ok).toBe(true);
    expect(store.getSnapshot().profile?.id).toBe(guest.profile?.id);

    const reopened = createStore(storage);
    expect(reopened.getSnapshot().totalPoints).toBe(10);
    expect(reopened.getSnapshot().profile?.displayName).toBe("Noor");
  });

  it("does not carry the shell cooldown into the next day", () => {
    now = new Date("2026-11-13T23:59:59.500+05:30");
    const store = createStore();

    store.join("Ayesha K");

    const dayOneShell = getQuestPeriod(now).shellSet.shells[0];
    expect(store.collectShell(dayOneShell.id).accepted).toBe(true);

    now = new Date("2026-11-14T00:00:00.000+05:30");
    const dayTwoShell = getQuestPeriod(now).shellSet.shells[0];

    expect(store.collectShell(dayTwoShell.id).accepted).toBe(true);
  });

  it("ignores corrupt stored data instead of crashing", () => {
    const storage = new MemoryStorage();
    storage.setItem("genm:quest:v1", "{not json");

    const store = createStore(storage);
    expect(store.getSnapshot().profile).toBeNull();
    expect(store.getSnapshot().totalPoints).toBe(0);
  });
});
