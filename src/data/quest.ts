import type { QuestShellSet } from "@/types/quest";

/** A shell find is worth this much, once per shell per day. */
export const SHELL_POINTS = 10;
/** Awarded when every shell in today's set has been found. */
export const SHELL_SET_BONUS = 50;
/** A venue check-in is worth this much, once per venue per day. */
export const VENUE_CHECKIN_POINTS = 25;
/** Guards against accidental double taps and trivial scripted farming. */
export const SHELL_COLLECT_COOLDOWN_MS = 1200;

export const QUEST_EVENT_DAY_IDS: readonly string[] = [
  "2026-11-13",
  "2026-11-14",
  "2026-11-15",
];

/** Rotation anchor. Which set is live is stable for every client and the server. */
export const QUEST_ROTATION_EPOCH = "2026-10-01";

/**
 * Shell positions are hand-placed on open beach and park paths, outside the
 * collision footprints in `src/data/venue-map.ts`. `src/data/quest.test.ts`
 * fails if a shell sits inside an obstacle or outside the playable bounds.
 */
export const SHELL_SETS: readonly QuestShellSet[] = [
  {
    id: "tide-pool",
    name: "Tide Pool",
    shells: [
      { id: "tide-1", x: 320, y: 280 },
      { id: "tide-2", x: 300, y: 245 },
      { id: "tide-3", x: 600, y: 250 },
      { id: "tide-4", x: 900, y: 250 },
      { id: "tide-5", x: 1300, y: 270 },
      { id: "tide-6", x: 300, y: 560 },
      { id: "tide-7", x: 330, y: 700 },
      { id: "tide-8", x: 550, y: 765 },
      { id: "tide-9", x: 800, y: 670 },
      { id: "tide-10", x: 1200, y: 760 },
    ],
  },
  {
    id: "coral-cove",
    name: "Coral Cove",
    shells: [
      { id: "coral-1", x: 480, y: 560 },
      { id: "coral-2", x: 550, y: 640 },
      { id: "coral-3", x: 675, y: 640 },
      { id: "coral-4", x: 780, y: 620 },
      { id: "coral-5", x: 960, y: 620 },
      { id: "coral-6", x: 1060, y: 620 },
      { id: "coral-7", x: 1320, y: 560 },
      { id: "coral-8", x: 1300, y: 480 },
      { id: "coral-9", x: 1400, y: 760 },
      { id: "coral-10", x: 1200, y: 770 },
    ],
  },
  {
    id: "moonlit-shore",
    name: "Moonlit Shore",
    shells: [
      { id: "moon-1", x: 350, y: 250 },
      { id: "moon-2", x: 450, y: 250 },
      { id: "moon-3", x: 760, y: 250 },
      { id: "moon-4", x: 1100, y: 250 },
      { id: "moon-5", x: 1420, y: 250 },
      { id: "moon-6", x: 300, y: 650 },
      { id: "moon-7", x: 450, y: 730 },
      { id: "moon-8", x: 675, y: 700 },
      { id: "moon-9", x: 930, y: 630 },
      { id: "moon-10", x: 1290, y: 700 },
    ],
  },
];

export const SHELLS_BY_ID: ReadonlyMap<string, { id: string; x: number; y: number; setId: string }> =
  new Map(
    SHELL_SETS.flatMap((set) =>
      set.shells.map((shell) => [
        shell.id,
        { ...shell, setId: set.id },
      ] as const),
    ),
  );
