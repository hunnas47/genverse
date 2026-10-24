import type { Metadata } from "next";

import { ExploreHud } from "@/components/explore/explore-hud";
import { GameCanvas } from "@/components/explore/game-canvas";

export const metadata: Metadata = {
  title: "Beach Explorer | GEN M",
  description:
    "Walk around the GEN M venue map in an interactive top-down preview.",
};

export default function ExplorePage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0b6f8e]">
      <GameCanvas />
      <ExploreHud />
    </main>
  );
}
