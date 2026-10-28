import {
  SHELLS_BY_ID,
  SHELL_COLLECT_COOLDOWN_MS,
  SHELL_POINTS,
  SHELL_SET_BONUS,
  VENUE_CHECKIN_POINTS,
} from "@/data/quest";
import { VENUES_BY_ID } from "@/data/venues";
import { normalizeDisplayName, validateDisplayName } from "@/lib/quest/name";
import { computeStreak, getQuestPeriod } from "@/lib/quest/period";
import type {
  QuestActionResult,
  QuestEvent,
  QuestNameResult,
  QuestProfile,
  QuestSnapshot,
} from "@/types/quest";

const STORAGE_KEY = "genm:quest:v1";

export interface QuestStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredQuest {
  version: 1;
  profile: QuestProfile | null;
  events: QuestEvent[];
}

export interface QuestStoreOptions {
  storage?: QuestStorage;
  now?: () => Date;
}

function createMemoryStorage(): QuestStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

const fallbackStorage = createMemoryStorage();

function defaultStorage(): QuestStorage {
  if (typeof window !== "undefined") {
    try {
      return window.localStorage;
    } catch {
      // Storage can be blocked in private or embedded browsing modes.
    }
  }

  return fallbackStorage;
}

function createPlayerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isQuestProfile(value: unknown): value is QuestProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<QuestProfile>;

  return (
    typeof profile.id === "string" &&
    typeof profile.displayName === "string" &&
    typeof profile.joinedAt === "string"
  );
}

function isQuestEvent(value: unknown): value is QuestEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<QuestEvent>;

  return (
    typeof event.id === "string" &&
    (event.kind === "shell" ||
      event.kind === "checkin" ||
      event.kind === "bonus") &&
    typeof event.ref === "string" &&
    typeof event.periodId === "string" &&
    typeof event.points === "number" &&
    typeof event.createdAt === "string"
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function sumPoints(events: readonly QuestEvent[]): number {
  return events.reduce((total, event) => total + event.points, 0);
}

/**
 * Local-first quest store.
 *
 * It mirrors the shape the Supabase RPCs will expose: server-owned day,
 * append-only events, idempotent ids, and a cooldown. Nothing here should be
 * trusted for a public ranking once sync lands.
 */
export class QuestStore {
  private readonly storage: QuestStorage;
  private readonly now: () => Date;
  private readonly listeners = new Set<() => void>();

  constructor({ storage, now }: QuestStoreOptions = {}) {
    this.storage = storage ?? defaultStorage();
    this.now = now ?? (() => new Date());
  }

  getSnapshot(): QuestSnapshot {
    const period = getQuestPeriod(this.now());
    const data = this.read();
    const periodEvents = data.events.filter(
      (event) => event.periodId === period.id,
    );

    return {
      profile: data.profile,
      period,
      collectedShellIds: unique(
        periodEvents
          .filter((event) => event.kind === "shell")
          .map((event) => event.ref),
      ),
      checkedInVenueIds: unique(
        periodEvents
          .filter((event) => event.kind === "checkin")
          .map((event) => event.ref),
      ),
      todayPoints: sumPoints(periodEvents),
      totalPoints: sumPoints(data.events),
      streak: computeStreak(data.events, period.id),
      joined: Boolean(data.profile?.displayName),
    };
  }

  join(rawName: string): QuestNameResult {
    const result = validateDisplayName(rawName);

    if (!result.ok) {
      return result;
    }

    const data = this.read();
    const now = this.now();
    const profile = data.profile ?? {
      id: createPlayerId(),
      displayName: "",
      joinedAt: now.toISOString(),
    };

    data.profile = { ...profile, displayName: result.value };
    this.write(data);
    this.notify();

    return { ok: true, value: normalizeDisplayName(result.value) };
  }

  collectShell(shellId: string): QuestActionResult {
    const now = this.now();
    const period = getQuestPeriod(now);
    const shell = SHELLS_BY_ID.get(shellId);

    if (!shell || shell.setId !== period.shellSet.id) {
      return { accepted: false, reason: "unknown-shell" };
    }
    const data = this.read();
    const eventId = `shell:${shellId}:${period.id}`;

    if (data.events.some((event) => event.id === eventId)) {
      return { accepted: false, reason: "already-collected" };
    }

    if (this.isTooFast(data.events, now, period.id)) {
      return { accepted: false, reason: "cooldown" };
    }

    const collectedThisPeriod = data.events.filter(
      (event) => event.kind === "shell" && event.periodId === period.id,
    ).length;
    const events: QuestEvent[] = [
      ...data.events,
      {
        id: eventId,
        kind: "shell",
        ref: shellId,
        periodId: period.id,
        points: SHELL_POINTS,
        createdAt: now.toISOString(),
      },
    ];

    let bonusPoints = 0;
    const bonusId = `bonus:shells:${period.id}`;

    if (
      collectedThisPeriod + 1 >= period.shellSet.shells.length &&
      !data.events.some((event) => event.id === bonusId)
    ) {
      bonusPoints = SHELL_SET_BONUS;
      events.push({
        id: bonusId,
        kind: "bonus",
        ref: "shell-set",
        periodId: period.id,
        points: SHELL_SET_BONUS,
        createdAt: now.toISOString(),
      });
    }

    this.write({
      ...data,
      profile: this.ensureProfile(data, now),
      events,
    });
    this.notify();

    return { accepted: true, points: SHELL_POINTS, bonusPoints };
  }

  checkInVenue(venueId: string): QuestActionResult {
    const venue = VENUES_BY_ID.get(venueId);

    if (!venue?.mapPosition) {
      return { accepted: false, reason: "unknown-venue" };
    }

    const now = this.now();
    const period = getQuestPeriod(now);
    const eventId = `checkin:${venueId}:${period.id}`;
    const data = this.read();

    if (data.events.some((event) => event.id === eventId)) {
      return { accepted: false, reason: "already-checked-in" };
    }

    this.write({
      ...data,
      profile: this.ensureProfile(data, now),
      events: [
        ...data.events,
        {
          id: eventId,
          kind: "checkin",
          ref: venueId,
          periodId: period.id,
          points: VENUE_CHECKIN_POINTS,
          createdAt: now.toISOString(),
        },
      ],
    });
    this.notify();

    return {
      accepted: true,
      points: VENUE_CHECKIN_POINTS,
      bonusPoints: 0,
    };
  }

  /**
   * Exposes the stored events so the sync layer can queue unsent finds without
   * duplicating the local scoring rules.
   */
  getEvents(): readonly QuestEvent[] {
    return this.read().events;
  }

  getProfile(): QuestProfile | null {
    return this.read().profile;
  }

  /** Replaces the local profile, e.g. with the anonymous Supabase identity. */
  setProfile(profile: QuestProfile | null): void {
    const data = this.read();
    data.profile = profile;
    this.write(data);
    this.notify();
  }

  /** Adopts a server-validated name while keeping the local join date. */
  adoptRemoteProfile(id: string, displayName: string): void {
    const data = this.read();
    data.profile = {
      id,
      displayName,
      joinedAt: data.profile?.joinedAt ?? this.now().toISOString(),
    };
    this.write(data);
    this.notify();
  }

  /** Removes an event after the server has accepted (or rejected) it. */
  removeEvent(id: string): void {
    this.removeEvents([id]);
  }

  removeEvents(ids: Iterable<string>): void {
    const remove = new Set(ids);
    const data = this.read();
    const events = data.events.filter((event) => !remove.has(event.id));

    if (events.length === data.events.length) {
      return;
    }

    this.write({ ...data, events });
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    if (this.listeners.size === 1) {
      this.attachStorage();
    }

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.detachStorage();
      }
    };
  }

  private isTooFast(
    events: readonly QuestEvent[],
    now: Date,
    periodId: string,
  ): boolean {
    const shellEvents = events.filter(
      (event) => event.kind === "shell" && event.periodId === periodId,
    );
    const lastCreatedAt = shellEvents.reduce((latest, event) => {
      const time = Date.parse(event.createdAt);

      return Number.isFinite(time) && time > latest ? time : latest;
    }, 0);

    return (
      lastCreatedAt > 0 &&
      now.getTime() - lastCreatedAt < SHELL_COLLECT_COOLDOWN_MS
    );
  }

  private ensureProfile(data: StoredQuest, now: Date): QuestProfile {
    return (
      data.profile ?? {
        id: createPlayerId(),
        displayName: "",
        joinedAt: now.toISOString(),
      }
    );
  }

  private read(): StoredQuest {
    const raw = this.storage.getItem(STORAGE_KEY);

    if (!raw) {
      return { version: 1, profile: null, events: [] };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredQuest>;
      const seen = new Set<string>();
      const events = Array.isArray(parsed.events)
        ? parsed.events.filter((event) => {
            if (!isQuestEvent(event) || seen.has(event.id)) {
              return false;
            }

            seen.add(event.id);
            return true;
          })
        : [];

      return {
        version: 1,
        profile: isQuestProfile(parsed.profile) ? parsed.profile : null,
        events,
      };
    } catch {
      return { version: 1, profile: null, events: [] };
    }
  }

  private write(data: StoredQuest): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Private browsing or a full quota should not break the map.
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private attachStorage(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorage);
    }
  }

  private detachStorage(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorage);
    }
  }

  private handleStorage = (event: StorageEvent): void => {
    if (event.key === null || event.key === STORAGE_KEY) {
      this.notify();
    }
  };
}

export const questStore = new QuestStore();
