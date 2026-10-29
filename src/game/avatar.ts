export type AvatarFacing = "up" | "down" | "left" | "right";

/**
 * Phaser texture keys for the three supplied avatar views. Left-facing uses the
 * right view with a horizontal flip, so no fourth asset is needed.
 */
export const AVATAR_TEXTURES: Record<
  Exclude<AvatarFacing, "left">,
  string
> = {
  up: "avatar-up",
  down: "avatar-down",
  right: "avatar-right",
};

/**
 * Runtime avatar derivatives are 320px tall WebP files generated from the
 * source PNGs. That stays crisp at the game's largest mobile render scale while
 * keeping the three textures under 30KB combined.
 */
export const AVATAR_ASSETS: Record<
  Exclude<AvatarFacing, "left">,
  string
> = {
  up: "/images/assets/avatar_up.webp",
  down: "/images/assets/avatar_down.webp",
  right: "/images/assets/avatar_right.webp",
};

/** World-pixel height. The old vector avatar was about 65px tall. */
export const AVATAR_DISPLAY_HEIGHT = 76;

/**
 * Picks one of the three supplied views from actual movement. Diagonals favour
 * the side view; mostly-vertical movement uses the front/back view.
 */
export function getAvatarFacing(
  dx: number,
  dy: number,
): AvatarFacing | null {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }

  return dy > 0 ? "down" : "up";
}
