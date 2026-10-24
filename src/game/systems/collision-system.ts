import type { CollisionObstacle, RectBounds } from "@/types/map";

export interface WalkableCheck {
  x: number;
  y: number;
  radius: number;
  bounds: RectBounds;
  obstacles: CollisionObstacle[];
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
