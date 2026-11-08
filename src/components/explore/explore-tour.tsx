"use client";

import {
  Check,
  Footprints,
  Shell,
  Stamp,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";
import type { MapPoint } from "@/types/map";

const DESKTOP_QUERY = "(min-width: 1024px)";
/** World pixels the avatar must travel for the walk step to count. */
const WALK_DISTANCE = 60;
const DONE_AUTO_CLOSE_MS = 5000;

type StepId = "walk" | "shell" | "stamp" | "done";

interface GuideStep {
  id: StepId;
  title: string;
  body: string;
  desktopBody?: string;
  icon: LucideIcon;
  /** Control to ring while this step is active (if visible). */
  anchor?: string;
}

const STEPS: readonly GuideStep[] = [
  {
    id: "walk",
    title: "Take a walk",
    body: "Drag the joystick, or tap anywhere on the map to walk there.",
    desktopBody: "Click anywhere on the map, or use W A S D or the arrow keys.",
    icon: Footprints,
    anchor: '[data-tour="joystick"]',
  },
  {
    id: "shell",
    title: "Find a glowing shell",
    body: "Lime shells are hidden around the beach. Walk into one to collect it.",
    icon: Shell,
    anchor: '[data-tour="profile"]',
  },
  {
    id: "stamp",
    title: "Stamp a venue",
    body: "Walk up to any marker, open it, and tap Check in for 25 points.",
    icon: Stamp,
  },
  {
    id: "done",
    title: "You're all set",
    body: "New shells appear every day. Tap the trophy to see today's leaderboard.",
    icon: Trophy,
    anchor: '[data-tour="leaderboard"]',
  },
];

const TASK_COUNT = STEPS.length - 1;

function subscribeToDesktop(callback: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", callback);

  return () => media.removeEventListener("change", callback);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

function findVisible(selector: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
      (element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
    ) ?? null
  );
}

/** A pulsing lime ring around the control the current step is about. */
function AnchorRing({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => setRect(findVisible(selector)?.getBoundingClientRect() ?? null);
    const frame = window.requestAnimationFrame(update);
    const timer = window.setInterval(update, 500);

    window.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener("resize", update);
    };
  }, [selector]);

  if (!rect) {
    return null;
  }

  const padding = 6;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed z-[25] rounded-full border-2 border-lime shadow-[0_0_0_4px_rgba(237,242,181,0.25)] motion-safe:animate-pulse"
      style={{
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }}
    />
  );
}

/**
 * Learn-by-doing guide for first-time visitors.
 *
 * It never blocks the map: a small card lists three real tasks (walk, find a
 * shell, stamp a venue) and ticks each off when the player actually does it.
 * Steps the player has already done today are skipped.
 */
export function ExploreTour({
  visible,
  playerPosition,
  shellsFound,
  shellsTotal,
  checkIns,
  onClose,
}: {
  /** False while a panel or dialog is open; progress is kept. */
  visible: boolean;
  playerPosition: MapPoint | null;
  shellsFound: number;
  shellsTotal: number;
  checkIns: number;
  onClose: () => void;
}) {
  const isDesktop = useIsDesktop();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const baseline = useRef<{
    position: MapPoint | null;
    shells: number;
    checkIns: number;
  } | null>(null);

  // Record where the player started each step, so earlier actions don't count.
  useEffect(() => {
    baseline.current = {
      position: playerPosition,
      shells: shellsFound,
      checkIns,
    };
    // Only when the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useEffect(() => {
    const start = baseline.current;

    if (!start) {
      return;
    }

    let complete = false;

    if (step.id === "walk") {
      if (!start.position && playerPosition) {
        baseline.current = { ...start, position: playerPosition };
        return;
      }

      complete =
        !!start.position &&
        !!playerPosition &&
        Math.hypot(
          playerPosition.x - start.position.x,
          playerPosition.y - start.position.y,
        ) > WALK_DISTANCE;
    } else if (step.id === "shell") {
      complete =
        shellsFound > start.shells ||
        (shellsTotal > 0 && shellsFound >= shellsTotal);
    } else if (step.id === "stamp") {
      complete = checkIns > start.checkIns;
    }

    if (!complete) {
      return;
    }

    const timer = window.setTimeout(
      () => setStepIndex((value) => Math.min(value + 1, STEPS.length - 1)),
      // Let the tick show before moving on.
      600,
    );

    return () => window.clearTimeout(timer);
  }, [checkIns, playerPosition, shellsFound, shellsTotal, step.id]);

  useEffect(() => {
    if (step.id !== "done" || !visible) {
      return;
    }

    const timer = window.setTimeout(onClose, DONE_AUTO_CLOSE_MS);

    return () => window.clearTimeout(timer);
  }, [onClose, step.id, visible]);

  if (!visible) {
    return null;
  }

  const Icon = step.icon;
  const body = isDesktop && step.desktopBody ? step.desktopBody : step.body;
  const isDone = step.id === "done";
  const anchor =
    step.anchor && !(isDesktop && step.id === "walk") ? step.anchor : null;

  return (
    <>
      {anchor && <AnchorRing selector={anchor} />}

      <section
        aria-label="Getting started"
        className="pointer-events-auto w-full max-w-sm rounded-3xl border border-brand-deep/15 bg-cream/95 p-3 text-brand-deep shadow-lift backdrop-blur-md"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl",
              isDone ? "bg-lime text-brand-deep" : "bg-brand-deep text-lime",
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>

          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="font-display text-[10px] font-bold tracking-[0.18em] text-brand-deep/60 uppercase">
              {isDone
                ? "Getting started · Done"
                : `Getting started · ${stepIndex + 1} of ${TASK_COUNT}`}
            </p>
            <h2 className="mt-0.5 text-base leading-tight font-semibold">
              {step.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-brand-deep/75 [@media(max-height:520px)]:line-clamp-1">
              {body}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isDone ? "Close the guide" : "Skip the guide"}
            className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full text-brand-deep/60 transition hover:bg-brand-deep/5 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <ol
          aria-label="Tasks"
          className="mt-3 flex gap-1.5 [@media(max-height:520px)]:hidden"
        >
          {STEPS.slice(0, TASK_COUNT).map((item, index) => {
            const done = index < stepIndex;
            const current = index === stepIndex;

            return (
              <li
                key={item.id}
                className={cn(
                  "flex h-6 flex-1 items-center justify-center gap-1 rounded-full font-display text-[9px] font-bold tracking-[0.08em] uppercase transition-colors",
                  done
                    ? "bg-brand-deep text-lime"
                    : current
                      ? "bg-lime text-brand-deep"
                      : "bg-brand-deep/[0.07] text-brand-deep/50",
                )}
              >
                {done && <Check aria-hidden="true" className="size-3" />}
                <span>{item.id === "walk" ? "Walk" : item.id === "shell" ? "Shell" : "Stamp"}</span>
                <span className="sr-only">
                  {done ? "(done)" : current ? "(current)" : ""}
                </span>
              </li>
            );
          })}
        </ol>

        {!isDone && step.id !== "walk" && (
          <button
            type="button"
            onClick={() => setStepIndex((value) => value + 1)}
            className="mt-1 min-h-11 w-full [@media(max-height:520px)]:hidden rounded-full font-display text-[10px] font-bold tracking-[0.1em] text-brand-deep/60 uppercase transition hover:bg-brand-deep/5 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            Skip this step
          </button>
        )}
      </section>
    </>
  );
}
