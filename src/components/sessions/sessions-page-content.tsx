"use client";

import { use } from "react";

import { SessionBrowser } from "@/components/sessions/session-browser";
import type { SearchParams } from "@/types/search";

export function SessionsPageContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = use(searchParams);
  const day = typeof params.day === "string" ? params.day : undefined;
  const venue = typeof params.venue === "string" ? params.venue : undefined;
  const session =
    typeof params.session === "string" ? params.session : undefined;

  return (
    <SessionBrowser
      key={`${day ?? "all"}-${venue ?? "all"}-${session ?? "none"}`}
      initialDayId={day}
      initialVenueId={venue}
      initialSessionId={session}
    />
  );
}
