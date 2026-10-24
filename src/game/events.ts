/**
 * Typed contract between the Phaser scene and the React overlay.
 *
 * Keep all game/UI events here so neither side depends on ad-hoc DOM events or
 * untyped global emitters.
 */
export interface GameEventMap {
  "game:ready": {
    worldWidth: number;
    worldHeight: number;
  };
  "venue:nearby": {
    venueId: string | null;
  };
  "venue:interact": {
    venueId: string;
  };
}

export type GameEventName = keyof GameEventMap;

export type GameEventListener<K extends GameEventName> = (
  payload: GameEventMap[K],
) => void;
