"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Credit } from "@/components/site/credit";

/**
 * Route-level error boundary. The game canvas has its own retry flow; this
 * catches failures in the surrounding pages so visitors always have a way
 * back to the programme or home page.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unexpected page error.", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-brand-deep px-5 py-16 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-white/5 p-7 text-center shadow-lift">
        <p className="font-display text-[11px] font-bold tracking-[0.24em] text-lime uppercase">
          GEN M Explorer
        </p>
        <h1 className="mt-3 text-balance text-2xl leading-tight font-medium sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          The page could not finish loading. Your programme data is safe; try
          again, or open the schedule directly.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-lime px-5 py-2.5 font-display text-[11px] font-bold tracking-[0.12em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            Try again
          </button>
          <Link
            href="/sessions"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-5 py-2.5 font-display text-[11px] font-bold tracking-[0.12em] text-white uppercase transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            Programme
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 font-display text-[11px] font-bold tracking-[0.12em] text-white/75 uppercase transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            Home
          </Link>
        </div>

        <Credit
          className="mt-6 border-t border-white/10 pt-4 text-white/60"
          linkClassName="text-lime hover:text-white"
        />
      </div>
    </main>
  );
}
