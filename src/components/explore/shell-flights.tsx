"use client";

import { Shell } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";

import { getShellDataUrl } from "@/game/shell-texture";
import { cn } from "@/lib/utils";

export interface ShellFlight {
  id: number;
  /** Viewport CSS px where the shell was collected. */
  x: number;
  y: number;
}

const FLIGHT_SIZE = 34;
const noopSubscribe = () => () => undefined;

function useShellImage(): string | null {
  // The data URL is drawn once in the browser and cached; null on the server.
  return useSyncExternalStore(noopSubscribe, getShellDataUrl, () => null);
}

/** The map's shell artwork as a small icon, with a generic fallback. */
export function ShellIcon({ className }: { className?: string }) {
  const src = useShellImage();

  if (!src) {
    return <Shell aria-hidden="true" className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- in-memory data URL
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("object-contain", className)}
    />
  );
}

function Flight({
  flight,
  src,
  targetRef,
  onDone,
}: {
  flight: ShellFlight;
  src: string;
  targetRef: RefObject<HTMLElement | null>;
  onDone: (id: number) => void;
}) {
  const ref = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const target = targetRef.current?.getBoundingClientRect();
    // Without a visible counter, lift the shell up and fade it instead.
    const dx = target ? target.left + target.width / 2 - flight.x : 0;
    const dy = target ? target.top + target.height / 2 - flight.y : -90;
    const animation = element.animate(
      [
        { transform: "translate(0, 0) scale(0.9) rotate(0deg)", opacity: 1 },
        {
          // Arc upward on the way, like a coin pickup.
          transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(1.35) rotate(-140deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.45) rotate(-300deg)`,
          opacity: target ? 0.9 : 0,
        },
      ],
      { duration: 720, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" },
    );

    animation.onfinish = () => {
      targetRef.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.35)" },
          { transform: "scale(1)" },
        ],
        { duration: 320, easing: "ease-out" },
      );
      onDone(flight.id);
    };

    return () => {
      animation.onfinish = null;
      animation.cancel();
    };
    // The flight is immutable once launched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- in-memory data URL
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none fixed z-50 drop-shadow-[0_4px_8px_rgba(28,29,58,0.45)]"
      style={{
        left: flight.x - FLIGHT_SIZE / 2,
        top: flight.y - FLIGHT_SIZE / 2,
        width: FLIGHT_SIZE,
        height: FLIGHT_SIZE,
      }}
    />
  );
}

/**
 * Collected shells fly from the map into the HUD shell counter. Purely
 * decorative: the score is already settled before a flight starts.
 */
export function ShellFlights({
  flights,
  targetRef,
  onDone,
}: {
  flights: readonly ShellFlight[];
  targetRef: RefObject<HTMLElement | null>;
  onDone: (id: number) => void;
}) {
  const src = useShellImage();

  if (!src) {
    return null;
  }

  return (
    <>
      {flights.map((flight) => (
        <Flight
          key={flight.id}
          flight={flight}
          src={src}
          targetRef={targetRef}
          onDone={onDone}
        />
      ))}
    </>
  );
}
