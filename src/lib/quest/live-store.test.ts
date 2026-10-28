import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getQuestPeriod } from "@/lib/quest/period";
import { LiveQuestStore } from "@/lib/quest/live-store";
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

interface RemoteState {
  ok: true;
  player: { id: string; display_name: string; is_hidden: boolean } | null;
  period: string;
  collected_shell_ids: string[];
  checked_in_venue_ids: string[];
  today_points: number;
  total_points: number;
  active_days: string[];
  streak: number;
}

interface QueuedAction {
  id: string;
  kind: "shell" | "checkin";
  ref: string;
  periodId: string;
  createdAt: string;
}

interface LiveInternals {
  remote: RemoteState | null;
  pending: QueuedAction[];
  pendingName: string | null;
}

let now = new Date("2026-11-13T10:00:00+05:30");
let live: LiveQuestStore | null = null;

function advance(ms: number): void {
  now = new Date(now.getTime() + ms);
  vi.setSystemTime(now);
}

function createLocal(): QuestStore {
  return new QuestStore({ storage: new MemoryStorage(), now: () => now });
}

function createRemote(overrides: Partial<RemoteState> = {}): RemoteState {
  return {
    ok: true,
    player: { id: "server-player", display_name: "Ayesha K", is_hidden: false },
    period: getQuestPeriod().id,
    collected_shell_ids: [],
    checked_in_venue_ids: [],
    today_points: 0,
    total_points: 0,
    active_days: [],
    streak: 0,
    ...overrides,
  };
}

function createLive(local: QuestStore): {
  store: LiveQuestStore;
  internals: LiveInternals;
} {
  const store = new LiveQuestStore(local);
  live = store;
  return { store, internals: store as unknown as LiveInternals };
}

beforeEach(() => {
  now = new Date("2026-11-13T10:00:00+05:30");
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  live?.dispose();
  live = null;
  vi.useRealTimers();
});

describe("LiveQuestStore snapshot merging", () => {
  it("lays local offline finds over a cached server snapshot", () => {
    const local = createLocal();
    const shells = getQuestPeriod().shellSet.shells;

    expect(local.join("Ayesha K").ok).toBe(true);
    expect(local.collectShell(shells[0].id).accepted).toBe(true);

    const { store, internals } = createLive(local);
    internals.remote = createRemote({ total_points: 100 });

    const snapshot = store.getSnapshot();

    expect(snapshot.profile?.displayName).toBe("Ayesha K");
    expect(snapshot.collectedShellIds).toEqual([shells[0].id]);
    expect(snapshot.todayPoints).toBe(10);
    expect(snapshot.totalPoints).toBe(110);
    expect(snapshot.streak).toBe(1);
  });

  it("does not double-count a find that is already on the server", () => {
    const local = createLocal();
    const shells = getQuestPeriod().shellSet.shells;

    local.join("Ayesha K");
    local.collectShell(shells[0].id);

    const { store, internals } = createLive(local);
    internals.remote = createRemote({
      collected_shell_ids: [shells[0].id],
      today_points: 10,
      total_points: 110,
      active_days: [getQuestPeriod().id],
    });

    const snapshot = store.getSnapshot();

    expect(snapshot.collectedShellIds).toEqual([shells[0].id]);
    expect(snapshot.todayPoints).toBe(10);
    expect(snapshot.totalPoints).toBe(110);
    expect(snapshot.streak).toBe(1);
  });

  it("adds the full-set bonus once while a complete set is pending", () => {
    const local = createLocal();
    const shells = getQuestPeriod().shellSet.shells;

    local.join("Ayesha K");

    for (const shell of shells) {
      advance(2_000);
      expect(local.collectShell(shell.id).accepted).toBe(true);
    }

    const { store, internals } = createLive(local);
    internals.remote = createRemote();

    let snapshot = store.getSnapshot();
    expect(snapshot.collectedShellIds).toHaveLength(shells.length);
    expect(snapshot.todayPoints).toBe(shells.length * 10 + 50);
    expect(snapshot.totalPoints).toBe(shells.length * 10 + 50);

    internals.remote = createRemote({
      collected_shell_ids: shells.map((shell) => shell.id),
      today_points: shells.length * 10 + 50,
      total_points: shells.length * 10 + 50,
      active_days: [getQuestPeriod().id],
    });

    snapshot = store.getSnapshot();
    expect(snapshot.todayPoints).toBe(shells.length * 10 + 50);
    expect(snapshot.totalPoints).toBe(shells.length * 10 + 50);
  });

  it("keeps local finds visible even when the pending queue is empty", () => {
    const local = createLocal();
    const shells = getQuestPeriod().shellSet.shells;

    local.join("Ayesha K");
    local.collectShell(shells[0].id);

    const { store, internals } = createLive(local);
    internals.remote = createRemote();
    internals.pending = [];

    const snapshot = store.getSnapshot();

    expect(snapshot.collectedShellIds).toEqual([shells[0].id]);
    expect(snapshot.todayPoints).toBe(10);
    expect(snapshot.totalPoints).toBe(10);
  });

  it("prefers a pending rename over the cached server name", () => {
    const local = createLocal();

    local.join("New Name");

    const { store, internals } = createLive(local);
    internals.remote = createRemote({
      player: {
        id: "server-player",
        display_name: "Old Name",
        is_hidden: false,
      },
    });
    internals.pendingName = "New Name";

    const snapshot = store.getSnapshot();

    expect(snapshot.profile?.displayName).toBe("New Name");
    expect(snapshot.joined).toBe(true);
  });

  it("prefers a pending rename while offline", () => {
    const local = createLocal();

    local.join("Old Name");

    const { store, internals } = createLive(local);
    internals.remote = null;
    internals.pendingName = "New Name";

    const snapshot = store.getSnapshot();

    expect(snapshot.profile?.displayName).toBe("New Name");
    expect(snapshot.profile?.id).toBe(local.getProfile()?.id);
    expect(snapshot.joined).toBe(true);
  });

  it("queues a local action created after the live store starts", () => {
    const local = createLocal();
    const shells = getQuestPeriod().shellSet.shells;

    const { store, internals } = createLive(local);
    internals.remote = createRemote();

    expect(local.join("Ayesha K").ok).toBe(true);
    expect(local.collectShell(shells[0].id).accepted).toBe(true);

    expect(internals.pending).toHaveLength(1);
    expect(internals.pending[0]?.ref).toBe(shells[0].id);
    expect(store.getSnapshot().collectedShellIds).toEqual([shells[0].id]);
  });
});
