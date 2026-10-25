export type SessionStatus = "scheduled" | "tba" | "cancelled";

export interface SessionTalk {
  title: string;
  speakerId?: string;
  attribution?: string;
}

/**
 * A session from the official GEN M programme.
 *
 * `day` is an ISO date in the event's Asia/Kolkata calendar. `startTime` and
 * `endTime` are event-local 24-hour values (`HH:MM`), not UTC.
 */
export interface Session {
  id: string;
  dayId: string;
  day: string;
  venueId: string;
  startTime: string;
  endTime: string;
  title: string;
  subtitle?: string;
  description?: string;
  speakerIds: string[];
  /** Non-empty roles keyed by speaker ID. */
  roles: Record<string, string>;
  talks: SessionTalk[];
  status: SessionStatus;
  officialUrl: string;
  verification: "official";
}

export interface Speaker {
  id: string;
  name: string;
  designation?: string;
  affiliation?: string;
  role?: string;
}

export interface SessionSpeaker extends Speaker {
  /** The role this speaker has in the specific session, when published. */
  sessionRole?: string;
}

export interface ProgrammeDay {
  id: string;
  /** ISO date in the event's Asia/Kolkata calendar. */
  date: string;
  label: string;
  displayDate: string;
}
