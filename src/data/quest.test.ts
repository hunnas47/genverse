import { describe, expect, it } from "vitest";

import { SHELL_SETS, SHELLS_BY_ID } from "@/data/quest";
import { VENUE_MAP } from "@/data/venue-map";
import { VENUES } from "@/data/venues";
import {
  canOccupyPosition,
  findWalkablePointNear,
} from "@/game/systems/collision-system";
import {
  buildNavigationGrid,
  findNavigationPath,
  findReachablePointNear,
} from "@/game/systems/pathfinding";

describe("quest shell placement", () => {
  it("places every shell on walkable beach or park inside the bounds", () => {
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

describe("venue map anchors", () => {
  it("keeps every mapped venue inside the playable bounds", () => {
    const { x, y, width, height } = VENUE_MAP.playableBounds;

    for (const venue of VENUES) {
      if (!venue.mapPosition) {
        continue;
      }

      expect(venue.mapPosition.x, venue.id).toBeGreaterThanOrEqual(x);
      expect(venue.mapPosition.x, venue.id).toBeLessThanOrEqual(x + width);
      expect(venue.mapPosition.y, venue.id).toBeGreaterThanOrEqual(y);
      expect(venue.mapPosition.y, venue.id).toBeLessThanOrEqual(y + height);
    }
  });

  it("keeps a walkable approach inside each venue's interaction radius", () => {
    for (const venue of VENUES) {
      if (!venue.mapPosition) {
        continue;
      }

      const point = findWalkablePointNear({
        x: venue.mapPosition.x,
        y: venue.mapPosition.y,
        radius: VENUE_MAP.player.radius,
        bounds: VENUE_MAP.playableBounds,
        obstacles: VENUE_MAP.obstacles,
        maxDistance: Math.max(320, venue.mapPosition.interactionRadius + 140),
      });

      expect(point, venue.id).not.toBeNull();

      if (!point) {
        continue;
      }

      const distance = Math.hypot(
        point.x - venue.mapPosition.x,
        point.y - venue.mapPosition.y,
      );

      expect(distance, venue.id).toBeLessThanOrEqual(
        venue.mapPosition.interactionRadius,
      );
    }
  });

  it("keeps the playable bounds inside the world image", () => {
    const { x, y, width, height } = VENUE_MAP.playableBounds;

    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(VENUE_MAP.world.width);
    expect(y + height).toBeLessThanOrEqual(VENUE_MAP.world.height);
  });

  it("keeps Beach Road, the roadside strip, and the main paths walkable", () => {
    const pathPoints = [
      [220, 880],
      [300, 880],
      [675, 880],
      [1000, 880],
      [1400, 880],
      [675, 800],
      [675, 720],
      [700, 600],
      [550, 600],
      [930, 720],
      [1150, 720],
      [1200, 615],
    ] as const;

    for (const [x, y] of pathPoints) {
      const walkable = canOccupyPosition({
        x,
        y,
        radius: VENUE_MAP.player.radius,
        bounds: VENUE_MAP.playableBounds,
        obstacles: VENUE_MAP.obstacles,
      });

      expect(walkable, `${x},${y}`).toBe(true);
    }
  });
});

describe("navigation connectivity", () => {
  const grid = buildNavigationGrid({
    bounds: VENUE_MAP.playableBounds,
    obstacles: VENUE_MAP.obstacles,
    radius: VENUE_MAP.player.radius,
  });

  it("reaches every mapped venue from the spawn", () => {
    for (const venue of VENUES) {
      if (!venue.mapPosition) {
        continue;
      }

      const { x, y, interactionRadius } = venue.mapPosition;
      const approach = findReachablePointNear({
        grid,
        start: VENUE_MAP.spawn,
        x,
        y,
        radius: VENUE_MAP.player.radius,
        bounds: VENUE_MAP.playableBounds,
        obstacles: VENUE_MAP.obstacles,
        maxDistance: interactionRadius,
      });

      expect(approach, venue.id).not.toBeNull();
    }
  });

  it("reaches Beach Road from the spawn", () => {
    for (const goal of [
      { x: 220, y: 880 },
      { x: 300, y: 880 },
      { x: 675, y: 880 },
      { x: 1000, y: 880 },
      { x: 1400, y: 880 },
    ]) {
      const path = findNavigationPath({
        grid,
        start: VENUE_MAP.spawn,
        goal,
      });

      expect(path, `${goal.x},${goal.y}`).not.toBeNull();
    }
  });
});
