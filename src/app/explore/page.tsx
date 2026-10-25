import type { Metadata } from "next";
import { Suspense } from "react";

import { ExploreHud } from "@/components/explore/explore-hud";
import { ExplorePageContent } from "@/components/explore/explore-page-content";
import type { SearchParams } from "@/types/search";

export const metadata: Metadata = {
  title: "Beach Explorer | GEN M",
  description:
    "Walk around the GEN M venue map, open venue details, and see the official session programme.",
};

function ExploreLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#0b6f8e] px-6">
      <div className="flex flex-col items-center gap-3 text-white">
        <span
          aria-hidden="true"
          className="size-8 rounded-full border-2 border-white/25 border-t-white motion-safe:animate-spin"
        />
        <p className="text-xs font-medium tracking-[0.22em] uppercase">
          Preparing the beach
        </p>
      </div>
    </div>
  );
}

export default function ExplorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0b6f8e]">
      <Suspense fallback={<ExploreLoading />}>
        <ExplorePageContent searchParams={searchParams} />
      </Suspense>
      <ExploreHud />
    </main>
  );
}
