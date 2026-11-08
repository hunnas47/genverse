"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

import { VENUES_BY_ID } from "@/data/venues";
import {
  formatDayShort,
  formatSessionTimeRange,
  getNowAndNext,
  getProgrammeDay,
  getProgrammeDayAt,
  isMalayalam,
} from "@/lib/programme";
import type { Session } from "@/types/session";

function NowNextRow({
  session,
  todayDayId,
}: {
  session: Session;
  todayDayId: string;
}) {
  const venue = VENUES_BY_ID.get(session.venueId);
  const day = getProgrammeDay(session.dayId);
  const otherDay = session.dayId !== todayDayId && day;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-cream p-3 text-brand-deep">
      <span className="shrink-0 rounded-full bg-brand-deep px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.12em] text-lime uppercase">
        {venue?.mapLabel ?? session.venueId}
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/sessions?session=${session.id}`}
          lang={isMalayalam(session.title) ? "ml" : undefined}
          className="line-clamp-2 text-sm leading-snug font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          {session.title}
        </Link>
        <p className="mt-0.5 font-display text-[11px] font-semibold tracking-[0.08em] text-brand-deep/70 uppercase">
          {otherDay ? `${formatDayShort(otherDay)} · ` : ""}
          {formatSessionTimeRange(session)}
        </p>
      </div>

      {venue?.mapPosition && (
        <Link
          href={`/explore?venue=${venue.id}`}
          aria-label={`Locate ${venue.name} on the map`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-lime text-brand-deep transition hover:bg-brand-deep hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          <MapPin aria-hidden="true" className="size-4" />
        </Link>
      )}
    </li>
  );
}

/**
 * "Now / next" for event days only. `now` is the client clock; it is null
 * until hydration, and this renders nothing outside 13–15 Nov (IST).
 */
export function SessionsNowNext({ now }: { now: number | null }) {
  if (now === null) {
    return null;
  }

  const today = getProgrammeDayAt(now);

  if (!today) {
    return null;
  }

  const { now: running, next } = getNowAndNext(now);

  return (
    <section
      aria-labelledby="now-next-title"
      className="mb-6 rounded-[2rem] border border-white/15 bg-brand-deep/70 p-4 shadow-lift sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="now-next-title"
          className="font-display text-xs font-bold tracking-[0.18em] text-lime uppercase"
        >
          {running.length > 0 ? "Happening now" : "Up next"}
        </h2>
        <p className="text-[11px] text-white/70">{today.displayDate}</p>
      </div>

      {running.length > 0 && (
        <ul className="mt-3 space-y-2">
          {running.map((session) => (
            <NowNextRow
              key={session.id}
              session={session}
              todayDayId={today.id}
            />
          ))}
        </ul>
      )}

      {next.length > 0 ? (
        <>
          {running.length > 0 && (
            <h3 className="mt-4 font-display text-[11px] font-bold tracking-[0.18em] text-white/75 uppercase">
              Up next
            </h3>
          )}
          <ul className="mt-3 space-y-2">
            {next.map((session) => (
              <NowNextRow
                key={session.id}
                session={session}
                todayDayId={today.id}
              />
            ))}
          </ul>
        </>
      ) : (
        running.length === 0 && (
          <p className="mt-3 text-sm text-white/80">
            There are no more sessions in the programme.
          </p>
        )
      )}
    </section>
  );
}
