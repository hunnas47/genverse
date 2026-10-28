import {
  SHELL_POINTS,
  SHELL_SET_BONUS,
  VENUE_CHECKIN_POINTS,
} from "@/data/quest";
import { computeStreakFromDays, getQuestPeriod } from "@/lib/quest/period";
import { questStore, type QuestStore } from "@/lib/quest/store";
import {
  ensureAnonymousSession,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type {
  QuestActionFailure,
  QuestActionResult,
  QuestNameResult,
  QuestSnapshot,
  QuestSyncInfo,
  QuestSyncStatus,
} from "@/types/quest";

const REMOTE_CACHE_KEY = "genm:quest:remote:v1";
const QUEUE_KEY = "genm:quest:queue:v1";
const STATE_POLL_MS = 60_000;
const RPC_TIMEOUT_MS = 8_000;
const SHELL_SYNC_GAP_MS = 1_300;
const REMOTE_PROFILE_JOINED_AT = "1970-01-01T00:00:00.000Z";

interface RemotePlayer {
  id: string;
  display_name: string;
  is_hidden: boolean;
}

interface RemoteQuestState {
  ok: true;
  player: RemotePlayer | null;
  period: string;
  collected_shell_ids: string[];
  checked_in_venue_ids: string[];
  today_points: number;
  total_points: number;
  active_days: string[];
  streak: number;
}

interface RemoteNameResult {
  ok: boolean;
  reason?: string;
  message?: string;
  display_name?: string;
}

interface RemoteActionResult {
  accepted: boolean;
  reason?: string;
  points?: number;
  bonus_points?: number;
  today_points?: number;
}

interface RemotePresence {
  ok: boolean;
  count?: number;
  reason?: string;
}

type RemoteStateResponse =
  | RemoteQuestState
  | { ok: false; reason: string };

interface CachedRemote {
  version: 1;
  savedAt: string;
  state: RemoteQuestState;
}

interface QueuedAction {
  id: string;
  kind: "shell" | "checkin";
  ref: string;
  periodId: string;
  createdAt: string;
}

interface QueueData {
  version: 1;
  pending: QueuedAction[];
  pendingName: string | null;
}

function isRemotePlayer(value: unknown): value is RemotePlayer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const player = value as Partial<RemotePlayer>;

  return (
    typeof player.id === "string" &&
    typeof player.display_name === "string" &&
    typeof player.is_hidden === "boolean"
  );
}

function isRemoteState(value: unknown): value is RemoteQuestState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<RemoteQuestState>;

  return (
    state.ok === true &&
    (state.player === null || isRemotePlayer(state.player)) &&
    typeof state.period === "string" &&
    Array.isArray(state.collected_shell_ids) &&
    state.collected_shell_ids.every((item) => typeof item === "string") &&
    Array.isArray(state.checked_in_venue_ids) &&
    state.checked_in_venue_ids.every((item) => typeof item === "string") &&
    typeof state.today_points === "number" &&
    typeof state.total_points === "number" &&
    Array.isArray(state.active_days) &&
    state.active_days.every((item) => typeof item === "string") &&
    typeof state.streak === "number"
  );
}

function isQueuedAction(value: unknown): value is QueuedAction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const action = value as Partial<QueuedAction>;

  return (
    typeof action.id === "string" &&
    (action.kind === "shell" || action.kind === "checkin") &&
    typeof action.ref === "string" &&
    typeof action.periodId === "string" &&
    typeof action.createdAt === "string"
  );
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota should not break the map.
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return /fetch|network|load failed|timeout|timed out|abort/i.test(message);
}

function describeError(error: unknown): string {
  if (isNetworkError(error)) {
    return "You're offline. Progress is saved on this device and will sync when you reconnect.";
  }

  const message = error instanceof Error ? error.message : "";

  if (/anonymous/i.test(message)) {
    return "Live sync needs anonymous sign-ins enabled in Supabase.";
  }

  return "Live sync is unavailable. Progress is saved on this device.";
}

function normalizeShellFailure(reason: string | undefined): QuestActionFailure {
  switch (reason) {
    case "already-collected":
    case "cooldown":
    case "unknown-shell":
      return reason;
    default:
      return "unknown-shell";
  }
}

function normalizeCheckinFailure(
  reason: string | undefined,
): QuestActionFailure {
  switch (reason) {
    case "already-checked-in":
    case "unknown-venue":
      return reason;
    default:
      return "unknown-venue";
  }
}

/**
 * Server-backed quest state with a local-first fallback.
 *
 * Reads use the cached server snapshot plus any unsynced local actions; writes
 * try the Supabase RPC first and fall back to the local store when the network
 * is unavailable. The local store is also the source of the offline queue, so
 * scoring rules are not duplicated.
 */
export class LiveQuestStore {
  private readonly local: QuestStore;
  private readonly listeners = new Set<() => void>();
  private readonly localUnsubscribe: () => void;
  private remote: RemoteQuestState | null = null;
  private pending: QueuedAction[] = [];
  private pendingName: string | null = null;
  private status: QuestSyncStatus = "local";
  private presenceCount = 0;
  private error: string | null = null;
  private nameError: string | null = null;
  private started = false;
  private syncing = false;
  private nextRetryAt = 0;
  private syncTimer: number | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(local: QuestStore = questStore) {
    this.local = local;
    this.loadCache();

    const localName = this.local.getProfile()?.displayName.trim();

    // On the first upgrade from the local-only slice (or after a guest find),
    // carry the local name to the server. If the server already has a name,
    // trust it instead of overwriting it from a stale local cache.
    if (
      localName &&
      !this.pendingName &&
      (!this.remote?.player || this.remote.player.display_name === "")
    ) {
      this.pendingName = localName;
      this.persistQueue();
    }

    this.enqueueLocalEvents(getQuestPeriod().id);
    this.localUnsubscribe = this.local.subscribe(() => {
      this.enqueueLocalEvents(getQuestPeriod().id);
      this.notify();
    });
  }

  getSnapshot(): QuestSnapshot {
    const local = this.local.getSnapshot();
    const period = local.period;
    const remote = this.remote;

    if (!remote) {
      if (this.pendingName) {
        return {
          ...local,
          profile: {
            id: local.profile?.id ?? "pending",
            displayName: this.pendingName,
            joinedAt: local.profile?.joinedAt ?? REMOTE_PROFILE_JOINED_AT,
          },
          joined: true,
        };
      }

      return local;
    }

    const currentPeriod = remote.period === period.id;
    const shellIds = new Set(period.shellSet.shells.map((shell) => shell.id));
    const remoteShells = unique(
      (currentPeriod ? remote.collected_shell_ids : []).filter((shellId) =>
        shellIds.has(shellId),
      ),
    );
    const remoteCheckins = unique(
      currentPeriod ? remote.checked_in_venue_ids : [],
    );
    const remoteShellSet = new Set(remoteShells);
    const remoteCheckinSet = new Set(remoteCheckins);
    const localEvents = this.local
      .getEvents()
      .filter(
        (event) => event.periodId === period.id && event.kind !== "bonus",
      );
    const pendingHere = this.pending.filter(
      (action) => action.periodId === period.id,
    );
    const optimisticShellRefs = new Set(
      localEvents
        .filter((event) => event.kind === "shell")
        .map((event) => event.ref),
    );
    const optimisticCheckinRefs = new Set(
      localEvents
        .filter((event) => event.kind === "checkin")
        .map((event) => event.ref),
    );

    for (const action of pendingHere) {
      if (action.kind === "shell") {
        optimisticShellRefs.add(action.ref);
      } else {
        optimisticCheckinRefs.add(action.ref);
      }
    }

    const optimisticShells = [...optimisticShellRefs].filter(
      (shellId) => shellIds.has(shellId) && !remoteShellSet.has(shellId),
    );
    const optimisticCheckins = [...optimisticCheckinRefs].filter(
      (venueId) => !remoteCheckinSet.has(venueId),
    );
    const collectedShellIds = unique([
      ...remoteShells,
      ...optimisticShells,
    ]);
    const checkedInVenueIds = unique([
      ...remoteCheckins,
      ...optimisticCheckins,
    ]);
    const optimisticPoints =
      optimisticShells.length * SHELL_POINTS +
      optimisticCheckins.length * VENUE_CHECKIN_POINTS;
    const remoteHadFullSet =
      currentPeriod && remoteShells.length >= period.shellSet.shells.length;
    const bonus =
      collectedShellIds.length >= period.shellSet.shells.length &&
      !remoteHadFullSet
        ? SHELL_SET_BONUS
        : 0;
    const todayPoints =
      (currentPeriod ? remote.today_points : 0) + optimisticPoints + bonus;
    const totalPoints = remote.total_points + optimisticPoints + bonus;
    const displayName =
      this.pendingName ||
      remote.player?.display_name ||
      local.profile?.displayName ||
      "";
    const profile = remote.player
      ? {
          id: remote.player.id,
          displayName,
          joinedAt: local.profile?.joinedAt ?? REMOTE_PROFILE_JOINED_AT,
        }
      : local.profile
        ? { ...local.profile, displayName }
        : displayName
          ? {
              id: "pending",
              displayName,
              joinedAt: REMOTE_PROFILE_JOINED_AT,
            }
          : null;
    const activeDays = new Set(remote.active_days);

    if (optimisticShells.length + optimisticCheckins.length > 0) {
      activeDays.add(period.id);
    }

    return {
      profile,
      period,
      collectedShellIds,
      checkedInVenueIds,
      todayPoints,
      totalPoints,
      streak: computeStreakFromDays(activeDays, period.id),
      joined: Boolean(displayName),
    };
  }

  getSyncInfo(): QuestSyncInfo {
    return {
      status: this.status,
      presenceCount: this.presenceCount,
      pendingCount: this.pending.length + (this.pendingName ? 1 : 0),
      error: this.nameError ?? this.error,
    };
  }

  async join(rawName: string): Promise<QuestNameResult> {
    const previous = this.local.getProfile();
    const localResult = this.local.join(rawName);

    if (!localResult.ok) {
      return localResult;
    }

    if (!isSupabaseConfigured()) {
      this.status = "local";
      this.nameError = null;
      this.notify();
      return localResult;
    }

    try {
      this.status = "connecting";
      this.notify();

      const supabase = await this.withTimeout(ensureAnonymousSession());
      const { data, error } = await this.withTimeout(
        supabase.rpc("join_quest", { p_display_name: localResult.value }),
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = data as RemoteNameResult;

      if (!result || result.ok !== true) {
        if (result?.reason === "unauthenticated") {
          throw new Error("Live sync is unavailable.");
        }

        this.local.setProfile(previous);
        this.status = "online";
        this.error = null;
        this.nameError =
          result?.message ?? "That name could not be saved. Try another.";
        this.notify();

        return {
          ok: false,
          message: this.nameError,
        };
      }

      this.pendingName = null;
      this.status = "online";
      this.error = null;
      this.nameError = null;
      this.persistQueue();

      if (result.display_name) {
        this.local.adoptRemoteProfile(
          this.local.getProfile()?.id ?? "",
          result.display_name,
        );

        if (this.remote?.player) {
          this.remote = {
            ...this.remote,
            player: {
              ...this.remote.player,
              display_name: result.display_name,
            },
          };
          this.persistRemote();
        }
      }

      await this.refreshState().catch(() => {});

      return {
        ok: true,
        value: result.display_name ?? localResult.value,
      };
    } catch (error) {
      this.pendingName = localResult.value;
      this.status = isNetworkError(error) ? "offline" : "error";
      this.error =
        isNetworkError(error)
          ? "Name saved on this device. It will sync when you're back online."
          : "Name saved on this device. Live sync is unavailable right now.";
      this.nameError = null;
      this.persistQueue();
      this.notify();

      return localResult;
    }
  }

  async collectShell(shellId: string): Promise<QuestActionResult> {
    const period = getQuestPeriod();

    if (!isSupabaseConfigured()) {
      return this.collectShellOffline(shellId, period.id);
    }

    try {
      const supabase = await this.withTimeout(ensureAnonymousSession());
      const { data, error } = await this.withTimeout(
        supabase.rpc("collect_shell", { p_shell_id: shellId }),
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = data as RemoteActionResult;

      if (!result || typeof result.accepted !== "boolean") {
        throw new Error("Unexpected response from the quest server.");
      }

      if (result.accepted) {
        this.status = "online";
        this.error = null;
        this.removePendingAction(`shell:${shellId}:${period.id}`);
        this.applyAcceptedShell(period.id, shellId, result);
        this.persistQueue();

        if (this.remote && this.remote.period === period.id) {
          void this.refreshState().catch(() => {});
        } else {
          await this.refreshState().catch(() => {});
        }

        this.notify();

        return {
          accepted: true,
          points: result.points ?? SHELL_POINTS,
          bonusPoints: result.bonus_points ?? 0,
        };
      }

      if (result.reason === "unauthenticated") {
        throw new Error("Live sync is unavailable.");
      }

      this.status = "online";
      this.error = null;
      void this.refreshState().catch(() => {});
      this.notify();

      return {
        accepted: false,
        reason: normalizeShellFailure(result.reason),
      };
    } catch (error) {
      return this.collectShellOffline(shellId, period.id, error);
    }
  }

  async checkInVenue(venueId: string): Promise<QuestActionResult> {
    const period = getQuestPeriod();

    if (!isSupabaseConfigured()) {
      return this.checkInOffline(venueId, period.id);
    }

    try {
      const supabase = await this.withTimeout(ensureAnonymousSession());
      const { data, error } = await this.withTimeout(
        supabase.rpc("check_in_venue", { p_venue_id: venueId }),
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = data as RemoteActionResult;

      if (!result || typeof result.accepted !== "boolean") {
        throw new Error("Unexpected response from the quest server.");
      }

      if (result.accepted) {
        this.status = "online";
        this.error = null;
        this.removePendingAction(`checkin:${venueId}:${period.id}`);
        this.applyAcceptedCheckin(period.id, venueId, result);
        this.persistQueue();

        if (this.remote && this.remote.period === period.id) {
          void this.refreshState().catch(() => {});
        } else {
          await this.refreshState().catch(() => {});
        }

        this.notify();

        return {
          accepted: true,
          points: result.points ?? VENUE_CHECKIN_POINTS,
          bonusPoints: 0,
        };
      }

      if (result.reason === "unauthenticated") {
        throw new Error("Live sync is unavailable.");
      }

      this.status = "online";
      this.error = null;
      void this.refreshState().catch(() => {});
      this.notify();

      return {
        accepted: false,
        reason: normalizeCheckinFailure(result.reason),
      };
    } catch (error) {
      return this.checkInOffline(venueId, period.id, error);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    if (this.listeners.size === 1) {
      this.start();
    }

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  private collectShellOffline(
    shellId: string,
    periodId: string,
    cause?: unknown,
  ): QuestActionResult {
    const result = this.local.collectShell(shellId);

    if (result.accepted) {
      this.enqueueLocalEvents(periodId);
      this.markOffline(cause);
    } else if (cause) {
      this.markOffline(cause);
    }

    return result;
  }

  private checkInOffline(
    venueId: string,
    periodId: string,
    cause?: unknown,
  ): QuestActionResult {
    const result = this.local.checkInVenue(venueId);

    if (result.accepted) {
      this.enqueueLocalEvents(periodId);
      this.markOffline(cause);
    } else if (cause) {
      this.markOffline(cause);
    }

    return result;
  }

  private markOffline(cause?: unknown): void {
    this.status = isSupabaseConfigured() ? "offline" : "local";
    this.error = cause
      ? describeError(cause)
      : "Progress is saved on this device.";
    this.notify();
  }

  private applyAcceptedShell(
    periodId: string,
    shellId: string,
    result: RemoteActionResult,
  ): boolean {
    if (!this.remote || this.remote.period !== periodId) {
      return false;
    }

    const points = result.points ?? SHELL_POINTS;
    const bonus = result.bonus_points ?? 0;

    this.remote = {
      ...this.remote,
      collected_shell_ids: unique([
        ...this.remote.collected_shell_ids,
        shellId,
      ]),
      today_points:
        result.today_points ??
        this.remote.today_points + points + bonus,
      total_points: this.remote.total_points + points + bonus,
    };
    this.persistRemote();
    return true;
  }

  private applyAcceptedCheckin(
    periodId: string,
    venueId: string,
    result: RemoteActionResult,
  ): boolean {
    if (!this.remote || this.remote.period !== periodId) {
      return false;
    }

    const points = result.points ?? VENUE_CHECKIN_POINTS;

    this.remote = {
      ...this.remote,
      checked_in_venue_ids: unique([
        ...this.remote.checked_in_venue_ids,
        venueId,
      ]),
      today_points: result.today_points ?? this.remote.today_points + points,
      total_points: this.remote.total_points + points,
    };
    this.persistRemote();
    return true;
  }

  private start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    if (!isSupabaseConfigured()) {
      this.status = "local";
      this.error =
        "Live sync is not configured. Progress is saved on this device.";
      this.notify();
      return;
    }

    this.status = "connecting";
    this.notify();
    void this.syncTick();

    if (typeof window === "undefined") {
      return;
    }

    this.syncTimer = window.setInterval(() => {
      if (!document.hidden) {
        void this.syncTick();
      }
    }, STATE_POLL_MS);

    this.visibilityHandler = () => {
      if (!document.hidden) {
        void this.syncTick();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private stop(): void {
    this.started = false;

    if (this.syncTimer !== null) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityHandler,
      );
      this.visibilityHandler = null;
    }
  }

  private async syncTick(): Promise<void> {
    if (!isSupabaseConfigured() || this.syncing) {
      return;
    }

    if (Date.now() < this.nextRetryAt) {
      return;
    }

    this.syncing = true;

    if (this.status !== "online") {
      this.status = this.remote ? "offline" : "connecting";
      this.notify();
    }

    try {
      await this.withTimeout(ensureAnonymousSession());
      await this.flushQueue();
      await this.refreshState();
      await this.touchPresence().catch(() => {});
      this.status = "online";
      this.error = null;
    } catch (error) {
      this.status = this.remote
        ? "offline"
        : isNetworkError(error)
          ? "offline"
          : "error";
      this.error = describeError(error);
      this.nextRetryAt =
        Date.now() + (isNetworkError(error) ? 15_000 : 60_000);
    } finally {
      this.syncing = false;
      this.notify();
    }
  }

  private async flushQueue(): Promise<void> {
    if (!this.pendingName && this.pending.length === 0) {
      return;
    }

    const supabase = await this.withTimeout(ensureAnonymousSession());
    const period = getQuestPeriod().id;

    if (this.pendingName) {
      const name = this.pendingName;
      const { data, error } = await this.withTimeout(
        supabase.rpc("join_quest", { p_display_name: name }),
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = data as RemoteNameResult;

      if (result?.ok) {
        this.pendingName = null;
        this.nameError = null;
        this.persistQueue();

        if (result.display_name) {
          this.local.adoptRemoteProfile(
            this.local.getProfile()?.id ?? "",
            result.display_name,
          );

          if (this.remote?.player) {
            this.remote = {
              ...this.remote,
              player: {
                ...this.remote.player,
                display_name: result.display_name,
              },
            };
            this.persistRemote();
          }
        }
      } else if (
        result?.reason === "name-taken" ||
        result?.reason === "invalid-name"
      ) {
        this.pendingName = null;

        if (this.remote?.player) {
          this.local.adoptRemoteProfile(
            this.remote.player.id,
            this.remote.player.display_name,
          );
        } else {
          this.local.setProfile(null);
        }

        this.nameError =
          result.message ?? "That name is already taken. Choose another.";
        this.persistQueue();
        this.notify();
      } else if (result?.reason === "unauthenticated") {
        throw new Error("Live sync is unavailable.");
      } else {
        throw new Error(
          result?.message ?? "Your name could not be saved.",
        );
      }
    }

    // The server only knows today's period, so a queued action from an earlier
    // day cannot be backfilled.
    const queueLength = this.pending.length;
    this.pending = this.pending.filter(
      (action) => action.periodId === period,
    );

    if (this.pending.length !== queueLength) {
      this.persistQueue();
    }

    for (const action of [...this.pending]) {
      if (!this.pending.some((item) => item.id === action.id)) {
        continue;
      }

      if (action.kind === "shell") {
        const { data, error } = await this.withTimeout(
          supabase.rpc("collect_shell", { p_shell_id: action.ref }),
        );

        if (error) {
          throw new Error(error.message);
        }

        const result = data as RemoteActionResult;

        if (result?.accepted) {
          const applied = this.applyAcceptedShell(period, action.ref, result);

          if (applied) {
            this.removePendingAction(action.id);
          }
        } else if (result?.reason === "unauthenticated") {
          throw new Error("Live sync is unavailable.");
        } else if (result?.reason !== "cooldown") {
          // already-collected / unknown-shell: the server is authoritative.
          this.removePendingAction(action.id);
          this.local.removeEvent(action.id);
        }

        // Space offline finds out so the server-side cooldown accepts them.
        await sleep(SHELL_SYNC_GAP_MS);
      } else {
        const { data, error } = await this.withTimeout(
          supabase.rpc("check_in_venue", { p_venue_id: action.ref }),
        );

        if (error) {
          throw new Error(error.message);
        }

        const result = data as RemoteActionResult;

        if (result?.accepted) {
          const applied = this.applyAcceptedCheckin(period, action.ref, result);

          if (applied) {
            this.removePendingAction(action.id);
          }
        } else if (result?.reason === "unauthenticated") {
          throw new Error("Live sync is unavailable.");
        } else {
          this.removePendingAction(action.id);
          this.local.removeEvent(action.id);
        }
      }
    }

    this.persistQueue();
  }

  private async refreshState(): Promise<void> {
    const supabase = await this.withTimeout(ensureAnonymousSession());
    const { data, error } = await this.withTimeout(
      supabase.rpc("get_my_quest_state"),
    );

    if (error) {
      throw new Error(error.message);
    }

    const state = data as RemoteStateResponse | null;

    if (!state || state.ok !== true) {
      throw new Error(
        state && state.ok === false
          ? `Quest server: ${state.reason}`
          : "Unexpected quest state.",
      );
    }

    this.remote = state;
    this.reconcilePending(state);

    const localName = this.local.getProfile()?.displayName.trim();

    if (state.player) {
      this.local.adoptRemoteProfile(
        state.player.id,
        state.player.display_name,
      );
    }

    if (
      (!state.player || state.player.display_name === "") &&
      !this.pendingName &&
      localName
    ) {
      this.pendingName = localName;
    }

    // Local events that already exist on the server are no longer pending.
    const syncedIds = this.local
      .getEvents()
      .filter((event) => event.periodId === state.period)
      .filter((event) =>
        event.kind === "shell"
          ? state.collected_shell_ids.includes(event.ref)
          : event.kind === "checkin"
            ? state.checked_in_venue_ids.includes(event.ref)
            : false,
      )
      .map((event) => event.id);

    if (syncedIds.length > 0) {
      this.local.removeEvents(syncedIds);
    }

    this.persistRemote();
    this.persistQueue();
    this.status = "online";
    this.error = null;
    this.notify();
  }

  private async touchPresence(): Promise<void> {
    const supabase = await this.withTimeout(ensureAnonymousSession());
    const { data, error } = await this.withTimeout(
      supabase.rpc("touch_presence"),
    );

    if (error) {
      return;
    }

    const result = data as RemotePresence;

    if (result?.ok && typeof result.count === "number") {
      this.presenceCount = result.count;
      this.notify();
    }
  }

  private reconcilePending(state: RemoteQuestState): void {
    const shells = new Set(state.collected_shell_ids);
    const checkins = new Set(state.checked_in_venue_ids);

    this.pending = this.pending.filter((action) => {
      if (action.periodId !== state.period) {
        return false;
      }

      if (action.kind === "shell" && shells.has(action.ref)) {
        return false;
      }

      if (action.kind === "checkin" && checkins.has(action.ref)) {
        return false;
      }

      return true;
    });
  }

  private enqueueLocalEvents(periodId: string): void {
    const existing = new Set(this.pending.map((action) => action.id));
    const remoteShells = new Set(
      this.remote?.period === periodId
        ? this.remote.collected_shell_ids
        : [],
    );
    const remoteCheckins = new Set(
      this.remote?.period === periodId
        ? this.remote.checked_in_venue_ids
        : [],
    );
    let changed = false;

    for (const event of this.local.getEvents()) {
      if (event.periodId !== periodId || event.kind === "bonus") {
        continue;
      }

      if (existing.has(event.id)) {
        continue;
      }

      if (event.kind === "shell" && remoteShells.has(event.ref)) {
        continue;
      }

      if (event.kind === "checkin" && remoteCheckins.has(event.ref)) {
        continue;
      }

      this.pending.push({
        id: event.id,
        kind: event.kind,
        ref: event.ref,
        periodId: event.periodId,
        createdAt: event.createdAt,
      });
      existing.add(event.id);
      changed = true;
    }

    if (changed) {
      this.persistQueue();
    }
  }

  private removePendingAction(id: string): void {
    const next = this.pending.filter((action) => action.id !== id);

    if (next.length !== this.pending.length) {
      this.pending = next;
      this.persistQueue();
    }
  }

  private loadCache(): void {
    const cached = readJson<CachedRemote>(REMOTE_CACHE_KEY);

    if (cached?.version === 1 && isRemoteState(cached.state)) {
      this.remote = cached.state;
    }

    const queue = readJson<QueueData>(QUEUE_KEY);

    if (queue?.version === 1 && Array.isArray(queue.pending)) {
      const seen = new Set<string>();

      this.pending = queue.pending.filter((action) => {
        if (!isQueuedAction(action) || seen.has(action.id)) {
          return false;
        }

        seen.add(action.id);
        return true;
      });
      this.pendingName =
        typeof queue.pendingName === "string" && queue.pendingName.trim()
          ? queue.pendingName
          : null;
    }
  }

  private persistRemote(): void {
    if (!this.remote) {
      return;
    }

    writeJson(REMOTE_CACHE_KEY, {
      version: 1,
      savedAt: new Date().toISOString(),
      state: this.remote,
    } satisfies CachedRemote);
  }

  private persistQueue(): void {
    writeJson(QUEUE_KEY, {
      version: 1,
      pending: this.pending,
      pendingName: this.pendingName,
    } satisfies QueueData);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private withTimeout<T>(
    promise: PromiseLike<T>,
    timeoutMs = RPC_TIMEOUT_MS,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("Live sync timed out."));
      }, timeoutMs);

      Promise.resolve(promise).then(
        (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          window.clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  /** Used by the sync layer tests; the runtime treats the local subscription as permanent. */
  dispose(): void {
    this.stop();
    this.localUnsubscribe();
    this.listeners.clear();
  }
}

export const liveQuestStore = new LiveQuestStore();
