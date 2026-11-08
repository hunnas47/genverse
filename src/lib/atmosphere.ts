/**
 * Time-of-day lighting for the beach map, in Kozhikode (Asia/Kolkata) time.
 *
 * The boundaries are a visual choice tuned around mid-November sunset at
 * Kozhikode (about 6 pm IST), not astronomical data.
 */
export type AtmospherePhase = "day" | "golden" | "dusk" | "night";

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MINUTES_PER_DAY = 24 * 60;

/** [start minute of the IST day, phase], in order. */
const PHASE_STARTS: ReadonlyArray<readonly [number, AtmospherePhase]> = [
  [6 * 60, "day"],
  [16 * 60 + 30, "golden"],
  [17 * 60 + 50, "dusk"],
  [18 * 60 + 40, "night"],
];

/** Minutes since midnight in Asia/Kolkata for a UTC timestamp. */
export function getIstMinuteOfDay(nowMs: number): number {
  const minutes = Math.floor(nowMs / 60_000) + IST_OFFSET_MINUTES;

  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function getAtmospherePhase(nowMs: number): AtmospherePhase {
  const minute = getIstMinuteOfDay(nowMs);
  // Before 06:00 it is still the previous evening's night.
  let phase: AtmospherePhase = "night";

  for (const [start, candidate] of PHASE_STARTS) {
    if (minute >= start) {
      phase = candidate;
    }
  }

  return phase;
}
