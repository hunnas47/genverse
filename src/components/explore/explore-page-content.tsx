"use client";

import { use } from "react";

import { GameCanvas } from "@/components/explore/game-canvas";
import type { SearchParams } from "@/types/search";

export function ExplorePageContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = use(searchParams);
  const venue = typeof params.venue === "string" ? params.venue : null;

  return (
    <GameCanvas key={venue ?? "default"} focusVenueId={venue} />
  );
}
