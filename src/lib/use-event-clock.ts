"use client";

import { useSyncExternalStore } from "react";

/**
 * Client-only wall clock for "now / next" and "today" UI, rounded to the
 * minute. It returns `null` on the server and during hydration, so prerendered
 * pages never depend on the build time.
 *
 * For previews, `?now=2026-11-14T10:30` (read as Asia/Kolkata unless it has
 * an explicit offset) shifts the clock on that page load.
 */

const TICK_MS = 30_000;
const MINUTE_MS = 60_000;

let offsetMs: number | null = null;
let current: number | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function readOffset(): number {
  if (offsetMs !== null) {
    return offsetMs;
  }

  offsetMs = 0;

  try {
    const raw = new URLSearchParams(window.location.search).get("now");

    if (raw) {
      const hasZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(raw);
      const parsed = Date.parse(hasZone ? raw : `${raw}+05:30`);

      if (!Number.isNaN(parsed)) {
        offsetMs = parsed - Date.now();
      }
    }
  } catch {
    // Keep the real clock.
  }

  return offsetMs;
}

function read(): number {
  return Math.floor((Date.now() + readOffset()) / MINUTE_MS) * MINUTE_MS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (!timer) {
    timer = setInterval(() => {
      const next = read();

      if (next !== current) {
        current = next;
        listeners.forEach((notify) => notify());
      }
    }, TICK_MS);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot(): number {
  if (current === null) {
    current = read();
  }

  return current;
}

function getServerSnapshot(): null {
  return null;
}

export function useEventClock(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
