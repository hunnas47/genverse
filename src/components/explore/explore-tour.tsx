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
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DESKTOP_QUERY = "(min-width: 1024px)";

type TourAnchor = string | readonly string[] | null;

interface TourStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  desktopBody?: string;
  note?: string;
  icon: LucideIcon;
  anchor: TourAnchor;
  desktopAnchor?: TourAnchor;
}

const STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    eyebrow: "Welcome",
    title: "Meet your beach map",
    body: "Explore the GEN M beach map, find daily shells, and stamp venues as you go.",
    note: "This quick tour takes about 20 seconds.",
    icon: Compass,
    anchor: null,
  },
  {
    id: "move",
    eyebrow: "Move",
    title: "Walk the beach",
    body: "Drag the joystick or tap anywhere on the map to walk there.",
    desktopBody: "Tap or click anywhere on the map to walk there.",
    note: "On a keyboard: W A S D or the arrow keys.",
    icon: Move,
    anchor: '[data-tour="joystick"]',
    desktopAnchor: null,
  },
  {
    id: "shells",
    eyebrow: "Collect",
    title: "Find glowing shells",
    body: "Walk close to a glowing shell on the map and it is collected automatically.",
    note: "Your profile ring tracks today's finds.",
    icon: Sparkles,
    anchor: '[data-tour="profile"]',
  },
  {
    id: "venues",
    eyebrow: "Check in",
    title: "Stamp your venue passport",
    body: "Open the map or tap a venue marker, then check in for 25 points.",
    desktopBody:
      "Open the directory or tap a venue marker, then check in for 25 points.",
    note: "Each venue can be stamped once per day.",
    icon: Stamp,
    anchor: '[data-tour="map"]',
    desktopAnchor: ['[data-tour="directory"]', '[data-tour="minimap"]'],
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

type Placement = "center" | "top" | "bottom" | "left" | "right";

type Spotlight = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  placement: Placement;
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

function findAnchor(selector: string | readonly string[]): HTMLElement | null {
  const selectors = typeof selector === "string" ? [selector] : selector;

  for (const candidateSelector of selectors) {
    const candidate = Array.from(
      document.querySelectorAll<HTMLElement>(candidateSelector),
    ).find(isVisible);

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function subscribeToDesktop(callback: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", callback);

  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getDesktopServerSnapshot() {
  return false;
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
}

export function ExploreTour({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const titleId = "explore-tour-title";
  const descriptionId = "explore-tour-description";
  const body = isDesktop && step.desktopBody ? step.desktopBody : step.body;
  const note = step.note;
  const anchor =
    isDesktop && step.desktopAnchor !== undefined
      ? step.desktopAnchor
      : step.anchor;
  const placement = spotlight?.placement ?? "center";
  const isSidePlacement = placement === "left" || placement === "right";
  const placementClass =
    placement === "top"
      ? "items-start justify-center"
      : placement === "bottom"
        ? "items-end justify-center"
        : placement === "left"
          ? "items-center justify-start"
          : placement === "right"
            ? "items-center justify-end"
            : "items-center justify-center";

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
      if (!anchor) {
        setSpotlight(null);
        return;
      }

      const target = findAnchor(anchor);

      if (!target) {
        setSpotlight(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      const padding = 8;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let placement: Placement = "center";

      if (window.innerWidth >= 1024) {
        placement = "center";
      } else if (
        window.innerWidth > window.innerHeight &&
        window.innerHeight < 520
      ) {
        placement = centerX < window.innerWidth / 2 ? "right" : "left";
      } else if (centerY > window.innerHeight * 0.55) {
        placement = "top";
      } else if (centerY < window.innerHeight * 0.45) {
        placement = "bottom";
      }

      setSpotlight({
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        radius: Math.min(28, (rect.height + padding * 2) / 2),
        placement,
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
  }, [anchor]);

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

      <div
        className={`pointer-events-none absolute inset-0 z-[80] flex p-3 sm:p-6 ${placementClass}`}
      >
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-brand-deep/15 bg-cream p-5 text-brand-deep shadow-lift sm:p-7"
          style={
            isSidePlacement
              ? { maxWidth: "min(28rem, calc(100vw - 10rem))" }
              : undefined
          }
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
                {body}
              </p>
              {note && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-brand-deep/60">
                  {note}
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
