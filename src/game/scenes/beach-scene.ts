import Phaser from "phaser";

import {
  AVATAR_ASSETS,
  AVATAR_DISPLAY_HEIGHT,
  AVATAR_TEXTURES,
  getAvatarFacing,
  type AvatarFacing,
} from "@/game/avatar";
import { VENUES, VENUES_BY_ID } from "@/data/venues";
import { VENUE_MAP, getVenueAccent } from "@/data/venue-map";
import type { GameEventBridge } from "@/game/event-bridge";
import type { NavigationTarget } from "@/game/events";
import {
  canOccupyPosition,
  findWalkablePointNear,
} from "@/game/systems/collision-system";
import {
  buildNavigationGrid,
  findNavigationPath,
  findReachablePointNear,
  type NavigationGrid,
} from "@/game/systems/pathfinding";
import type { MapPoint } from "@/types/map";
import type { QuestShell } from "@/types/quest";
import type { Venue } from "@/types/venue";

const MAP_TEXTURE_KEY = "genm-venue-map";
const MAP_PREVIEW_TEXTURE_KEY = "genm-venue-map-preview";
const MOBILE_BREAKPOINT = 640;
const MOBILE_PLAYER_SPEED = 180;
const MARKER_DEPTH = 5000;
const PATH_DEPTH = -500;
const PLAYER_POSITION_INTERVAL = 80;
const WAYPOINT_ARRIVAL_DISTANCE = 6;
const GRID_CELL_SIZE = 20;
const VENUE_TAP_RADIUS = 38;
const SHELL_COLLECT_RADIUS = 44;
const PROXIMITY_ALERT_TEXTURE = "icon-alert";
const TAP_TARGET_TEXTURE = "icon-target";
const PROXIMITY_ALERT_ASSET = "/images/ui/proximity-alert.webp";
const TAP_TARGET_ASSET = "/images/ui/tap-target.webp";
const PROXIMITY_ALERT_DISPLAY_SIZE = 36;
const TAP_TARGET_DISPLAY_SIZE = 56;
const PROXIMITY_ALERT_HEAD_OFFSET = AVATAR_DISPLAY_HEIGHT + 12;
const PROXIMITY_ALERT_DEPTH = MARKER_DEPTH + 30;
const TAP_TARGET_DEPTH = MARKER_DEPTH + 4;
const SHELL_COMPASS_DEPTH = MARKER_DEPTH + 40;
/**
 * Screen-space (CSS px) margins the shell compass keeps clear of: the HUD at
 * the top and the joystick/map buttons at the bottom on phones.
 */
const SHELL_COMPASS_INSET = { top: 84, side: 30, bottom: 40, bottomMobile: 150 };

type MovementKeys = Record<
  "up" | "down" | "left" | "right",
  Phaser.Input.Keyboard.Key
>;

type NavigationReason = "arrived" | "cancelled" | "unreachable";

const FALLBACK_LABEL_FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function readBrandFontFamily(): string {
  if (typeof document === "undefined") {
    return FALLBACK_LABEL_FONT;
  }

  const family = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-neoverse")
    .trim();

  return family ? `${family}, ${FALLBACK_LABEL_FONT}` : FALLBACK_LABEL_FONT;
}

/**
 * The venue-map scene.
 *
 * Phaser owns drawing, movement, camera, and collision. React owns the overlay,
 * joystick, minimap, and venue panels. Keyboard, joystick, and tap-to-move all
 * feed the same collision helper and the same movement loop.
 */
export class BeachScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Container;
  private character?: Phaser.GameObjects.Container;
  private avatar?: Phaser.GameObjects.Image;
  private avatarFacing: AvatarFacing = "down";
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: MovementKeys;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private movement = new Phaser.Math.Vector2();
  private joystickMovement = new Phaser.Math.Vector2();
  private velocity = new Phaser.Math.Vector2();
  private walkTime = 0;
  private reducedMotion = false;
  private mobileLayout = false;
  private nearbyVenueId: string | null = null;
  private readonly markerRings = new Map<string, Phaser.GameObjects.Arc>();
  private readonly venueLabels = new Map<
    string,
    {
      label: Phaser.GameObjects.Container;
      text: Phaser.GameObjects.Text;
      background: Phaser.GameObjects.Graphics;
      parts: Array<Phaser.GameObjects.Graphics | Phaser.GameObjects.Text>;
      accent: number;
      isStage: boolean;
    }
  >();
  /** Brand sans for canvas text, read from the CSS variable next/font sets. */
  private readonly labelFontFamily = readBrandFontFamily();
  /** The spawn alert waits until the player has taken a first step. */
  private hasLeftSpawn = false;
  private nearbyTween?: Phaser.Tweens.Tween;
  private proximityAlert?: Phaser.GameObjects.Image;
  private proximityAlertTween?: Phaser.Tweens.Tween;
  private proximityAlertExitTween?: Phaser.Tweens.Tween;
  private readonly proximityAlertBob = { offset: 0 };
  private readonly tapTargets = new Set<Phaser.GameObjects.Image>();
  private shellCompass?: Phaser.GameObjects.Container;
  private shellCompassPointer?: Phaser.GameObjects.Triangle;

  private readonly shellMarkers = new Map<
    string,
    Phaser.GameObjects.Container
  >();
  private readonly collectedShellIds: Set<string>;
  private readonly pendingShellIds = new Set<string>();
  private readonly blockedShellIds = new Set<string>();
  private unsubscribeShellResult?: () => void;
  private unsubscribeQuestState?: () => void;

  private navigationGrid?: NavigationGrid;
  private path: MapPoint[] = [];
  private pathIndex = 0;
  private destination: MapPoint | null = null;
  private pendingVenueId: string | null = null;
  private pathGraphics?: Phaser.GameObjects.Graphics;
  private targetMarker?: Phaser.GameObjects.Arc;
  private targetTween?: Phaser.Tweens.Tween;
  private unsubscribeMove?: () => void;
  private unsubscribeNavigate?: () => void;
  private unsubscribeCancel?: () => void;
  private lastPositionEmit = -1000;
  private readonly lastEmittedPosition = new Phaser.Math.Vector2(
    Number.NaN,
    Number.NaN,
  );
  private lastMoving = false;

  constructor(
    private readonly bridge: GameEventBridge,
    private readonly focusVenueId: string | null = null,
    private readonly shells: readonly QuestShell[] = [],
    collectedShellIds: readonly string[] = [],
  ) {
    super({ key: "BeachScene" });
    this.collectedShellIds = new Set(collectedShellIds);
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    // The light preview gets the map on screen fast; createMapBackground
    // swaps in the full artwork once it has downloaded.
    this.load.image(MAP_PREVIEW_TEXTURE_KEY, VENUE_MAP.image.previewSrc);
    this.load.image(AVATAR_TEXTURES.down, AVATAR_ASSETS.down);
    this.load.image(AVATAR_TEXTURES.up, AVATAR_ASSETS.up);
    this.load.image(AVATAR_TEXTURES.right, AVATAR_ASSETS.right);
    this.load.image(PROXIMITY_ALERT_TEXTURE, PROXIMITY_ALERT_ASSET);
    this.load.image(TAP_TARGET_TEXTURE, TAP_TARGET_ASSET);
  }

  private handleLoadProgress = (progress: number): void => {
    this.bridge.emit("game:load-progress", { progress });
  };

  create(): void {
    this.load.off(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.cameras.main.setBackgroundColor("#2c2d6f");

    this.createMapBackground();
    this.createVenueMarkers();
    this.createShells();
    this.createShellCompass();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();

    this.navigationGrid = buildNavigationGrid({
      bounds: VENUE_MAP.playableBounds,
      obstacles: VENUE_MAP.obstacles,
      radius: VENUE_MAP.player.radius,
      cellSize: GRID_CELL_SIZE,
    });
    this.pathGraphics = this.add
      .graphics()
      .setDepth(PATH_DEPTH)
      .setVisible(false);

    this.unsubscribeMove = this.bridge.on("input:move", ({ x, y }) => {
      this.joystickMovement.set(x, y);

      if (this.joystickMovement.lengthSq() > 1) {
        this.joystickMovement.normalize();
      }
    });
    this.unsubscribeNavigate = this.bridge.on(
      "navigation:goto",
      ({ target }) => {
        this.navigateTo(target);
      },
    );
    this.unsubscribeCancel = this.bridge.on("navigation:cancel", () => {
      this.cancelNavigation("cancelled");
    });
    this.unsubscribeShellResult = this.bridge.on(
      "quest:shell-result",
      this.handleShellResult,
    );
    this.unsubscribeQuestState = this.bridge.on(
      "quest:sync-state",
      ({ collectedShellIds }) => {
        for (const shellId of collectedShellIds) {
          this.removeShell(shellId);
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      this.handlePointerDown,
      this,
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    window.addEventListener("blur", this.handleWindowBlur);
    window.addEventListener("keydown", this.handleMovementKeyDown);

    this.handleResize(this.scale.gameSize);

    this.bridge.emit("game:ready", {
      worldWidth: VENUE_MAP.world.width,
      worldHeight: VENUE_MAP.world.height,
    });
    this.emitPlayerPosition(0, false, true);
    this.updateNearbyVenue();
    this.updateNearbyShell();
    this.focusRequestedVenue();
  }

  update(time: number, delta: number): void {
    if (!this.player || !this.character) {
      return;
    }

    const step = Math.min(delta, 50) / 1000;
    this.movement.set(0, 0);

    if (!this.isUiFocused()) {
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
    }

    if (this.movement.lengthSq() > 0.0001) {
      this.movement.normalize();
    }

    if (this.joystickMovement.lengthSq() > 0.0001) {
      this.movement.add(this.joystickMovement);

      // Keyboard input is normalized above; the joystick keeps its analog
      // magnitude so a small tilt walks slowly instead of snapping to full
      // speed. Clamp the combined vector to one.
      if (this.movement.lengthSq() > 1) {
        this.movement.normalize();
      }
    }

    let moving = false;

    if (this.movement.lengthSq() > 0.0001) {
      this.cancelNavigation("cancelled");
      moving = this.moveDirect(step);
    } else if (this.path.length > 0) {
      moving = this.followPath(step);
    } else {
      this.stopDirectMovement(step);
    }

    this.updateNearbyVenue();
    this.updateProximityAlert();
    this.updateNearbyShell();
    this.updateShellCompass();
    this.updateLabelOcclusion();
    this.emitPlayerPosition(time, moving);
  }

  /**
   * An arrow at the edge of the view pointing at the nearest shell still to
   * find, shown only when no shell is on screen.
   */
  private createShellCompass(): void {
    if (this.shells.length === 0) {
      return;
    }

    const disc = this.add
      .circle(0, 0, 15, 0xedf2b5, 0.95)
      .setStrokeStyle(2.5, 0x2c2d6f, 0.95);
    const spiral = this.add.graphics();

    spiral.lineStyle(1.75, 0x2c2d6f, 1);
    spiral.beginPath();
    for (let index = 0; index <= 24; index += 1) {
      const angle = (index / 24) * Math.PI * 3.2;
      const radius = 0.8 + (index / 24) * 5.5;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;

      if (index === 0) {
        spiral.moveTo(px, py);
      } else {
        spiral.lineTo(px, py);
      }
    }
    spiral.strokePath();

    // Points along +x; rotated toward the shell each frame.
    const pointer = this.add
      .triangle(22, 0, 0, -6, 0, 6, 9, 0, 0x2c2d6f, 1)
      .setOrigin(0, 0.5);

    this.shellCompassPointer = pointer;
    this.shellCompass = this.add
      .container(0, 0, [pointer, disc, spiral])
      .setDepth(SHELL_COMPASS_DEPTH)
      .setVisible(false);
  }

  private updateShellCompass(): void {
    const compass = this.shellCompass;
    const pointer = this.shellCompassPointer;

    if (!compass || !pointer || !this.player) {
      return;
    }

    let nearest: Phaser.GameObjects.Container | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const marker of this.shellMarkers.values()) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        marker.x,
        marker.y,
      );

      if (distance < nearestDistance) {
        nearest = marker;
        nearestDistance = distance;
      }
    }

    const camera = this.cameras.main;
    const view = camera.worldView;
    // World px → CSS px, so the insets stay constant on screen.
    const cssPerWorld = camera.zoom * this.scale.zoom;
    const inset = {
      top: SHELL_COMPASS_INSET.top / cssPerWorld,
      side: SHELL_COMPASS_INSET.side / cssPerWorld,
      bottom:
        (this.mobileLayout
          ? SHELL_COMPASS_INSET.bottomMobile
          : SHELL_COMPASS_INSET.bottom) / cssPerWorld,
    };
    const inner = new Phaser.Geom.Rectangle(
      view.x + inset.side,
      view.y + inset.top,
      Math.max(1, view.width - inset.side * 2),
      Math.max(1, view.height - inset.top - inset.bottom),
    );

    if (!nearest || inner.contains(nearest.x, nearest.y)) {
      compass.setVisible(false);
      return;
    }

    // Walk from the view's center toward the shell until hitting the inner
    // rectangle's edge.
    const centerX = inner.centerX;
    const centerY = inner.centerY;
    const dx = nearest.x - centerX;
    const dy = nearest.y - centerY;
    const scale = Math.min(
      dx !== 0 ? (inner.width / 2) / Math.abs(dx) : Number.POSITIVE_INFINITY,
      dy !== 0 ? (inner.height / 2) / Math.abs(dy) : Number.POSITIVE_INFINITY,
    );

    compass
      .setPosition(centerX + dx * scale, centerY + dy * scale)
      .setScale(1 / cssPerWorld)
      .setVisible(true);
    pointer.setRotation(Math.atan2(dy, dx));
    pointer.setPosition(Math.cos(pointer.rotation) * 16, Math.sin(pointer.rotation) * 16);
  }

  private createMapBackground(): void {
    const { width, height } = VENUE_MAP.world;
    const initialKey = this.textures.exists(MAP_TEXTURE_KEY)
      ? MAP_TEXTURE_KEY
      : this.textures.exists(MAP_PREVIEW_TEXTURE_KEY)
        ? MAP_PREVIEW_TEXTURE_KEY
        : null;
    let image: Phaser.GameObjects.Image | null = null;

    if (initialKey) {
      image = this.add
        .image(0, 0, initialKey)
        .setOrigin(0, 0)
        .setDisplaySize(width, height)
        .setDepth(-1000);
    } else {
      this.drawMapFallback();
    }

    if (initialKey === MAP_TEXTURE_KEY) {
      return;
    }

    // Download the full-resolution artwork in the background.
    this.load.image(MAP_TEXTURE_KEY, VENUE_MAP.image.src);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (!this.sys.isActive() && !this.sys.isPaused()) {
        return;
      }

      if (!this.textures.exists(MAP_TEXTURE_KEY)) {
        if (!image) {
          this.bridge.emit("game:map-fallback", {
            message:
              "The venue map could not be loaded. You can still walk, use the directory, and open venue details on a simplified background.",
          });
        }
        return;
      }

      if (image?.active) {
        image.setTexture(MAP_TEXTURE_KEY).setDisplaySize(width, height);
      } else {
        this.add
          .image(0, 0, MAP_TEXTURE_KEY)
          .setOrigin(0, 0)
          .setDisplaySize(width, height)
          .setDepth(-999);
      }

      if (this.textures.exists(MAP_PREVIEW_TEXTURE_KEY)) {
        this.textures.remove(MAP_PREVIEW_TEXTURE_KEY);
      }
    });
    this.load.start();
  }

  private drawMapFallback(): void {
    const { width, height } = VENUE_MAP.world;
    const graphics = this.add.graphics().setDepth(-1000);

    const oceanHeight = Math.round(height * 0.18);
    const beachHeight = Math.round(height * 0.1);
    const parkTop = oceanHeight + beachHeight;
    const roadTop = Math.round(height * 0.74);
    const roadHeight = Math.round(height * 0.065);

    graphics.fillStyle(0x0b5874, 1);
    graphics.fillRect(0, 0, width, oceanHeight);
    graphics.fillStyle(0xf1d49a, 1);
    graphics.fillRect(0, oceanHeight, width, beachHeight);
    graphics.fillStyle(0xe7d7b8, 1);
    graphics.fillRect(0, parkTop, width, roadTop - parkTop);
    graphics.fillStyle(0x3d4650, 1);
    graphics.fillRect(0, roadTop, width, roadHeight);
    graphics.fillStyle(0x3f7a3f, 1);
    graphics.fillRect(
      0,
      roadTop + roadHeight,
      width,
      height - roadTop - roadHeight,
    );

    // Keep the central plaza and entrance axis recognizable even without art.
    graphics.fillStyle(0xe7c7bd, 1);
    graphics.fillCircle(width * 0.46, height * 0.49, 42);
    graphics.lineStyle(3, 0xd7b1a5, 0.85);
    graphics.strokeCircle(width * 0.46, height * 0.49, 42);
    graphics.lineStyle(18, 0xd9c7ad, 0.7);
    graphics.lineBetween(
      width * 0.46,
      height * 0.52,
      width * 0.46,
      height * 0.73,
    );

    this.add
      .text(
        width / 2,
        height * 0.52,
        "Venue map artwork could not be loaded.\n" +
          "Movement boundaries are still active.",
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

  private createVenueMarkers(): void {
    for (const venue of VENUES) {
      if (!venue.mapPosition) {
        continue;
      }

      const { x, y } = venue.mapPosition;
      const accent = getVenueAccent(venue);
      const isStage = venue.category === "stage";
      const isFacility = venue.category === "facility";
      const markerDepth = y;
      // Stages are the destinations people came for, so they are the biggest
      // markers; facilities are small way-finding dots.
      const size = isStage ? 16 : isFacility ? 11 : 13;

      this.add
        .ellipse(x, y + size * 0.55, size * 2.1, size * 0.9, 0x1c1d3a, 0.28)
        .setDepth(markerDepth - 1);

      const ring = this.add
        .circle(x, y, size + 9)
        .setStrokeStyle(2, 0xffffff, 0.9)
        .setFillStyle(accent.fill, 0.16)
        .setDepth(markerDepth)
        .setAlpha(0.3);

      // Shape encodes the kind of place: discs for stages and facilities,
      // rounded squares for expo halls, diamonds for booths.
      const shape = this.add.graphics({ x, y }).setDepth(markerDepth + 1);
      shape.fillStyle(accent.fill, 1);
      shape.lineStyle(isStage ? 3 : 2, 0xffffff, 0.95);

      if (venue.category === "expo") {
        shape.fillRoundedRect(-size, -size, size * 2, size * 2, 6);
        shape.strokeRoundedRect(-size, -size, size * 2, size * 2, 6);
      } else if (venue.category === "booth") {
        const points = [
          new Phaser.Math.Vector2(0, -size - 2),
          new Phaser.Math.Vector2(size + 2, 0),
          new Phaser.Math.Vector2(0, size + 2),
          new Phaser.Math.Vector2(-size - 2, 0),
        ];
        shape.fillPoints(points, true);
        shape.strokePoints(points, true);
      } else {
        shape.fillCircle(0, 0, size);
        shape.strokeCircle(0, 0, size);
      }

      if (isStage) {
        // A thin navy inner ring gives stages a badge-like finish.
        shape.lineStyle(1.5, 0x2c2d6f, 0.35);
        shape.strokeCircle(0, 0, size - 4);
      }

      const code = this.add
        .text(x, y, venue.mapLabel, {
          fontFamily: this.labelFontFamily,
          fontSize: isStage ? "12px" : "10px",
          fontStyle: "bold",
          color: accent.text,
        })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(markerDepth + 2);

      // A readable name under the code letter: "R" alone means nothing to a
      // first-time visitor. Pills match the HUD's rounded navy chips.
      const label = this.add.container(x, y + size + 6).setDepth(
        markerDepth + 2,
      );
      const labelText = this.add
        .text(0, 0, venue.name, {
          fontFamily: this.labelFontFamily,
          fontSize: isStage ? "11px" : "10px",
          fontStyle: "bold",
          color: isStage ? "#edf2b5" : "#f7f3e8",
          align: "center",
          wordWrap: { width: 112 },
        })
        .setOrigin(0.5, 0)
        .setResolution(2);
      const labelBackground = this.add.graphics();
      label.add([labelBackground, labelText]);
      this.drawLabelPill(labelBackground, labelText, accent.fill, isStage);

      this.venueLabels.set(venue.id, {
        label,
        text: labelText,
        background: labelBackground,
        parts: [shape, code],
        accent: accent.fill,
        isStage,
      });
      this.markerRings.set(venue.id, ring);
    }

    this.refreshLabelFont();
  }

  private drawLabelPill(
    background: Phaser.GameObjects.Graphics,
    text: Phaser.GameObjects.Text,
    accent: number,
    isStage: boolean,
  ): void {
    const padX = 7;
    const padY = 3;
    const width = text.width + padX * 2;
    const height = text.height + padY * 2;
    const radius = Math.min(height / 2, 10);

    background.clear();
    background.fillStyle(0x1c1d3a, 0.25);
    background.fillRoundedRect(-width / 2, -padY + 2, width, height, radius);
    background.fillStyle(0x2c2d6f, 0.9);
    background.fillRoundedRect(-width / 2, -padY, width, height, radius);

    if (isStage) {
      background.lineStyle(1.5, accent, 0.9);
      background.strokeRoundedRect(-width / 2, -padY, width, height, radius);
    }
  }

  /**
   * Phaser renders text once, so labels drawn before the brand font finishes
   * loading keep the fallback. Re-render them when the font is ready.
   */
  private refreshLabelFont(): void {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    const family = this.labelFontFamily;

    void document.fonts
      .load(`bold 11px ${family}`)
      .then(() => {
        // Shutdown clears the map, so a late load after unmount is a no-op.
        for (const entry of this.venueLabels.values()) {
          for (const part of entry.parts) {
            if (part instanceof Phaser.GameObjects.Text) {
              part.setFontFamily(family);
            }
          }
          entry.text.setFontFamily(family);
          this.drawLabelPill(
            entry.background,
            entry.text,
            entry.accent,
            entry.isStage,
          );
        }
      })
      .catch(() => undefined);
  }

  /**
   * Fades any venue label or marker the avatar is standing on so the player
   * never disappears under map furniture.
   */
  private updateLabelOcclusion(): void {
    if (!this.player) {
      return;
    }

    const px = this.player.x;
    const py = this.player.y - AVATAR_DISPLAY_HEIGHT / 2;

    for (const entry of this.venueLabels.values()) {
      const halfWidth = entry.text.width / 2 + 14;
      const top = entry.label.y - 8;
      const bottom = entry.label.y + entry.text.height + 10;
      const overlapsLabel =
        Math.abs(px - entry.label.x) < halfWidth + 10 &&
        py + AVATAR_DISPLAY_HEIGHT / 2 > top &&
        py - AVATAR_DISPLAY_HEIGHT / 2 < bottom;
      const target = overlapsLabel ? 0.28 : 1;

      if (entry.label.alpha !== target) {
        entry.label.setAlpha(target);
        for (const part of entry.parts) {
          part.setAlpha(overlapsLabel ? 0.45 : 1);
        }
      }
    }
  }

  private createShells(): void {
    for (const shell of this.shells) {
      if (this.collectedShellIds.has(shell.id)) {
        continue;
      }

      const container = this.add
        .container(shell.x, shell.y)
        .setDepth(shell.y + 6);
      const shadow = this.add.ellipse(0, 13, 26, 9, 0x17343e, 0.22);
      // Lime with a dark outline reads against sand, paving, and grass, and
      // does not look like the white umbrella and proximity icons.
      const pulse = this.add
        .circle(0, 0, 16)
        .setStrokeStyle(3, 0xedf2b5, 0.9);
      const glow = this.add
        .circle(0, 0, 17, 0xedf2b5, 0.95)
        .setStrokeStyle(2.5, 0x2c2d6f, 0.9);
      const bob = this.add.container(0, 0);
      const shellGraphics = this.add.graphics();

      // A spiral shell, matching the Shell icon in the HUD. A fan-shaped
      // scallop read as a beach umbrella on this map.
      shellGraphics.fillStyle(0xffffff, 1);
      shellGraphics.lineStyle(1.75, 0x2c2d6f, 1);
      shellGraphics.fillCircle(0, 0, 11);
      shellGraphics.strokeCircle(0, 0, 11);
      shellGraphics.lineStyle(2, 0x2c2d6f, 1);
      shellGraphics.beginPath();

      for (let index = 0; index <= 40; index += 1) {
        const angle = (index / 40) * Math.PI * 3.6;
        const radius = 1 + (index / 40) * 7.5;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;

        if (index === 0) {
          shellGraphics.moveTo(px, py);
        } else {
          shellGraphics.lineTo(px, py);
        }
      }

      shellGraphics.strokePath();

      bob.add([glow, shellGraphics]);
      container.add([shadow, pulse, bob]);
      this.shellMarkers.set(shell.id, container);

      if (!this.reducedMotion) {
        const delay = Math.random() * 900;

        // A sonar ring makes shells findable at a glance from a distance.
        this.tweens.add({
          targets: pulse,
          scale: { from: 1, to: 2.4 },
          alpha: { from: 0.9, to: 0 },
          duration: 1600,
          delay,
          repeat: -1,
          ease: "Cubic.easeOut",
        });
        this.tweens.add({
          targets: bob,
          y: { from: 0, to: -4 },
          duration: 900,
          delay,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else {
        pulse.setScale(1.5).setAlpha(0.6);
      }
    }
  }

  /**
   * Shells are collected by walking close, so the interact key stays reserved
   * for venues. React decides whether a find counts and answers with
   * `quest:shell-result`.
   */
  private updateNearbyShell(): void {
    if (!this.player || this.shellMarkers.size === 0) {
      return;
    }

    for (const [shellId, marker] of this.shellMarkers) {
      if (
        this.pendingShellIds.has(shellId) ||
        this.collectedShellIds.has(shellId)
      ) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        marker.x,
        marker.y,
      );

      if (distance <= SHELL_COLLECT_RADIUS) {
        if (this.blockedShellIds.has(shellId)) {
          continue;
        }

        this.pendingShellIds.add(shellId);
        this.bridge.emit("quest:shell-found", { shellId });
      } else if (
        this.blockedShellIds.has(shellId) &&
        distance > SHELL_COLLECT_RADIUS + 12
      ) {
        this.blockedShellIds.delete(shellId);
      }
    }
  }

  private handleShellResult = ({
    shellId,
    accepted,
    points = 10,
    bonusPoints = 0,
  }: {
    shellId: string;
    accepted: boolean;
    points?: number;
    bonusPoints?: number;
  }): void => {
    this.pendingShellIds.delete(shellId);

    if (accepted) {
      const marker = this.shellMarkers.get(shellId);

      if (marker) {
        this.showShellCollectionFeedback(
          marker.x,
          marker.y,
          points,
          bonusPoints,
        );
      }

      this.removeShell(shellId);
      return;
    }

    // Stay put instead of re-emitting every frame; unblock once the player
    // steps away from the shell.
    this.blockedShellIds.add(shellId);
  };

  private showShellCollectionFeedback(
    x: number,
    y: number,
    points: number,
    bonusPoints: number,
  ): void {
    const total = points + bonusPoints;
    const label = this.add
      .text(x, y - 18, `+${total}`, {
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: "16px",
        fontStyle: "bold",
        color: "#edf2b5",
        stroke: "#2c2d6f",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(MARKER_DEPTH + 20);

    if (!this.reducedMotion) {
      const ring = this.add
        .circle(x, y, 10)
        .setStrokeStyle(2, 0xedf2b5, 0.9)
        .setDepth(MARKER_DEPTH + 19);

      this.tweens.add({
        targets: ring,
        scale: 3,
        alpha: 0,
        duration: 520,
        ease: "Cubic.easeOut",
        onComplete: () => ring.destroy(),
      });

      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + Math.random() * 0.35;
        const distance = 26 + Math.random() * 18;
        const spark = this.add
          .circle(x, y, 2.5, index % 2 === 0 ? 0xedf2b5 : 0xf7f3e8, 0.95)
          .setDepth(MARKER_DEPTH + 21);

        this.tweens.add({
          targets: spark,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance,
          alpha: 0,
          scale: 0.2,
          duration: 520 + Math.random() * 180,
          ease: "Cubic.easeOut",
          onComplete: () => spark.destroy(),
        });
      }
    }

    this.tweens.add({
      targets: label,
      y: y - 58,
      alpha: 0,
      duration: 950,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private removeShell(shellId: string): void {
    const marker = this.shellMarkers.get(shellId);

    this.pendingShellIds.delete(shellId);
    this.blockedShellIds.delete(shellId);
    this.collectedShellIds.add(shellId);

    if (!marker) {
      return;
    }

    this.shellMarkers.delete(shellId);
    this.tweens.killTweensOf(marker);
    for (const child of marker.list) {
      this.tweens.killTweensOf(child);
    }
    marker.destroy(true);
  }

  private updateNearbyVenue(): void {
    if (!this.player) {
      return;
    }

    let nearestVenueId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const venue of VENUES) {
      if (!venue.mapPosition) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        venue.mapPosition.x,
        venue.mapPosition.y,
      );

      if (
        distance <= venue.mapPosition.interactionRadius &&
        distance < nearestDistance
      ) {
        nearestVenueId = venue.id;
        nearestDistance = distance;
      }
    }

    // The player spawns inside the Entrance radius; a "!" over them before
    // they have moved is noise, so the alert waits for the first step.
    const leftSpawnNow =
      !this.hasLeftSpawn &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        VENUE_MAP.spawn.x,
        VENUE_MAP.spawn.y,
      ) > 6;

    if (leftSpawnNow) {
      this.hasLeftSpawn = true;
    }

    if (nearestVenueId === this.nearbyVenueId && !leftSpawnNow) {
      return;
    }

    if (nearestVenueId !== this.nearbyVenueId) {
      this.nearbyVenueId = nearestVenueId;
      this.updateMarkerHighlights();
      this.bridge.emit("venue:nearby", { venueId: nearestVenueId });
    }

    if (nearestVenueId && this.hasLeftSpawn) {
      this.showProximityAlert(this.player);
    } else {
      this.removeProximityAlert();
    }
  }

  private updateMarkerHighlights(): void {
    this.nearbyTween?.stop();
    this.nearbyTween = undefined;

    for (const [venueId, ring] of this.markerRings) {
      ring.setAlpha(venueId === this.nearbyVenueId ? 1 : 0.3);
      ring.setScale(1);
    }

    const nearbyRing = this.nearbyVenueId
      ? this.markerRings.get(this.nearbyVenueId)
      : undefined;

    if (!nearbyRing) {
      return;
    }

    if (this.reducedMotion) {
      nearbyRing.setScale(1.35);
      return;
    }

    this.nearbyTween = this.tweens.add({
      targets: nearbyRing,
      scale: { from: 1.05, to: 1.4 },
      alpha: { from: 1, to: 0.55 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private showProximityAlert(
    player: Phaser.GameObjects.Container,
  ): void {
    if (!this.textures.exists(PROXIMITY_ALERT_TEXTURE)) {
      return;
    }

    this.destroyProximityAlert();
    this.proximityAlertBob.offset = 0;

    const alert = this.add
      .image(
        player.x,
        player.y - PROXIMITY_ALERT_HEAD_OFFSET,
        PROXIMITY_ALERT_TEXTURE,
      )
      .setOrigin(0.5, 1)
      .setDepth(PROXIMITY_ALERT_DEPTH)
      .setScale(
        this.getTextureScale(
          PROXIMITY_ALERT_TEXTURE,
          PROXIMITY_ALERT_DISPLAY_SIZE,
        ),
      );

    this.proximityAlert = alert;

    if (this.reducedMotion) {
      return;
    }

    this.proximityAlertTween = this.tweens.add({
      targets: this.proximityAlertBob,
      offset: 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private removeProximityAlert(): void {
    const alert = this.proximityAlert;

    if (!alert || this.proximityAlertExitTween) {
      return;
    }

    this.proximityAlertTween?.stop();
    this.proximityAlertTween = undefined;
    this.proximityAlertBob.offset = 0;

    if (this.reducedMotion) {
      this.destroyProximityAlert();
      return;
    }

    const exitScale = alert.scaleX * 0.35;

    this.proximityAlertExitTween = this.tweens.add({
      targets: alert,
      scaleX: exitScale,
      scaleY: exitScale,
      alpha: 0,
      duration: 180,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.proximityAlertExitTween = undefined;

        if (this.proximityAlert === alert) {
          this.proximityAlert = undefined;
        }

        alert.destroy();
      },
    });
  }

  private destroyProximityAlert(): void {
    this.proximityAlertTween?.stop();
    this.proximityAlertTween = undefined;
    this.proximityAlertExitTween?.stop();
    this.proximityAlertExitTween = undefined;
    this.proximityAlert?.destroy();
    this.proximityAlert = undefined;
    this.proximityAlertBob.offset = 0;
  }

  /**
   * The alert tracks the player's head on both axes. The vertical bob is kept
   * in a separate offset object so following the player does not fight the
   * looping tween.
   */
  private updateProximityAlert(): void {
    if (!this.player || !this.proximityAlert) {
      return;
    }

    this.proximityAlert.x = this.player.x;
    this.proximityAlert.y =
      this.player.y -
      PROXIMITY_ALERT_HEAD_OFFSET -
      this.proximityAlertBob.offset;
  }

  private spawnTapTarget(x: number, y: number): void {
    if (!this.textures.exists(TAP_TARGET_TEXTURE)) {
      return;
    }

    const baseScale = this.getTextureScale(
      TAP_TARGET_TEXTURE,
      TAP_TARGET_DISPLAY_SIZE,
    );
    const target = this.add
      .image(x, y, TAP_TARGET_TEXTURE)
      .setOrigin(0.5)
      .setDepth(TAP_TARGET_DEPTH)
      .setScale(baseScale);

    this.tapTargets.add(target);

    if (this.reducedMotion) {
      this.tweens.add({
        targets: target,
        alpha: 0,
        duration: 400,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.tapTargets.delete(target);
          target.destroy();
        },
      });
      return;
    }

    this.tweens.add({
      targets: target,
      scaleX: baseScale * 1.8,
      scaleY: baseScale * 1.8,
      alpha: 0,
      duration: 400,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.tapTargets.delete(target);
        target.destroy();
      },
    });
  }

  private destroyTapTargets(): void {
    for (const target of this.tapTargets) {
      this.tweens.killTweensOf(target);
      target.destroy();
    }

    this.tapTargets.clear();
  }

  private getTextureScale(textureKey: string, displaySize: number): number {
    const source = this.textures
      .get(textureKey)
      .getSourceImage() as { width: number; height: number };

    return displaySize / Math.max(source.width, source.height, 1);
  }

  /**
   * Walks the player to a deep-linked venue along the drawn route; the venue
   * panel opens on arrival (see finishNavigation). The player is never
   * teleported: venue stamps must be earned by walking, and the walk also
   * shows where the venue is. Venues without a map position, or that cannot
   * be reached, open their panel straight away.
   */
  private focusRequestedVenue(): void {
    if (!this.focusVenueId || !this.player) {
      return;
    }

    const venue = VENUES_BY_ID.get(this.focusVenueId);

    if (!venue) {
      return;
    }

    if (venue.mapPosition) {
      this.navigateTo({ kind: "venue", venueId: venue.id });

      // navigateTo already opened the panel if the player is standing there.
      if (
        this.pendingVenueId === venue.id ||
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          venue.mapPosition.x,
          venue.mapPosition.y,
        ) <= venue.mapPosition.interactionRadius
      ) {
        return;
      }
    }

    this.bridge.emit("venue:interact", { venueId: venue.id });
  }

  private handleInteractKey = (): void => {
    if (this.isUiFocused()) {
      return;
    }

    if (this.nearbyVenueId) {
      this.cancelNavigation("cancelled");
      this.bridge.emit("venue:interact", { venueId: this.nearbyVenueId });
    }
  };

  private handleCancelKey = (): void => {
    if (this.isUiFocused()) {
      return;
    }

    this.cancelNavigation("cancelled");
  };

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.player || !this.navigationGrid) {
      return;
    }

    if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
      return;
    }

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    if (!this.isInsidePlayableBounds(world.x, world.y)) {
      return;
    }

    let nearestVenue: Venue | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const venue of VENUES) {
      if (!venue.mapPosition) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        world.x,
        world.y,
        venue.mapPosition.x,
        venue.mapPosition.y,
      );
      const hitRadius = Math.max(
        VENUE_TAP_RADIUS,
        venue.mapPosition.interactionRadius * 0.28,
      );

      if (distance <= hitRadius && distance < nearestDistance) {
        nearestVenue = venue;
        nearestDistance = distance;
      }
    }

    if (nearestVenue) {
      this.navigateTo({ kind: "venue", venueId: nearestVenue.id });
      return;
    }

    this.navigateTo({ kind: "point", x: world.x, y: world.y });
  };

  private navigateTo(target: NavigationTarget): void {
    if (!this.player || !this.navigationGrid) {
      return;
    }

    if (target.kind === "venue") {
      const venue = VENUES_BY_ID.get(target.venueId);

      if (!venue?.mapPosition) {
        this.rejectNavigation();
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        venue.mapPosition.x,
        venue.mapPosition.y,
      );

      if (distance <= venue.mapPosition.interactionRadius) {
        this.cancelNavigation("cancelled");
        this.bridge.emit("venue:interact", { venueId: venue.id });
        return;
      }

      const goal = findReachablePointNear({
        grid: this.navigationGrid,
        start: { x: this.player.x, y: this.player.y },
        x: venue.mapPosition.x,
        y: venue.mapPosition.y,
        radius: VENUE_MAP.player.radius,
        bounds: VENUE_MAP.playableBounds,
        obstacles: VENUE_MAP.obstacles,
        maxDistance: venue.mapPosition.interactionRadius,
      });

      if (!goal) {
        this.rejectNavigation();
        return;
      }

      this.startNavigation(goal, venue.id);
      return;
    }

    if (!this.isInsidePlayableBounds(target.x, target.y)) {
      this.rejectNavigation();
      return;
    }

    const goal = findWalkablePointNear({
      x: target.x,
      y: target.y,
      radius: VENUE_MAP.player.radius,
      bounds: VENUE_MAP.playableBounds,
      obstacles: VENUE_MAP.obstacles,
      maxDistance: 220,
    });

    if (!goal) {
      this.rejectNavigation();
      return;
    }

    this.startNavigation(goal, null);
  }

  private startNavigation(goal: MapPoint, venueId: string | null): void {
    if (!this.player || !this.navigationGrid) {
      return;
    }

    const path = findNavigationPath({
      grid: this.navigationGrid,
      start: { x: this.player.x, y: this.player.y },
      goal,
    });

    if (!path || path.length === 0) {
      this.rejectNavigation();
      return;
    }

    if (path.length === 1) {
      this.cancelNavigation("cancelled");

      if (venueId) {
        this.bridge.emit("venue:interact", { venueId });
      }

      return;
    }

    this.cancelNavigation("cancelled");
    this.spawnTapTarget(goal.x, goal.y);
    this.velocity.set(0, 0);
    this.path = path;
    this.pathIndex = 1;
    this.destination = goal;
    this.pendingVenueId = venueId;
    this.drawNavigationPath(path);
    this.showTargetMarker(goal);
    this.bridge.emit("navigation:state", {
      active: true,
      targetX: goal.x,
      targetY: goal.y,
      venueId,
    });
  }

  private rejectNavigation(): void {
    this.cancelNavigation("cancelled");
    this.bridge.emit("navigation:state", {
      active: false,
      targetX: null,
      targetY: null,
      venueId: null,
      reason: "unreachable",
    });
  }

  private followPath(step: number): boolean {
    if (!this.player) {
      return false;
    }

    const waypoint = this.path[this.pathIndex];

    if (!waypoint) {
      this.finishNavigation();
      return false;
    }

    const dx = waypoint.x - this.player.x;
    const dy = waypoint.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    const maxStep = this.getPlayerSpeed() * step;
    const arrivalDistance = Math.max(WAYPOINT_ARRIVAL_DISTANCE, maxStep);

    if (distance <= arrivalDistance) {
      if (
        canOccupyPosition({
          x: waypoint.x,
          y: waypoint.y,
          radius: VENUE_MAP.player.radius,
          bounds: VENUE_MAP.playableBounds,
          obstacles: VENUE_MAP.obstacles,
        })
      ) {
        this.updateAvatarFacing(dx, dy);
        this.player.setPosition(waypoint.x, waypoint.y);
        this.player.setDepth(waypoint.y);
      }

      this.pathIndex += 1;

      if (this.pathIndex >= this.path.length) {
        this.finishNavigation();
        return false;
      }

      this.animateWalk(step);
      return true;
    }

    const moved = this.moveBy(
      (dx / distance) * maxStep,
      (dy / distance) * maxStep,
      step,
    );

    if (!moved) {
      this.cancelNavigation("unreachable");
      return false;
    }

    return true;
  }

  private moveDirect(step: number): boolean {
    if (!this.player) {
      return false;
    }

    const speed = this.getPlayerSpeed();
    const targetX = this.movement.x * speed;
    const targetY = this.movement.y * speed;
    const response = 1 - Math.exp(-18 * step);

    this.velocity.x = Phaser.Math.Linear(this.velocity.x, targetX, response);
    this.velocity.y = Phaser.Math.Linear(this.velocity.y, targetY, response);

    if (this.velocity.lengthSq() < 4) {
      this.velocity.set(0, 0);
      this.stopWalkAnimation();
      return false;
    }

    const moved = this.moveBy(
      this.velocity.x * step,
      this.velocity.y * step,
      step,
    );

    if (!moved) {
      this.velocity.set(0, 0);
      this.stopWalkAnimation();
    }

    return moved;
  }

  /** Glides to a stop after the joystick or keyboard is released. */
  private stopDirectMovement(step: number): void {
    if (!this.player || this.velocity.lengthSq() < 4) {
      this.velocity.set(0, 0);
      this.stopWalkAnimation();
      return;
    }

    const response = 1 - Math.exp(-24 * step);

    this.velocity.x = Phaser.Math.Linear(this.velocity.x, 0, response);
    this.velocity.y = Phaser.Math.Linear(this.velocity.y, 0, response);

    if (this.velocity.lengthSq() < 4) {
      this.velocity.set(0, 0);
      this.stopWalkAnimation();
      return;
    }

    const moved = this.moveBy(
      this.velocity.x * step,
      this.velocity.y * step,
      step,
    );

    if (!moved) {
      this.velocity.set(0, 0);
      this.stopWalkAnimation();
    }
  }

  /**
   * Shared collision-aware movement used by keyboard, joystick, and path
   * following. The axes are resolved separately so the player slides along
   * obstacles instead of stopping dead.
   */
  private moveBy(dx: number, dy: number, step: number): boolean {
    if (!this.player) {
      return false;
    }

    const bounds = VENUE_MAP.playableBounds;
    const radius = VENUE_MAP.player.radius;
    const obstacles = VENUE_MAP.obstacles;
    const startX = this.player.x;
    const startY = this.player.y;
    let moved = false;

    const nextX = Phaser.Math.Clamp(
      this.player.x + dx,
      bounds.x + radius,
      bounds.x + bounds.width - radius,
    );

    if (
      nextX !== this.player.x &&
      canOccupyPosition({
        x: nextX,
        y: this.player.y,
        radius,
        bounds,
        obstacles,
      })
    ) {
      this.player.x = nextX;
      moved = true;
    }

    const nextY = Phaser.Math.Clamp(
      this.player.y + dy,
      bounds.y + radius,
      bounds.y + bounds.height - radius,
    );

    if (
      nextY !== this.player.y &&
      canOccupyPosition({
        x: this.player.x,
        y: nextY,
        radius,
        bounds,
        obstacles,
      })
    ) {
      this.player.y = nextY;
      moved = true;
    }

    if (moved) {
      this.player.setDepth(this.player.y);
      this.updateAvatarFacing(
        this.player.x - startX,
        this.player.y - startY,
      );
      this.animateWalk(step);
    }

    return moved;
  }

  private finishNavigation(): void {
    const venueId = this.pendingVenueId;

    this.clearNavigationState();
    this.bridge.emit("navigation:state", {
      active: false,
      targetX: null,
      targetY: null,
      venueId: null,
      reason: "arrived",
    });

    if (venueId) {
      this.bridge.emit("venue:interact", { venueId });
    }
  }

  private cancelNavigation(
    reason: Exclude<NavigationReason, "arrived">,
  ): void {
    if (!this.destination && this.path.length === 0 && !this.pendingVenueId) {
      return;
    }

    this.clearNavigationState();
    this.bridge.emit("navigation:state", {
      active: false,
      targetX: null,
      targetY: null,
      venueId: null,
      reason,
    });
  }

  private clearNavigationState(): void {
    this.path = [];
    this.pathIndex = 0;
    this.destination = null;
    this.pendingVenueId = null;

    this.pathGraphics?.clear();
    this.pathGraphics?.setVisible(false);

    this.targetTween?.stop();
    this.targetTween = undefined;
    this.targetMarker?.destroy();
    this.targetMarker = undefined;

    this.stopWalkAnimation();
  }

  private drawNavigationPath(points: MapPoint[]): void {
    if (!this.pathGraphics) {
      return;
    }

    const graphics = this.pathGraphics;

    const stroke = (width: number, color: number, alpha: number) => {
      graphics.lineStyle(width, color, alpha);
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);

      for (let index = 1; index < points.length; index += 1) {
        graphics.lineTo(points[index].x, points[index].y);
      }

      graphics.strokePath();
    };

    graphics.clear();
    stroke(8, 0x2c2d6f, 0.18);
    stroke(3, 0xedf2b5, 0.7);
    graphics.setVisible(true);
  }

  private showTargetMarker(goal: MapPoint): void {
    this.targetTween?.stop();
    this.targetMarker?.destroy();

    const marker = this.add
      .circle(goal.x, goal.y, 16)
      .setStrokeStyle(3, 0xedf2b5, 0.95)
      .setFillStyle(0xedf2b5, 0.12)
      .setDepth(MARKER_DEPTH + 2);

    this.targetMarker = marker;

    if (!this.reducedMotion) {
      this.targetTween = this.tweens.add({
        targets: marker,
        scale: { from: 0.85, to: 1.2 },
        alpha: { from: 1, to: 0.45 },
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private animateWalk(step: number): void {
    if (!this.character) {
      return;
    }

    this.walkTime += step;

    const bob = this.reducedMotion ? 0 : Math.sin(this.walkTime * 14) * 2;
    this.character.setY(bob);
    this.character.setRotation(
      this.reducedMotion ? 0 : Math.sin(this.walkTime * 14) * 0.025,
    );
  }

  private stopWalkAnimation(): void {
    this.walkTime = 0;
    this.character?.setY(0);
    this.character?.setRotation(0);
  }

  private emitPlayerPosition(
    time: number,
    moving: boolean,
    force = false,
  ): void {
    if (!this.player) {
      return;
    }

    if (!force) {
      if (
        time - this.lastPositionEmit < PLAYER_POSITION_INTERVAL &&
        moving === this.lastMoving
      ) {
        return;
      }

      if (
        Math.abs(this.player.x - this.lastEmittedPosition.x) < 0.5 &&
        Math.abs(this.player.y - this.lastEmittedPosition.y) < 0.5 &&
        moving === this.lastMoving
      ) {
        return;
      }
    }

    this.lastPositionEmit = time;
    this.lastEmittedPosition.set(this.player.x, this.player.y);
    this.lastMoving = moving;
    this.bridge.emit("player:position", {
      x: this.player.x,
      y: this.player.y,
      moving,
    });
  }

  private isInsidePlayableBounds(x: number, y: number): boolean {
    const bounds = VENUE_MAP.playableBounds;

    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Keyboard events are global in Phaser, so ignore interaction/movement keys
   * while a real UI control or dialog owns focus. The game host itself is not
   * treated as UI, so normal keyboard play still works.
   */
  private isUiFocused(): boolean {
    if (typeof document === "undefined") {
      return false;
    }

    const active = document.activeElement;

    if (!active || active === document.body) {
      return false;
    }

    if (
      active === this.game.canvas ||
      active === this.game.canvas.parentElement
    ) {
      return false;
    }

    return (
      active instanceof HTMLElement &&
      (active.closest("[role='dialog']") !== null ||
        active.matches(
          "a, button, input, select, textarea, summary, [role='button']",
        ))
    );
  }

  private createPlayer(): void {
    const { x, y } = VENUE_MAP.spawn;
    const player = this.add.container(x, y).setDepth(y);
    const halo = this.add
      .circle(0, 0, 26)
      .setStrokeStyle(2, 0xedf2b5, 0.7)
      .setFillStyle(0xedf2b5, 0.08);
    const shadow = this.add.ellipse(0, 20, 42, 16, 0x173b35, 0.2);
    const character = this.add.container(0, 0);
    const hasAvatarTextures = Object.values(AVATAR_TEXTURES).every((key) =>
      this.textures.exists(key),
    );

    if (hasAvatarTextures) {
      const avatar = this.add
        .image(0, 0, AVATAR_TEXTURES.down)
        .setOrigin(0.5, 1);
      this.avatar = avatar;
      this.avatarFacing = "down";
      this.applyAvatarFacing("down", true);
      character.add(avatar);
    } else {
      character.add(this.createFallbackAvatar());
    }

    player.add([halo, shadow, character]);

    this.player = player;
    this.character = character;
  }

  private applyAvatarFacing(facing: AvatarFacing, force = false): void {
    if (!this.avatar || (!force && facing === this.avatarFacing)) {
      return;
    }

    this.avatarFacing = facing;
    const textureKey =
      facing === "left" ? AVATAR_TEXTURES.right : AVATAR_TEXTURES[facing];
    const source = this.textures
      .get(textureKey)
      .getSourceImage() as { height: number };

    this.avatar.setTexture(textureKey);
    this.avatar.setOrigin(0.5, 1);
    this.avatar.setFlipX(facing === "left");
    this.avatar.setScale(AVATAR_DISPLAY_HEIGHT / source.height);
  }

  private updateAvatarFacing(dx: number, dy: number): void {
    const facing = getAvatarFacing(dx, dy);

    if (facing) {
      this.applyAvatarFacing(facing);
    }
  }

  private createFallbackAvatar(): Phaser.GameObjects.Graphics {
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

    return graphics;
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    // Capture is deliberately disabled for movement keys. Otherwise Phaser
    // calls preventDefault globally and the join dialog cannot receive WASD
    // or arrow-key input.
    this.cursors = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false),
      shift: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, false),
    };
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };
    this.interactKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
      false,
    );
    this.enterKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      false,
    );
    this.escapeKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
      false,
    );
    this.interactKey.on(
      Phaser.Input.Keyboard.Events.DOWN,
      this.handleInteractKey,
    );
    this.enterKey.on(
      Phaser.Input.Keyboard.Events.DOWN,
      this.handleInteractKey,
    );
    this.escapeKey.on(
      Phaser.Input.Keyboard.Events.DOWN,
      this.handleCancelKey,
    );

  }

  /**
   * Phaser's keyboard capture list would swallow WASD and arrow keys even
   * while the join dialog input owns focus. Only prevent the browser default
   * for movement keys during actual play, so the page cannot scroll under the
   * game.
   */
  private handleMovementKeyDown = (event: KeyboardEvent): void => {
    if (this.isUiFocused()) {
      return;
    }

    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === " " ||
      event.code === "Space"
    ) {
      event.preventDefault();
    }
  };

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

  private getPlayerSpeed(): number {
    return this.mobileLayout ? MOBILE_PLAYER_SPEED : VENUE_MAP.player.speed;
  }

  private handleResize(gameSize?: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    // The canvas is sized in device pixels; scale.zoom converts it back to
    // layout pixels for the mobile breakpoint and cover calculation.
    const layoutWidth = width * this.scale.zoom;
    const layoutHeight = height * this.scale.zoom;
    this.mobileLayout = layoutWidth < MOBILE_BREAKPOINT;
    const preferredZoom = this.mobileLayout ? 0.9 : 1;
    const coverZoom = Math.max(
      layoutWidth / VENUE_MAP.world.width,
      layoutHeight / VENUE_MAP.world.height,
    );

    // Never letterbox the artwork on unusually large or short viewports.
    this.cameras.main.setZoom(
      Math.max(preferredZoom, coverZoom) / this.scale.zoom,
    );
  }

  private handleWindowBlur = (): void => {
    this.input.keyboard?.resetKeys();
    this.joystickMovement.set(0, 0);
  };

  private handleShutdown(): void {
    this.load.off(Phaser.Loader.Events.PROGRESS, this.handleLoadProgress);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("keydown", this.handleMovementKeyDown);
    this.interactKey?.off(
      Phaser.Input.Keyboard.Events.DOWN,
      this.handleInteractKey,
    );
    this.enterKey?.off(
      Phaser.Input.Keyboard.Events.DOWN,
      this.handleInteractKey,
    );
    this.escapeKey?.off(
      Phaser.Input.Keyboard.Events.DOWN,
      this.handleCancelKey,
    );
    this.input.off(
      Phaser.Input.Events.POINTER_DOWN,
      this.handlePointerDown,
      this,
    );
    this.unsubscribeMove?.();
    this.unsubscribeNavigate?.();
    this.unsubscribeCancel?.();
    this.unsubscribeShellResult?.();
    this.unsubscribeShellResult = undefined;
    this.unsubscribeQuestState?.();
    this.unsubscribeQuestState = undefined;
    this.clearNavigationState();
    this.destroyProximityAlert();
    this.destroyTapTargets();
    this.shellCompass = undefined;
    this.shellCompassPointer = undefined;
    this.nearbyTween?.stop();
    this.nearbyTween = undefined;
    this.markerRings.clear();
    this.venueLabels.clear();
    this.shellMarkers.clear();
    this.pendingShellIds.clear();
    this.blockedShellIds.clear();
    this.nearbyVenueId = null;
    this.navigationGrid = undefined;
    this.pathGraphics = undefined;
  }
}
