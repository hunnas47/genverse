import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border font-display font-bold uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "border-lime bg-lime text-brand-deep hover:border-cream hover:bg-cream focus-visible:outline-lime",
  outline:
    "border-white/30 bg-white/5 text-white hover:border-white/55 hover:bg-white/10 focus-visible:outline-white",
  dark: "border-brand-deep bg-brand-deep text-lime hover:bg-brand-deep/90 focus-visible:outline-brand-deep",
  cream:
    "border-cream bg-cream text-brand-deep hover:border-lime hover:bg-lime focus-visible:outline-cream",
  ghost:
    "border-transparent bg-transparent text-white hover:bg-white/10 focus-visible:outline-white",
} as const;

const sizes = {
  sm: "min-h-10 px-4 py-2 text-xs",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
} as const;

export function ActionLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  external = false,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  external?: boolean;
  ariaLabel?: string;
}) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={classes}>
      {children}
    </Link>
  );
}
