/**
 * Typed contract between the Phaser scene and the React overlay.
 *
 * Keep all game/UI events here so neither side depends on ad-hoc DOM events or
 * untyped global emitters. The bridge is bidirectional: React sends movement
 * intent and navigation requests, Phaser sends player position and state.
 */

export type NavigationTarget =
  | { kind: "point"; x: number; y: number }
  | { kind: "venue"; venueId: string };

export type NavigationEndReason = "arrived" | "cancelled" | "unreachable";

export interface NavigationState {
  active: boolean;
  targetX: number | null;
  targetY: number | null;
  venueId: string | null;
  reason?: NavigationEndReason;
}

export interface GameEventMap {
  "game:ready": {
    worldWidth: number;
    worldHeight: number;
  };
  /**
   * The supplied map artwork failed to load. The scene keeps running with a
   * simplified background so movement and venue data remain usable.
   */
  "game:map-fallback": {
    message: string;
  };
  "venue:nearby": {
    venueId: string | null;
  };
  "venue:interact": {
    venueId: string;
  };
  /** Normalized joystick vector. A zero vector means stop. */
  "input:move": {
    x: number;
    y: number;
  };
  /** Requests a walkable route to a world point or venue. */
  "navigation:goto": {
    target: NavigationTarget;
  };
  /** Stops tap-to-move without opening a venue. */
  "navigation:cancel": Record<string, never>;
  "navigation:state": NavigationState;
  /** Throttled player position for the React minimap. */
  "player:position": {
    x: number;
    y: number;
    moving: boolean;
  };
}

export type GameEventName = keyof GameEventMap;

export type GameEventListener<K extends GameEventName> = (
  payload: GameEventMap[K],
) => void;
