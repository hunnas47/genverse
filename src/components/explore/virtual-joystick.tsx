"use client";

import { Move } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/utils";

const BASE_SIZE = 112;
const THUMB_SIZE = 44;
const MAX_OFFSET = (BASE_SIZE - THUMB_SIZE) / 2;
const DEAD_ZONE = 0.16;

/**
 * Touch-first joystick that feeds the same movement intent as the keyboard.
 *
 * It reports an analog vector capped at unit length, so a small tilt walks
 * slowly. Collision, camera, and animation stay in the Phaser scene, so every
 * input path shares one movement system.
 */
export function VirtualJoystick({
  onMove,
  className,
}: {
  onMove: (x: number, y: number) => void;
  className?: string;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) {
        return;
      }

      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);

      if (distance > MAX_OFFSET) {
        dx = (dx / distance) * MAX_OFFSET;
        dy = (dy / distance) * MAX_OFFSET;
      }

      setOffset({ x: dx, y: dy });

      const nx = dx / MAX_OFFSET;
      const ny = dy / MAX_OFFSET;
      const magnitude = Math.hypot(nx, ny);

      if (magnitude < DEAD_ZONE) {
        onMove(0, 0);
        return;
      }

      const scale = Math.min(1, magnitude) / magnitude;
      onMove(nx * scale, ny * scale);
    },
    [onMove],
  );

  const release = useCallback(() => {
    pointerIdRef.current = null;
    setOffset({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    const handleBlur = () => release();

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
      pointerIdRef.current = null;
      onMove(0, 0);
    };
  }, [onMove, release]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (pointerIdRef.current !== null) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    update(event.clientX, event.clientY);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    update(event.clientX, event.clientY);
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    release();
  };

  const handleLostPointerCapture = () => {
    if (pointerIdRef.current !== null) {
      release();
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex touch-none flex-col items-center select-none",
        className,
      )}
    >
      <div
        ref={baseRef}
        role="group"
        aria-label="Virtual joystick. Drag to move. Release to stop."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handleLostPointerCapture}
        className="relative touch-none rounded-full border border-white/25 bg-brand-deep/80 shadow-lift backdrop-blur-md"
        style={{ width: BASE_SIZE, height: BASE_SIZE }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-full border border-white/10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 grid place-items-center rounded-full border border-lime/40 bg-lime text-brand-deep shadow-lift"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          }}
        >
          <Move className="size-4" />
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-display text-[8px] font-bold tracking-[0.2em] text-white/50 uppercase"
        >
          Move
        </span>
      </div>
    </div>
  );
}
