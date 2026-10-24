import Phaser from "phaser";

import { VENUE_MAP } from "@/data/venue-map";
import { canOccupyPosition } from "@/game/systems/collision-system";

const MAP_TEXTURE_KEY = "genm-venue-map";
const MOBILE_BREAKPOINT = 640;

type MovementKeys = Record<
  "up" | "down" | "left" | "right",
  Phaser.Input.Keyboard.Key
>;

/**
 * The venue-map scene.
 *
 * Phaser owns drawing, movement, camera, and collision. React owns the overlay
 * and will own venue/session panels in later milestones. The scene reads only
 * world geometry from data, keeping official content out of the engine.
 */
export class BeachScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Container;
  private character?: Phaser.GameObjects.Container;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: MovementKeys;
  private movement = new Phaser.Math.Vector2();
  private walkTime = 0;
  private reducedMotion = false;

  constructor(private readonly onReady?: () => void) {
    super({ key: "BeachScene" });
  }

  preload(): void {
    this.load.image(MAP_TEXTURE_KEY, VENUE_MAP.image.src);
  }

  create(): void {
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.cameras.main.setBackgroundColor("#0b6f8e");

    this.createMapBackground();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    window.addEventListener("blur", this.handleWindowBlur);

    this.handleResize(this.scale.gameSize);
    this.onReady?.();
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.character) {
      return;
    }

    const step = Math.min(delta, 50) / 1000;
    this.movement.set(0, 0);

    if (this.cursors?.left.isDown || this.keys?.left.isDown) {
      this.movement.x -= 1;
    }
    if (this.cursors?.right.isDown || this.keys?.right.isDown) {
      this.movement.x += 1;
    }
    if (this.cursors?.up.isDown || this.keys?.up.isDown) {
      this.movement.y -= 1;
    }
    if (this.cursors?.down.isDown || this.keys?.down.isDown) {
      this.movement.y += 1;
    }

    if (this.movement.lengthSq() > 0) {
      this.movement.normalize();

      const bounds = VENUE_MAP.playableBounds;
      const radius = VENUE_MAP.player.radius;
      const speed = VENUE_MAP.player.speed;
      const obstacles = VENUE_MAP.obstacles;

      const nextX = Phaser.Math.Clamp(
        this.player.x + this.movement.x * speed * step,
        bounds.x + radius,
        bounds.x + bounds.width - radius,
      );

      if (
        canOccupyPosition({
          x: nextX,
          y: this.player.y,
          radius,
          bounds,
          obstacles,
        })
      ) {
        this.player.x = nextX;
      }

      const nextY = Phaser.Math.Clamp(
        this.player.y + this.movement.y * speed * step,
        bounds.y + radius,
        bounds.y + bounds.height - radius,
      );

      if (
        canOccupyPosition({
          x: this.player.x,
          y: nextY,
          radius,
          bounds,
          obstacles,
        })
      ) {
        this.player.y = nextY;
      }

      this.player.setDepth(this.player.y);
      this.walkTime += step;

      const bob = this.reducedMotion
        ? 0
        : Math.sin(this.walkTime * 14) * 2;
      this.character.setY(bob);
      this.character.setRotation(
        this.reducedMotion ? 0 : Math.sin(this.walkTime * 14) * 0.025,
      );
    } else {
      this.walkTime = 0;
      this.character.setY(0);
      this.character.setRotation(0);
    }
  }

  private createMapBackground(): void {
    if (!this.textures.exists(MAP_TEXTURE_KEY)) {
      this.drawMapFallback();
      return;
    }

    this.add
      .image(0, 0, MAP_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(VENUE_MAP.world.width, VENUE_MAP.world.height)
      .setDepth(-1000);
  }

  private drawMapFallback(): void {
    const { width, height } = VENUE_MAP.world;
    const graphics = this.add.graphics().setDepth(-1000);

    graphics.fillStyle(0x0b5874, 1);
    graphics.fillRect(0, 0, width, 390);
    graphics.fillStyle(0xf1d49a, 1);
    graphics.fillRect(0, 390, width, height - 390);

    this.add
      .text(
        width / 2,
        height / 2,
        "Venue map artwork could not be loaded.\nMovement boundaries are still active.",
        {
          fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
          fontSize: "24px",
          color: "#17343e",
          align: "center",
          backgroundColor: "rgba(255, 255, 255, 0.86)",
          padding: { left: 22, right: 22, top: 16, bottom: 16 },
        },
      )
      .setOrigin(0.5)
      .setDepth(1000);
  }

  private createPlayer(): void {
    const { x, y } = VENUE_MAP.spawn;
    const player = this.add.container(x, y).setDepth(y);
    const shadow = this.add.ellipse(0, 20, 42, 16, 0x173b35, 0.2);
    const character = this.add.container(0, 0);
    const graphics = this.add.graphics();

    graphics.fillStyle(0x2f4858, 1);
    graphics.fillRoundedRect(-12, -16, 10, 18, 4);
    graphics.fillRoundedRect(2, -16, 10, 18, 4);

    graphics.fillStyle(0xef7b5b, 1);
    graphics.fillRoundedRect(-15, -42, 30, 30, 10);
    graphics.fillStyle(0xf1b08f, 1);
    graphics.fillCircle(-17, -20, 5);
    graphics.fillCircle(17, -20, 5);

    graphics.fillStyle(0xf3c6a5, 1);
    graphics.fillCircle(0, -52, 12);
    graphics.fillStyle(0x4b342b, 1);
    graphics.fillEllipse(0, -54, 24, 8);

    graphics.fillStyle(0xf7e3b1, 1);
    graphics.fillEllipse(0, -60, 40, 11);
    graphics.fillCircle(0, -65, 11);
    graphics.fillStyle(0xe2c58b, 1);
    graphics.fillRect(-10, -61, 20, 4);

    character.add(graphics);
    player.add([shadow, character]);

    this.player = player;
    this.character = character;
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, true),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, true),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, true),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, true),
    };

    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
    ]);
  }

  private setupCamera(): void {
    if (!this.player) {
      return;
    }

    const camera = this.cameras.main;
    camera.setBounds(0, 0, VENUE_MAP.world.width, VENUE_MAP.world.height);
    camera.startFollow(this.player, true, 0.11, 0.11);

    if (!this.reducedMotion) {
      camera.fadeIn(450, 8, 50, 60);
    }
  }

  private handleResize(gameSize?: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    const preferredZoom = width < MOBILE_BREAKPOINT ? 0.9 : 1;
    const coverZoom = Math.max(
      width / VENUE_MAP.world.width,
      height / VENUE_MAP.world.height,
    );

    // Never letterbox the artwork on unusually large or short viewports.
    this.cameras.main.setZoom(Math.max(preferredZoom, coverZoom));
  }

  private handleWindowBlur = (): void => {
    this.input.keyboard?.resetKeys();
  };

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    window.removeEventListener("blur", this.handleWindowBlur);
  }
}
