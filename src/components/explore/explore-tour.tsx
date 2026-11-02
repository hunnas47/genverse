"use client";

import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Move,
  RotateCcw,
  Sparkles,
  Stamp,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

type TourAnchor = string | null;

interface TourStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  note?: string;
  icon: LucideIcon;
  anchor: TourAnchor;
}

const STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    eyebrow: "Welcome",
    title: "Meet your beach map",
    body: "Walk the GEN M venue, find daily shells, and stamp venues as you explore.",
    note: "This quick tour takes about 20 seconds.",
    icon: Compass,
    anchor: null,
  },
  {
    id: "move",
    eyebrow: "Move",
    title: "Walk the beach",
    body: "Drag the joystick or tap anywhere on the map to walk there.",
    note: "On a keyboard: W A S D or the arrow keys.",
    icon: Move,
    anchor: '[data-tour="joystick"]',
  },
  {
    id: "shells",
    eyebrow: "Collect",
    title: "Find glowing shells",
    body: "Walk close to a glowing shell and it is collected automatically.",
    note: "Your profile ring shows how many shells you have found today.",
    icon: Sparkles,
    anchor: '[data-tour="profile"]',
  },
  {
    id: "venues",
    eyebrow: "Check in",
    title: "Stamp your venue passport",
    body: "Open the map, choose a venue, and tap check in for 25 points.",
    note: "You can also tap a venue marker on the beach.",
    icon: Stamp,
    anchor: '[data-tour="map"], [data-tour="minimap"]',
  },
  {
    id: "ready",
    eyebrow: "Ready",
    title: "Your beach, your pace",
    body: "Find shells, collect venue stamps, and see where you rank on the leaderboard.",
    note: "Your progress is saved on this device.",
    icon: Trophy,
    anchor: null,
  },
];

type Spotlight = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
};

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function findAnchor(selector: string): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(selector),
  );

  return candidates.find(isVisible) ?? null;
}

export function ExploreTour({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const titleId = "explore-tour-title";
  const descriptionId = "explore-tour-description";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      primaryRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [stepIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const update = () => {
      if (!step.anchor) {
        setSpotlight(null);
        return;
      }

      const anchor = findAnchor(step.anchor);

      if (!anchor) {
        setSpotlight(null);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const padding = 10;

      setSpotlight({
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        radius: Math.min(28, (rect.height + padding * 2) / 2),
      });
    };

    const frame = window.requestAnimationFrame(update);
    const settleTimer = window.setTimeout(update, 150);

    window.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", update);
    };
  }, [step.anchor]);

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        aria-hidden="true"
        className={
          spotlight
            ? "absolute inset-0"
            : "absolute inset-0 bg-brand-deep/65 backdrop-blur-[2px]"
        }
      />

      {spotlight && (
        <div
          aria-hidden="true"
          className="explore-tour-spotlight pointer-events-none absolute z-[71]"
          style={{
            left: spotlight.left,
            top: spotlight.top,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: spotlight.radius,
            boxShadow:
              "0 0 0 2px var(--lime), 0 0 0 9999px rgba(28, 29, 58, 0.68)",
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-brand-deep/15 bg-cream p-5 text-brand-deep shadow-lift sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[10px] font-bold tracking-[0.2em] text-brand-deep/65 uppercase">
                {step.eyebrow}
              </p>
              <h2
                id={titleId}
                className="mt-1 text-balance text-2xl leading-tight font-medium"
              >
                {step.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2.5 py-2 font-display text-[10px] font-bold tracking-[0.08em] text-brand-deep/65 uppercase transition hover:bg-brand-deep/5 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              Skip tour
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-deep/10 bg-brand-deep/[0.04] p-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-deep text-lime">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p
                id={descriptionId}
                className="text-sm leading-relaxed text-brand-deep/80"
              >
                {step.body}
              </p>
              {step.note && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-brand-deep/60">
                  {step.note}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="font-display text-[10px] font-bold tracking-[0.16em] text-brand-deep/60 uppercase">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <div aria-hidden="true" className="flex gap-1.5">
              {STEPS.map((item, index) => (
                <span
                  key={item.id}
                  className={
                    index <= stepIndex
                      ? "h-1.5 w-5 rounded-full bg-brand-deep"
                      : "h-1.5 w-5 rounded-full bg-brand-deep/15"
                  }
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() =>
                  setStepIndex((value) => Math.max(0, value - 1))
                }
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-full border border-brand-deep/15 bg-white px-4 py-3 font-display text-[11px] font-bold tracking-[0.08em] text-brand-deep uppercase transition hover:border-brand-deep/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Back
              </button>
            )}

            <button
              ref={primaryRef}
              type="button"
              onClick={
                isLast
                  ? onClose
                  : () => setStepIndex((value) => value + 1)
              }
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-deep px-4 py-3 font-display text-[11px] font-bold tracking-[0.1em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            >
              {isFirst
                ? "Start tour"
                : isLast
                  ? "Start exploring"
                  : "Next"}
              {!isLast && (
                <ArrowRight aria-hidden="true" className="size-3.5" />
              )}
            </button>
          </div>

          <p aria-live="polite" className="sr-only">
            Step {stepIndex + 1} of {STEPS.length}: {step.title}
          </p>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-brand-deep/55">
            <RotateCcw aria-hidden="true" className="size-3" />
            You can replay this from Controls &amp; help.
          </p>
        </section>
      </div>
    </div>
  );
}
