import Phaser from "phaser";

import { VENUES, VENUES_BY_ID } from "@/data/venues";
import {
  VENUE_MAP,
  VENUE_MARKER_COLORS,
  VENUE_MARKER_TEXT_COLORS,
} from "@/data/venue-map";
import type { GameEventBridge } from "@/game/event-bridge";
import type { NavigationTarget } from "@/game/events";
import {
  canOccupyPosition,
  findWalkablePointNear,
} from "@/game/systems/collision-system";
import {
  buildNavigationGrid,
  findNavigationPath,
  type NavigationGrid,
} from "@/game/systems/pathfinding";
import type { MapPoint } from "@/types/map";
import type { QuestShell } from "@/types/quest";
import type { Venue } from "@/types/venue";

const MAP_TEXTURE_KEY = "genm-venue-map";
const MOBILE_BREAKPOINT = 640;
const MARKER_DEPTH = 5000;
const PATH_DEPTH = -500;
const PLAYER_POSITION_INTERVAL = 80;
const WAYPOINT_ARRIVAL_DISTANCE = 6;
const GRID_CELL_SIZE = 20;
const VENUE_TAP_RADIUS = 38;
const SHELL_COLLECT_RADIUS = 44;

type MovementKeys = Record<
  "up" | "down" | "left" | "right",
  Phaser.Input.Keyboard.Key
>;

type NavigationReason = "arrived" | "cancelled" | "unreachable";

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
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: MovementKeys;
  private interactKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private movement = new Phaser.Math.Vector2();
  private joystickMovement = new Phaser.Math.Vector2();
  private walkTime = 0;
  private reducedMotion = false;
  private nearbyVenueId: string | null = null;
  private readonly markerRings = new Map<string, Phaser.GameObjects.Arc>();
  private nearbyTween?: Phaser.Tweens.Tween;

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
    this.load.image(MAP_TEXTURE_KEY, VENUE_MAP.image.src);
  }

  create(): void {
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.cameras.main.setBackgroundColor("#2c2d6f");

    this.createMapBackground();
    this.createVenueMarkers();
    this.createShells();
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

    if (this.joystickMovement.lengthSq() > 0.0001) {
      this.movement.add(this.joystickMovement);
    }

    let moving = false;

    if (this.movement.lengthSq() > 0.0001) {
      this.movement.normalize();
      this.cancelNavigation("cancelled");
      moving = this.moveDirect(step);
    } else if (this.path.length > 0) {
      moving = this.followPath(step);
    } else {
      this.stopWalkAnimation();
    }

    this.updateNearbyVenue();
    this.updateNearbyShell();
    this.emitPlayerPosition(time, moving);
  }

  private createMapBackground(): void {
    if (!this.textures.exists(MAP_TEXTURE_KEY)) {
      this.drawMapFallback();
      this.bridge.emit("game:map-fallback", {
        message:
          "The illustrated map could not be loaded. You can still walk, use the directory, and open venue details on a simplified background.",
      });
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

  private createVenueMarkers(): void {
    for (const venue of VENUES) {
      if (!venue.mapPosition) {
        continue;
      }

      const { x, y } = venue.mapPosition;
      const color = VENUE_MARKER_COLORS[venue.category];

      this.add
        .circle(x, y + 2, 15, 0x1c1d3a, 0.22)
        .setDepth(MARKER_DEPTH - 1);

      const ring = this.add
        .circle(x, y, 22)
        .setStrokeStyle(2, 0xffffff, 0.9)
        .setFillStyle(color, 0.16)
        .setDepth(MARKER_DEPTH)
        .setAlpha(0.3);

      this.add
        .circle(x, y, 13)
        .setStrokeStyle(2, 0xffffff, 0.95)
        .setFillStyle(color, 1)
        .setDepth(MARKER_DEPTH + 1);

      this.add
        .text(x, y, venue.mapLabel, {
          fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
          fontSize: "11px",
          fontStyle: "bold",
          color: VENUE_MARKER_TEXT_COLORS[venue.category],
        })
        .setOrigin(0.5)
        .setDepth(MARKER_DEPTH + 2);

      this.markerRings.set(venue.id, ring);
    }
  }

  private createShells(): void {
    for (const shell of this.shells) {
      if (this.collectedShellIds.has(shell.id)) {
        continue;
      }

      const container = this.add
        .container(shell.x, shell.y)
        .setDepth(shell.y + 4);
      const shadow = this.add.ellipse(0, 10, 24, 9, 0x17343e, 0.16);
      const glow = this.add
        .circle(0, 0, 19, 0xedf2b5, 0.14)
        .setStrokeStyle(2, 0xf7f3e8, 0.55);
      const shellGraphics = this.add.graphics();

      shellGraphics.fillStyle(0xf7f3e8, 1);
      shellGraphics.lineStyle(1.5, 0xb8865b, 0.95);
      shellGraphics.beginPath();
      shellGraphics.arc(0, 0, 10, Math.PI * 1.1, Math.PI * 1.9, false);
      shellGraphics.closePath();
      shellGraphics.fillPath();
      shellGraphics.strokePath();

      for (let index = 0; index < 4; index += 1) {
        const angle = Math.PI * 1.18 + (index / 3) * Math.PI * 0.64;

        shellGraphics.beginPath();
        shellGraphics.moveTo(0, 3);
        shellGraphics.lineTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
        shellGraphics.strokePath();
      }

      shellGraphics.fillStyle(0xc98b6b, 1);
      shellGraphics.fillCircle(0, 4, 2.5);

      container.add([shadow, glow, shellGraphics]);
      this.shellMarkers.set(shell.id, container);

      if (!this.reducedMotion) {
        this.tweens.add({
          targets: container,
          scale: { from: 0.94, to: 1.06 },
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
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
  }: {
    shellId: string;
    accepted: boolean;
  }): void => {
    this.pendingShellIds.delete(shellId);

    if (accepted) {
      this.removeShell(shellId);
      return;
    }

    // Stay put instead of re-emitting every frame; unblock once the player
    // steps away from the shell.
    this.blockedShellIds.add(shellId);
  };

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

    if (nearestVenueId === this.nearbyVenueId) {
      return;
    }

    this.nearbyVenueId = nearestVenueId;
    this.updateMarkerHighlights();
    this.bridge.emit("venue:nearby", { venueId: nearestVenueId });
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

  /**
   * Moves the player to the nearest walkable point beside a deep-linked venue,
   * centers the camera, and opens the venue panel. Venue anchors can sit on
   * stage artwork, so the search avoids hardcoding a spawn point per venue.
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
      const point = findWalkablePointNear({
        x: venue.mapPosition.x,
        y: venue.mapPosition.y,
        radius: VENUE_MAP.player.radius,
        bounds: VENUE_MAP.playableBounds,
        obstacles: VENUE_MAP.obstacles,
        maxDistance: Math.max(320, venue.mapPosition.interactionRadius + 120),
      });

      if (point) {
        this.player.setPosition(point.x, point.y);
        this.player.setDepth(point.y);
        this.cameras.main.centerOn(point.x, point.y);
        this.updateNearbyVenue();
        this.emitPlayerPosition(0, false, true);
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

      const goal = findWalkablePointNear({
        x: venue.mapPosition.x,
        y: venue.mapPosition.y,
        radius: VENUE_MAP.player.radius,
        bounds: VENUE_MAP.playableBounds,
        obstacles: VENUE_MAP.obstacles,
        maxDistance: Math.max(
          320,
          venue.mapPosition.interactionRadius + 140,
        ),
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
    const maxStep = VENUE_MAP.player.speed * step;
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

    const speed = VENUE_MAP.player.speed;
    const moved = this.moveBy(
      this.movement.x * speed * step,
      this.movement.y * speed * step,
      step,
    );

    if (!moved) {
      this.stopWalkAnimation();
    }

    return moved;
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
    player.add([halo, shadow, character]);

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
    this.joystickMovement.set(0, 0);
  };

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    window.removeEventListener("blur", this.handleWindowBlur);
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
    this.nearbyTween?.stop();
    this.nearbyTween = undefined;
    this.markerRings.clear();
    this.shellMarkers.clear();
    this.pendingShellIds.clear();
    this.blockedShellIds.clear();
    this.nearbyVenueId = null;
    this.navigationGrid = undefined;
    this.pathGraphics = undefined;
  }
}
