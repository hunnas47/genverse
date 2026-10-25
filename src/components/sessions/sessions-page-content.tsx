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
  const venue = typeof params.venue === "string" ? params.venue : undefined;
  const session =
    typeof params.session === "string" ? params.session : undefined;

  return (
    <SessionBrowser
      key={`${venue ?? "all"}-${session ?? "none"}`}
      initialVenueId={venue}
      initialSessionId={session}
    />
  );
}
