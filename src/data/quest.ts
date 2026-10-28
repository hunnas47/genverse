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
 * Shell positions are hand-placed on open beach, outside the collision
 * footprints in `src/data/venue-map.ts`. `src/data/quest.test.ts` fails if a
 * shell sits inside an obstacle or outside the playable bounds.
 */
export const SHELL_SETS: readonly QuestShellSet[] = [
  {
    id: "tide-pool",
    name: "Tide Pool",
    shells: [
      { id: "tide-1", x: 150, y: 1120 },
      { id: "tide-2", x: 420, y: 980 },
      { id: "tide-3", x: 760, y: 1120 },
      { id: "tide-4", x: 930, y: 760 },
      { id: "tide-5", x: 1130, y: 530 },
      { id: "tide-6", x: 1280, y: 660 },
      { id: "tide-7", x: 1720, y: 620 },
      { id: "tide-8", x: 1830, y: 1100 },
      { id: "tide-9", x: 1300, y: 1250 },
      { id: "tide-10", x: 600, y: 1320 },
    ],
  },
  {
    id: "coral-cove",
    name: "Coral Cove",
    shells: [
      { id: "coral-1", x: 250, y: 530 },
      { id: "coral-2", x: 500, y: 920 },
      { id: "coral-3", x: 800, y: 700 },
      { id: "coral-4", x: 1010, y: 700 },
      { id: "coral-5", x: 1340, y: 760 },
      { id: "coral-6", x: 1470, y: 980 },
      { id: "coral-7", x: 1900, y: 800 },
      { id: "coral-8", x: 1100, y: 1150 },
      { id: "coral-9", x: 350, y: 1250 },
      { id: "coral-10", x: 900, y: 1280 },
    ],
  },
  {
    id: "moonlit-shore",
    name: "Moonlit Shore",
    shells: [
      { id: "moon-1", x: 80, y: 900 },
      { id: "moon-2", x: 300, y: 1100 },
      { id: "moon-3", x: 720, y: 1030 },
      { id: "moon-4", x: 980, y: 720 },
      { id: "moon-5", x: 1260, y: 1020 },
      { id: "moon-6", x: 1420, y: 640 },
      { id: "moon-7", x: 1650, y: 1000 },
      { id: "moon-8", x: 1800, y: 1250 },
      { id: "moon-9", x: 850, y: 1350 },
      { id: "moon-10", x: 200, y: 1400 },
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
