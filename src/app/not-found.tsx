import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | GEN M",
};

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-deep px-5 py-16 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-white/5 p-7 text-center shadow-lift">
        <p className="font-display text-[11px] font-bold tracking-[0.24em] text-lime uppercase">
          404
        </p>
        <h1 className="mt-3 text-balance text-2xl leading-tight font-medium sm:text-3xl">
          That path is off the map
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          The page you followed does not exist. Head back to the beach or browse
          the official programme.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-lime px-5 py-2.5 font-display text-[11px] font-bold tracking-[0.12em] text-brand-deep uppercase transition hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            Open the map
          </Link>
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
      </div>
    </main>
  );
}
