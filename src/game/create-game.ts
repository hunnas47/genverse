import type Phaser from "phaser";

import { BeachScene } from "@/game/scenes/beach-scene";

export interface CreateGameOptions {
  parent: HTMLElement;
  onReady?: () => void;
}

/**
 * Boots Phaser on the client. Phaser itself is imported dynamically so it is
 * never evaluated during the server render.
 */
export async function createGame({
  parent,
  onReady,
}: CreateGameOptions): Promise<Phaser.Game> {
  const { default: PhaserRuntime } = await import("phaser");

  const config: Phaser.Types.Core.GameConfig = {
    type: PhaserRuntime.AUTO,
    backgroundColor: "#0b6f8e",
    scene: [new BeachScene(onReady)],
    render: {
      antialias: true,
      roundPixels: true,
    },
    scale: {
      parent,
      mode: PhaserRuntime.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    input: {
      keyboard: true,
      mouse: false,
      touch: true,
      gamepad: false,
    },
  };

  return new PhaserRuntime.Game(config);
}
