/**
 * Shared types for the Beach Quest layer.
 *
 * Points are append-only events so the same rules can later run on the server
 * without trusting client-reported totals.
 */

export interface QuestShell {
  id: string;
  /** World coordinates matching the venue map pixels. */
  x: number;
  y: number;
}

export interface QuestShellSet {
  id: string;
  name: string;
  shells: readonly QuestShell[];
}

export interface QuestPeriod {
  /** Calendar day in Asia/Kolkata, formatted as YYYY-MM-DD. */
  id: string;
  shellSet: QuestShellSet;
  isEventDay: boolean;
}

export interface QuestProfile {
  /** Local id for now; becomes the Supabase auth id when sync lands. */
  id: string;
  /** Empty until the visitor chooses a display name. */
  displayName: string;
  joinedAt: string;
}

export type QuestEventKind = "shell" | "checkin" | "bonus";

export interface QuestEvent {
  /** Idempotency key, unique across all events. */
  id: string;
  kind: QuestEventKind;
  /** Shell id, venue id, or bonus name. */
  ref: string;
  periodId: string;
  points: number;
  createdAt: string;
}

export interface QuestSnapshot {
  profile: QuestProfile | null;
  period: QuestPeriod;
  collectedShellIds: readonly string[];
  checkedInVenueIds: readonly string[];
  todayPoints: number;
  totalPoints: number;
  /** Consecutive active days ending today (or yesterday, before today's first find). */
  streak: number;
  joined: boolean;
}

export type QuestSyncStatus =
  | "local"
  | "connecting"
  | "online"
  | "offline"
  | "error";

export interface QuestSyncInfo {
  status: QuestSyncStatus;
  /** Players seen in the last five minutes, once the shared backend is reachable. */
  presenceCount: number;
  /** Actions saved locally that still need to sync. */
  pendingCount: number;
  error: string | null;
}

export type QuestActionFailure =
  | "unknown-shell"
  | "already-collected"
  | "cooldown"
  | "unknown-venue"
  | "already-checked-in";

export type QuestActionResult =
  | { accepted: true; points: number; bonusPoints: number }
  | { accepted: false; reason: QuestActionFailure };

export type QuestNameResult =
  | { ok: true; value: string }
  | { ok: false; message: string };
