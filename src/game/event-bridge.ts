import type {
  GameEventListener,
  GameEventMap,
  GameEventName,
} from "@/game/events";

type AnyListener = (payload: unknown) => void;

/**
 * Small typed emitter used by the Phaser scene and React overlay.
 *
 * `on` returns an unsubscribe function so effects can clean up without
 * reaching into the bridge internals.
 */
export class GameEventBridge {
  private readonly listeners = new Map<GameEventName, Set<AnyListener>>();

  on<K extends GameEventName>(
    event: K,
    listener: GameEventListener<K>,
  ): () => void {
    let listeners = this.listeners.get(event);

    if (!listeners) {
      listeners = new Set<AnyListener>();
      this.listeners.set(event, listeners);
    }

    listeners.add(listener as AnyListener);

    return () => {
      listeners.delete(listener as AnyListener);

      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): void {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      (listener as GameEventListener<K>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
