"use client";

import { use, useState } from "react";

import { ExploreHud } from "@/components/explore/explore-hud";
import { GameCanvas } from "@/components/explore/game-canvas";
import type { SearchParams } from "@/types/search";

export function ExplorePageContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = use(searchParams);
  const venue = typeof params.venue === "string" ? params.venue : null;
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  return (
    <>
      <GameCanvas
        key={venue ?? "default"}
        focusVenueId={venue}
        overlayOpen={leaderboardOpen}
      />
      <ExploreHud
        leaderboardOpen={leaderboardOpen}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onCloseLeaderboard={() => setLeaderboardOpen(false)}
      />
    </>
  );
}
