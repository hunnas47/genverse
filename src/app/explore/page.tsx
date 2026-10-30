import type { Metadata } from "next";
import { Suspense } from "react";

import { ExplorePageContent } from "@/components/explore/explore-page-content";
import type { SearchParams } from "@/types/search";

export const metadata: Metadata = {
  title: "Genverse Explorer",
  description:
    "Walk around the GEN M venue map, open venue details, and see the official session programme.",
};

function ExploreLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-brand-deep px-6">
      <div className="flex flex-col items-center gap-3 text-white">
        <span
          aria-hidden="true"
          className="size-8 rounded-full border-2 border-lime/25 border-t-lime motion-safe:animate-spin"
        />
        <p className="font-display text-[10px] font-bold tracking-[0.22em] text-lime uppercase">
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
    <main className="relative h-dvh w-full overflow-hidden bg-brand-deep">
      <Suspense fallback={<ExploreLoading />}>
        <ExplorePageContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
