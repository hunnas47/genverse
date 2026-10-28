import { describe, expect, it } from "vitest";

import { SHELL_SETS, SHELLS_BY_ID } from "@/data/quest";
import { VENUE_MAP } from "@/data/venue-map";
import { canOccupyPosition } from "@/game/systems/collision-system";

describe("quest shell placement", () => {
  it("places every shell on walkable beach inside the playable bounds", () => {
    for (const set of SHELL_SETS) {
      for (const shell of set.shells) {
        const walkable = canOccupyPosition({
          x: shell.x,
          y: shell.y,
          radius: VENUE_MAP.player.radius,
          bounds: VENUE_MAP.playableBounds,
          obstacles: VENUE_MAP.obstacles,
        });

        expect(walkable, `${set.id}/${shell.id}`).toBe(true);
      }
    }
  });

  it("uses unique shell ids and non-empty sets", () => {
    expect(SHELL_SETS.length).toBeGreaterThan(1);
    expect(SHELLS_BY_ID.size).toBe(
      SHELL_SETS.reduce((total, set) => total + set.shells.length, 0),
    );

    for (const set of SHELL_SETS) {
      expect(set.shells.length).toBeGreaterThan(0);
      expect(new Set(set.shells.map((shell) => shell.id)).size).toBe(
        set.shells.length,
      );
    }
  });
});
