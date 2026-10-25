import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/site/logo";
import { PROGRAMME_SOURCE } from "@/lib/programme";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Venue map" },
  { href: "/sessions", label: "Programme" },
  { href: "/explore?venue=a1", label: "Expo spaces" },
] as const;

const programmeLinks = [
  { href: "/sessions", label: "All sessions" },
  { href: "/sessions?day=nov-13", label: "Day 1 · 13 Nov" },
  { href: "/sessions?day=nov-14", label: "Day 2 · 14 Nov" },
  { href: "/sessions?day=nov-15", label: "Day 3 · 15 Nov" },
] as const;

const officialLinks = [
  { href: "https://www.genm.in/", label: "GEN M website" },
  { href: PROGRAMME_SOURCE, label: "Official programme" },
  { href: "https://www.genm.in/venues", label: "Official venues" },
] as const;

function FooterLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "group inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {label}
        <ArrowUpRight
          aria-hidden="true"
          className="size-3 text-white/30 transition group-hover:text-lime"
        />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-xs font-bold tracking-[0.2em] text-lime uppercase">
        {title}
      </h2>
      <div className="mt-3 grid gap-2.5">{children}</div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-brand-deep text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1.6fr] lg:gap-16">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              A visual guide to the GEN M beach confluence. Walk the illustrated
              venue map, find every stage, and plan your day with the official
              programme.
            </p>
            <p className="mt-5 font-display text-xs font-bold tracking-[0.18em] text-lime uppercase">
              13–15 November 2026
            </p>
            <p className="mt-1 text-sm text-white/55">
              Kozhikode Beach, Kerala
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <FooterColumn title="Explore">
              {exploreLinks.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </FooterColumn>

            <FooterColumn title="Programme">
              {programmeLinks.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </FooterColumn>

            <FooterColumn title="Official">
              {officialLinks.map((link) => (
                <FooterLink key={link.href} {...link} external />
              ))}
            </FooterColumn>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] leading-relaxed text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl">
            Session data is from the official GEN M programme. Venue map labels
            come from the supplied artwork; labels marked as supplied-map are
            provisional.
          </p>
          <p className="shrink-0 font-display text-[10px] font-semibold tracking-[0.18em] text-white/55 uppercase">
            GEN M Explorer
          </p>
        </div>
      </div>
    </footer>
  );
}
