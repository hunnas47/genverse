import {
  PROGRAMME_DAYS,
  PROGRAMME_NOTICE,
  PROGRAMME_SOURCE,
  PROGRAMME_VERIFIED_AT,
} from "@/data/programme";
import sessionsJson from "@/data/sessions.json";
import speakersJson from "@/data/speakers.json";
import { VENUES_BY_ID } from "@/data/venues";
import type {
  ProgrammeDay,
  Session,
  SessionSpeaker,
  SessionStatus,
  SessionTalk,
  Speaker,
} from "@/types/session";

const SESSION_STATUSES: readonly SessionStatus[] = [
  "scheduled",
  "tba",
  "cancelled",
];
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MALAYALAM_PATTERN = /[\u0D00-\u0D7F]/;

const rawSessions = sessionsJson as Session[];
const rawSpeakers = speakersJson as Speaker[];

const dayById = new Map(PROGRAMME_DAYS.map((day) => [day.id, day]));

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid programme data: ${message}`);
  }
}

function validateProgramme(): void {
  const speakerIds = new Set<string>();

  for (const speaker of rawSpeakers) {
    invariant(
      typeof speaker.id === "string" && speaker.id.length > 0,
      "speaker is missing an id",
    );
    invariant(
      !speakerIds.has(speaker.id),
      `duplicate speaker id: ${speaker.id}`,
    );
    invariant(
      typeof speaker.name === "string" && speaker.name.length > 0,
      `speaker is missing a name: ${speaker.id}`,
    );
    speakerIds.add(speaker.id);
  }

  const sessionIds = new Set<string>();

  for (const session of rawSessions) {
    invariant(
      typeof session.id === "string" && session.id.length > 0,
      "session is missing an id",
    );
    invariant(
      !sessionIds.has(session.id),
      `duplicate session id: ${session.id}`,
    );
    sessionIds.add(session.id);

    const day = dayById.get(session.dayId);
    invariant(day, `unknown day ${session.dayId} in ${session.id}`);
    invariant(
      session.day === day.date,
      `day/date mismatch in ${session.id}: ${session.day} !== ${day.date}`,
    );

    invariant(
      VENUES_BY_ID.has(session.venueId),
      `unknown venue ${session.venueId} in ${session.id}`,
    );

    invariant(
      typeof session.title === "string" && session.title.length > 0,
      `session is missing a title: ${session.id}`,
    );
    invariant(
      TIME_PATTERN.test(session.startTime),
      `invalid start time in ${session.id}: ${session.startTime}`,
    );
    invariant(
      TIME_PATTERN.test(session.endTime),
      `invalid end time in ${session.id}: ${session.endTime}`,
    );
    invariant(
      session.startTime < session.endTime,
      `end time must be after start time in ${session.id}`,
    );
    invariant(
      SESSION_STATUSES.includes(session.status),
      `invalid status in ${session.id}: ${session.status}`,
    );
    invariant(
      session.verification === "official",
      `session must be marked official: ${session.id}`,
    );
    invariant(
      session.officialUrl.startsWith("https://www.genm.in/sessions/"),
      `invalid official URL in ${session.id}`,
    );

    invariant(
      Array.isArray(session.speakerIds),
      `speakerIds must be an array in ${session.id}`,
    );
    for (const speakerId of session.speakerIds) {
      invariant(
        speakerIds.has(speakerId),
        `unknown speaker ${speakerId} in ${session.id}`,
      );
    }

    invariant(
      session.roles && typeof session.roles === "object",
      `roles must be an object in ${session.id}`,
    );
    for (const speakerId of Object.keys(session.roles)) {
      invariant(
        session.speakerIds.includes(speakerId),
        `role for speaker ${speakerId} who is not in speakerIds in ${session.id}`,
      );
    }

    invariant(
      Array.isArray(session.talks),
      `talks must be an array in ${session.id}`,
    );
    for (const talk of session.talks) {
      invariant(
        typeof talk.title === "string" && talk.title.length > 0,
        `talk is missing a title in ${session.id}`,
      );
      if (talk.speakerId) {
        invariant(
          speakerIds.has(talk.speakerId),
          `unknown talk speaker ${talk.speakerId} in ${session.id}`,
        );
      }
    }
  }

  invariant(rawSessions.length > 0, "no sessions were loaded");
}

validateProgramme();

function compareSessions(a: Session, b: Session): number {
  return (
    a.dayId.localeCompare(b.dayId) ||
    a.startTime.localeCompare(b.startTime) ||
    a.venueId.localeCompare(b.venueId) ||
    a.title.localeCompare(b.title)
  );
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);

    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }

  return groups;
}

export const SESSIONS: readonly Session[] = [...rawSessions].sort(
  compareSessions,
);
export const SPEAKERS: readonly Speaker[] = rawSpeakers;

export const SPEAKERS_BY_ID: ReadonlyMap<string, Speaker> = new Map(
  SPEAKERS.map((speaker) => [speaker.id, speaker]),
);

export const SESSIONS_BY_ID: ReadonlyMap<string, Session> = new Map(
  SESSIONS.map((session) => [session.id, session]),
);

export const SESSIONS_BY_VENUE: ReadonlyMap<string, Session[]> = groupBy(
  SESSIONS,
  (session) => session.venueId,
);

export const SESSIONS_BY_DAY: ReadonlyMap<string, Session[]> = groupBy(
  SESSIONS,
  (session) => session.dayId,
);

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "Scheduled",
  tba: "To be announced",
  cancelled: "Cancelled",
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const shortDayFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  timeZone: "Asia/Kolkata",
});

const verifiedDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function eventDate(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+05:30`);
}

export function getProgrammeDay(dayId: string): ProgrammeDay | undefined {
  return dayById.get(dayId);
}

export function formatSessionTime(
  session: Session,
  time: "startTime" | "endTime",
): string {
  return timeFormatter.format(eventDate(session.day, session[time]));
}

export function formatSessionTimeRange(session: Session): string {
  return `${formatSessionTime(session, "startTime")} – ${formatSessionTime(
    session,
    "endTime",
  )}`;
}

export function formatSessionDay(session: Session): string {
  return dayById.get(session.dayId)?.displayDate ?? session.day;
}

export function formatDayShort(day: ProgrammeDay): string {
  return shortDayFormatter.format(eventDate(day.date, "12:00"));
}

export function formatProgrammeVerifiedDate(): string {
  return verifiedDateFormatter.format(
    eventDate(PROGRAMME_VERIFIED_AT, "12:00"),
  );
}

export function isMalayalam(text: string | undefined): boolean {
  return typeof text === "string" && MALAYALAM_PATTERN.test(text);
}

export function getSessionSpeakers(session: Session): SessionSpeaker[] {
  return session.speakerIds.flatMap((speakerId) => {
    const speaker = SPEAKERS_BY_ID.get(speakerId);

    if (!speaker) {
      return [];
    }

    const sessionRole = session.roles[speakerId];

    return [sessionRole ? { ...speaker, sessionRole } : speaker];
  });
}

export function getSessionTalkSpeaker(talk: SessionTalk): string | null {
  if (talk.speakerId) {
    const speaker = SPEAKERS_BY_ID.get(talk.speakerId);

    if (speaker) {
      return speaker.name;
    }
  }

  return talk.attribution ?? null;
}

export function getSessionsForVenue(venueId: string): readonly Session[] {
  return SESSIONS_BY_VENUE.get(venueId) ?? [];
}

export function getSessionsForDay(dayId: string): readonly Session[] {
  return SESSIONS_BY_DAY.get(dayId) ?? [];
}

export interface SessionDayGroup {
  day: ProgrammeDay;
  sessions: Session[];
}

/**
 * Groups sessions by event day in official day order. Days with no matching
 * sessions are omitted.
 */
export function groupSessionsByDay(
  sessions: readonly Session[],
): SessionDayGroup[] {
  return PROGRAMME_DAYS.map((day) => ({
    day,
    sessions: sessions.filter((session) => session.dayId === day.id),
  })).filter((group) => group.sessions.length > 0);
}

export function getSessionVenueLabel(session: Session): string {
  const venue = VENUES_BY_ID.get(session.venueId);

  return venue ? `${venue.mapLabel} · ${venue.name}` : session.venueId;
}

export {
  PROGRAMME_DAYS,
  PROGRAMME_NOTICE,
  PROGRAMME_SOURCE,
  PROGRAMME_VERIFIED_AT,
};
