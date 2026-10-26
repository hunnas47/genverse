import type Phaser from "phaser";

import type { GameEventBridge } from "@/game/event-bridge";
import { BeachScene } from "@/game/scenes/beach-scene";

export interface CreateGameOptions {
  parent: HTMLElement;
  events: GameEventBridge;
  /** Optional venue to focus when the scene starts, usually from a deep link. */
  focusVenueId?: string | null;
}

/**
 * Boots Phaser on the client. Phaser itself is imported dynamically so it is
 * never evaluated during the server render.
 */
export async function createGame({
  parent,
  events,
  focusVenueId = null,
}: CreateGameOptions): Promise<Phaser.Game> {
  const { default: PhaserRuntime } = await import("phaser");

  const config: Phaser.Types.Core.GameConfig = {
    type: PhaserRuntime.AUTO,
    backgroundColor: "#2c2d6f",
    scene: [new BeachScene(events, focusVenueId)],
    render: {
      antialias: true,
      roundPixels: true,
    },
    // Movement uses real frame time (clamped in the scene), so a slow device
    // should not make the explorer walk in slow motion.
    fps: {
      smoothStep: false,
    },
    scale: {
      parent,
      mode: PhaserRuntime.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      gamepad: false,
    },
  };

  return new PhaserRuntime.Game(config);
}
