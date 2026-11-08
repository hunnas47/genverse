"use client";

import { Move } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/utils";

const BASE_SIZE = 112;
const THUMB_SIZE = 44;
const MAX_OFFSET = (BASE_SIZE - THUMB_SIZE) / 2;
const DEAD_ZONE = 0.16;
const FIRST_HIDE_DELAY_MS = 4200;
const IDLE_HIDE_DELAY_MS = 1400;
const JOYSTICK_SEEN_KEY = "genm:explore:joystick:v1";

function hasSeenJoystick(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(JOYSTICK_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markJoystickSeen(): void {
  try {
    window.localStorage.setItem(JOYSTICK_SEEN_KEY, "1");
  } catch {
    // Storage can be blocked; the joystick still collapses for this session.
  }
}

/**
 * Touch-first joystick that feeds the same movement intent as the keyboard.
 *
 * The full control appears on first load, then collapses into a compact Move
 * button. Touching the control area expands it again, so the map stays clear
 * while the joystick remains one tap away.
 *
 * It reports an analog vector capped at unit length, so a small tilt walks
 * slowly. Collision, camera, and animation stay in the Phaser scene, so every
 * input path shares one movement system.
 */
export function VirtualJoystick({
  onMove,
  className,
  paused = false,
}: {
  onMove: (x: number, y: number) => void;
  className?: string;
  paused?: boolean;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(() => !hasSeenJoystick());
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isExpanded = expanded || paused;

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const scheduleCollapse = useCallback(
    (delay: number) => {
      clearCollapseTimer();

      if (pointerIdRef.current !== null) {
        return;
      }

      collapseTimerRef.current = window.setTimeout(() => {
        collapseTimerRef.current = null;

        if (pointerIdRef.current === null) {
          markJoystickSeen();
          setExpanded(false);
        }
      }, delay);
    },
    [clearCollapseTimer],
  );

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) {
        return;
      }

      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);

      if (distance > MAX_OFFSET) {
        dx = (dx / distance) * MAX_OFFSET;
        dy = (dy / distance) * MAX_OFFSET;
      }

      setOffset({ x: dx, y: dy });

      const nx = dx / MAX_OFFSET;
      const ny = dy / MAX_OFFSET;
      const magnitude = Math.hypot(nx, ny);

      if (magnitude < DEAD_ZONE) {
        onMove(0, 0);
        return;
      }

      const scale = Math.min(1, magnitude) / magnitude;
      onMove(nx * scale, ny * scale);
    },
    [onMove],
  );

  const release = useCallback(() => {
    pointerIdRef.current = null;
    setOffset({ x: 0, y: 0 });
    onMove(0, 0);
    scheduleCollapse(IDLE_HIDE_DELAY_MS);
  }, [onMove, scheduleCollapse]);

  useEffect(() => {
    const handleBlur = () => release();

    window.addEventListener("blur", handleBlur);

    if (paused) {
      clearCollapseTimer();
    } else if (!hasSeenJoystick()) {
      scheduleCollapse(FIRST_HIDE_DELAY_MS);
    } else {
      scheduleCollapse(IDLE_HIDE_DELAY_MS);
    }

    return () => {
      window.removeEventListener("blur", handleBlur);
      clearCollapseTimer();
      pointerIdRef.current = null;
      onMove(0, 0);
    };
  }, [clearCollapseTimer, onMove, paused, release, scheduleCollapse]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (pointerIdRef.current !== null) {
      return;
    }

    clearCollapseTimer();
    markJoystickSeen();
    setExpanded(true);
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    update(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    update(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    release();
  };

  const handleLostPointerCapture = () => {
    if (pointerIdRef.current !== null) {
      release();
    }
  };

  return (
    <div
      data-tour="joystick"
      className={cn(
        "pointer-events-auto flex touch-none flex-col items-center select-none",
        className,
      )}
    >
      <div
        ref={baseRef}
        role="group"
        aria-label="Virtual joystick. Touch and drag to move. Release to stop."
        data-expanded={isExpanded}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handleLostPointerCapture}
        className="relative touch-none rounded-full"
        style={{ width: BASE_SIZE, height: BASE_SIZE }}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full border border-white/25 bg-brand-deep/80 shadow-lift sm:backdrop-blur-md transition-opacity duration-300 motion-reduce:transition-none",
            isExpanded ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-2 rounded-full border border-white/10 transition-opacity duration-300 motion-reduce:transition-none",
            isExpanded ? "opacity-100" : "opacity-0",
          )}
        />

        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 grid place-items-center rounded-full border border-lime/40 bg-lime text-brand-deep shadow-lift transition-opacity duration-200 motion-reduce:transition-none",
            isExpanded ? "opacity-100" : "opacity-0",
          )}
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          }}
        >
          <Move className="size-4" />
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-brand-deep/85 text-lime shadow-lift sm:backdrop-blur-md transition-opacity duration-200 motion-reduce:transition-none",
            isExpanded ? "opacity-0" : "opacity-100",
          )}
        >
          <Move className="size-4" />
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-display text-[9px] font-bold tracking-[0.2em] text-white/60 uppercase transition-opacity duration-200 motion-reduce:transition-none",
            isExpanded ? "opacity-100" : "opacity-0",
          )}
        >
          Move
        </span>
      </div>
    </div>
  );
}
