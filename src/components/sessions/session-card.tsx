"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useState } from "react";

import { VENUES_BY_ID } from "@/data/venues";
import {
  formatSessionTimeRange,
  getSessionSpeakers,
  getSessionTalkSpeaker,
  isMalayalam,
  SESSION_STATUS_LABELS,
} from "@/lib/programme";
import type { Session } from "@/types/session";

function speakerSummary(session: Session): string {
  const speakers = getSessionSpeakers(session);

  if (speakers.length === 0) {
    return "Speakers to be announced.";
  }

  const names = speakers
    .slice(0, 3)
    .map((speaker) =>
      speaker.sessionRole
        ? `${speaker.name} (${speaker.sessionRole})`
        : speaker.name,
    );
  const remaining = speakers.length - names.length;

  return remaining > 0
    ? `${names.join(", ")} +${remaining} more`
    : names.join(", ");
}

export function SessionCard({
  session,
  defaultOpen = false,
}: {
  session: Session;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const venue = VENUES_BY_ID.get(session.venueId) ?? null;
  const speakers = getSessionSpeakers(session);
  const titleId = `session-title-${session.id}`;
  const detailsId = `session-details-${session.id}`;
  const hasMapPosition = Boolean(venue?.mapPosition);
  const statusLabel = SESSION_STATUS_LABELS[session.status];

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-3xl border border-white/10 bg-cream p-4 text-brand-deep shadow-soft transition hover:border-lime/60 hover:shadow-lift sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-deep px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.12em] text-lime uppercase">
              {venue?.mapLabel ?? session.venueId}
            </span>
            <span className="text-[11px] font-semibold text-brand-deep/70">
              {venue?.name ?? "Venue to be announced"}
            </span>
            {session.status !== "scheduled" && (
              <span
                className={
                  session.status === "cancelled"
                    ? "rounded-full bg-red-100 px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.1em] text-red-700 uppercase"
                    : "rounded-full bg-amber-100 px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.1em] text-amber-800 uppercase"
                }
              >
                {statusLabel}
              </span>
            )}
          </div>

          <h3
            id={titleId}
            lang={isMalayalam(session.title) ? "ml" : undefined}
            className="mt-3 text-balance text-lg leading-snug font-medium text-brand-deep sm:text-xl"
          >
            {session.title}
          </h3>

          {session.subtitle && (
            <p
              lang={isMalayalam(session.subtitle) ? "ml" : undefined}
              className="mt-1 text-xs font-medium text-brand-deep/70"
            >
              {session.subtitle}
            </p>
          )}

          <p className="mt-2 font-display text-[11px] font-semibold tracking-[0.08em] text-brand-deep/70 uppercase">
            {formatSessionTimeRange(session)}
          </p>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-brand-deep/75">
            {speakerSummary(session)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-deep/15 bg-brand-deep/5 px-3.5 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-brand-deep uppercase transition hover:bg-brand-deep/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            {expanded ? "Hide details" : "Details"}
          </button>

          {hasMapPosition && venue ? (
            <Link
              href={`/explore?venue=${venue.id}`}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-lime px-3.5 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              <MapPin aria-hidden="true" className="size-3.5" />
              Locate on map
            </Link>
          ) : (
            <span
              title={
                venue?.note ??
                "The official map location for this venue has not been announced."
              }
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-deep/10 bg-brand-deep/5 px-3.5 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-brand-deep/70 uppercase"
            >
              Map location TBA
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div
          id={detailsId}
          role="region"
          aria-label={`${session.title} details`}
          className="mt-5 space-y-5 border-t border-brand-deep/10 pt-5"
        >
          {session.description && (
            <p
              lang={isMalayalam(session.description) ? "ml" : undefined}
              className="text-sm leading-relaxed text-brand-deep/70"
            >
              {session.description}
            </p>
          )}

          <div>
            <h4 className="font-display text-[10px] font-bold tracking-[0.2em] text-brand-deep/70 uppercase">
              Speakers
            </h4>
            {speakers.length > 0 ? (
              <ul className="mt-2 space-y-2.5">
                {speakers.map((speaker) => (
                  <li key={speaker.id} className="text-sm text-brand-deep/80">
                    <span className="font-semibold">{speaker.name}</span>
                    {speaker.sessionRole && (
                      <span className="ml-2 rounded-full bg-brand-deep/10 px-2 py-0.5 text-[10px] font-semibold text-brand-deep/75">
                        {speaker.sessionRole}
                      </span>
                    )}
                    {(speaker.designation || speaker.affiliation) && (
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-brand-deep/70">
                        {[speaker.designation, speaker.affiliation]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-brand-deep/75">
                Speakers to be announced.
              </p>
            )}
          </div>

          {session.talks.length > 0 && (
            <div>
              <h4 className="font-display text-[10px] font-bold tracking-[0.2em] text-brand-deep/70 uppercase">
                Talks
              </h4>
              <ul className="mt-2 space-y-2.5">
                {session.talks.map((talk) => {
                  const talkSpeaker = getSessionTalkSpeaker(talk);

                  return (
                    <li
                      key={`${session.id}-${talk.title}`}
                      className="text-sm text-brand-deep/80"
                    >
                      <p
                        lang={isMalayalam(talk.title) ? "ml" : undefined}
                        className="leading-relaxed"
                      >
                        {talk.title}
                      </p>
                      {talkSpeaker && (
                        <p className="mt-0.5 text-[11px] text-brand-deep/70">
                          {talkSpeaker}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {venue?.verification === "supplied-map" && (
            <p className="rounded-2xl border border-brand-deep/10 bg-brand-deep/5 px-3.5 py-2.5 text-[11px] leading-relaxed text-brand-deep/75">
              {venue.mapLabel} is a map label from the supplied venue map.
              Official venue details are not published for this area yet.
            </p>
          )}

          {venue?.note && (
            <p className="rounded-2xl border border-brand-deep/10 bg-brand-deep/5 px-3.5 py-2.5 text-[11px] leading-relaxed text-brand-deep/75">
              {venue.note}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={session.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-deep px-4 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              Official session page
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
            <span className="text-[10px] leading-relaxed text-brand-deep/70">
              Times are event-local (Asia/Kolkata).
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
