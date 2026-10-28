import { ArrowUpRight, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";

import { ActionLink } from "@/components/site/action-link";
import { Logo } from "@/components/site/logo";
import { formatProgrammeVerifiedDate } from "@/lib/programme";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#programme", label: "Programme" },
  { href: "/#venues", label: "Venues" },
  { href: "/#expo", label: "Expo" },
  { href: "/sessions", label: "Sessions" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3.5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-white/10">
      <div className="border-b border-white/10 bg-brand-deep/55">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 font-display text-[10px] font-semibold tracking-[0.18em] text-white/55 uppercase sm:px-6 lg:px-8">
          <p>13–15 November 2026 · Kozhikode Beach</p>
          <p className="hidden sm:block">
            Official programme · Verified {formatProgrammeVerifiedDate()}
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Logo priority />

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ActionLink
            href="/explore"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Open map
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </ActionLink>

          <details className="group relative lg:hidden">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 font-display text-xs font-bold tracking-[0.08em] text-white uppercase transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime [&::-webkit-details-marker]:hidden">
              <Menu aria-hidden="true" className="size-4" />
              Menu
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl border border-white/15 bg-brand-deep p-2 shadow-lift">
              <nav aria-label="Mobile navigation" className="grid gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  >
                    {link.label}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-3.5 text-white/35"
                    />
                  </Link>
                ))}
              </nav>
              <ActionLink
                href="/explore"
                size="sm"
                className="mt-2 w-full"
              >
                Open the map
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </ActionLink>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
