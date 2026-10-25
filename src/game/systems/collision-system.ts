import type { CollisionObstacle, RectBounds } from "@/types/map";

export interface WalkableCheck {
  x: number;
  y: number;
  radius: number;
  bounds: RectBounds;
  obstacles: CollisionObstacle[];
}

export interface WalkableSearch extends WalkableCheck {
  /** Maximum distance from the requested point to search. */
  maxDistance?: number;
  /** Distance between search rings. */
  step?: number;
}

/**
 * Finds the nearest walkable position to a requested world point.
 *
 * Venue anchors often sit on stage structures or other blocked artwork. This
 * searches outward in rings so a selected venue can still be reached without
 * hardcoding a separate spawn point for every venue.
 */
export function findWalkablePointNear({
  x,
  y,
  radius,
  bounds,
  obstacles,
  maxDistance = 320,
  step = 20,
}: WalkableSearch): { x: number; y: number } | null {
  if (canOccupyPosition({ x, y, radius, bounds, obstacles })) {
    return { x, y };
  }

  for (let distance = step; distance <= maxDistance; distance += step) {
    const samples = Math.max(8, Math.ceil((2 * Math.PI * distance) / step));

    for (let index = 0; index < samples; index += 1) {
      const angle = (index / samples) * Math.PI * 2;
      const candidateX = x + Math.cos(angle) * distance;
      const candidateY = y + Math.sin(angle) * distance;

      if (
        canOccupyPosition({
          x: candidateX,
          y: candidateY,
          radius,
          bounds,
          obstacles,
        })
      ) {
        return { x: candidateX, y: candidateY };
      }
    }
  }

  return null;
}

/**
 * Checks whether a circular player footprint can occupy a world position.
 *
 * This is intentionally independent of Phaser so the same geometry can later
 * drive keyboard, joystick, tap-to-move, and pathfinding without drifting.
 */
export function canOccupyPosition({
  x,
  y,
  radius,
  bounds,
  obstacles,
}: WalkableCheck): boolean {
  if (
    x - radius < bounds.x ||
    x + radius > bounds.x + bounds.width ||
    y - radius < bounds.y ||
    y + radius > bounds.y + bounds.height
  ) {
    return false;
  }

  for (const obstacle of obstacles) {
    if (obstacle.kind === "circle") {
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const minimumDistance = radius + obstacle.radius;

      if (dx * dx + dy * dy < minimumDistance * minimumDistance) {
        return false;
      }

      continue;
    }

    const closestX = Math.max(
      obstacle.x,
      Math.min(x, obstacle.x + obstacle.width),
    );
    const closestY = Math.max(
      obstacle.y,
      Math.min(y, obstacle.y + obstacle.height),
    );
    const dx = x - closestX;
    const dy = y - closestY;

    if (dx * dx + dy * dy < radius * radius) {
      return false;
    }
  }

  return true;
}
