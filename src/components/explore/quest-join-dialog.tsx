"use client";

import { Move, Sparkles, Stamp } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Credit } from "@/components/site/credit";
import type { QuestNameResult } from "@/types/quest";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function QuestJoinDialog({
  open,
  initialName = "",
  onJoin,
  onDismiss,
}: {
  open: boolean;
  initialName?: string;
  onJoin: (name: string) => Promise<QuestNameResult>;
  onDismiss: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "quest-join-title";
  const isRenaming = initialName.trim().length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onDismiss]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await onJoin(name);

      if (!result.ok) {
        setError(result.message);
        inputRef.current?.focus();
      }
    } catch {
      setError("Your name could not be saved. Please try again.");
      inputRef.current?.focus();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-deep/70 px-4 sm:backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onDismiss();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-brand-deep/15 bg-cream p-6 text-brand-deep shadow-lift sm:p-7"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-deep px-3 py-1.5 font-display text-xs font-bold tracking-[0.16em] text-lime uppercase">
          <Sparkles aria-hidden="true" className="size-3" />
          Beach Quest
        </span>

        <h2 id={titleId} className="mt-4 text-2xl leading-tight font-medium">
          {isRenaming ? "Change your display name" : "Join the beach hunt"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-deep/75">
          {isRenaming
            ? "Your existing points stay with you. Pick the name other explorers will see."
            : "Pick a display name to save your shells and venue stamps. No email or password. You can change it later."}
        </p>

        {!isRenaming && (
          <ul className="quest-join-steps mt-4 grid gap-2 rounded-2xl border border-brand-deep/10 bg-brand-deep/[0.04] p-3 text-xs leading-relaxed text-brand-deep/75">
            <li className="flex items-start gap-2">
              <Move
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-brand-deep/60"
              />
              Drag the joystick or tap the map to explore.
            </li>
            <li className="flex items-start gap-2">
              <Sparkles
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-brand-deep/60"
              />
              Walk near a glowing shell to collect it.
            </li>
            <li className="flex items-start gap-2">
              <Stamp
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-brand-deep/60"
              />
              Open a venue and check in for 25 points.
            </li>
          </ul>
        )}

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="quest-display-name"
            className="font-display text-xs font-bold tracking-[0.14em] text-brand-deep/70 uppercase"
          >
            Display name
          </label>
          <input
            ref={inputRef}
            id="quest-display-name"
            name="displayName"
            type="text"
            autoComplete="nickname"
            spellCheck={false}
            maxLength={60}
            value={name}
            disabled={pending}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "quest-name-error" : undefined}
            placeholder="Your name"
            className="mt-2 min-h-12 w-full rounded-2xl border border-brand-deep/20 bg-white px-4 py-3 text-base text-brand-deep outline-none transition focus-visible:border-brand-deep focus-visible:ring-2 focus-visible:ring-brand/30"
          />
          {error && (
            <p
              id="quest-name-error"
              role="alert"
              className="mt-2 text-xs leading-relaxed text-coral"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-deep px-5 py-3 font-display text-xs font-bold tracking-[0.12em] text-lime uppercase transition hover:bg-brand-deep/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep disabled:cursor-wait disabled:bg-brand-deep/70"
          >
            {pending
              ? "Joining…"
              : isRenaming
                ? "Save name"
                : "Start collecting"}
          </button>
        </form>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 py-2 font-display text-xs font-bold tracking-[0.1em] text-brand-deep/70 uppercase transition hover:bg-brand-deep/5 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          Explore first
        </button>

        <p className="mt-2 text-center text-xs leading-relaxed text-brand-deep/60">
          Names can use letters, numbers, spaces, apostrophes, or hyphens.
        </p>

        <Credit
          className="mt-4 border-t border-brand-deep/10 pt-3 text-center text-brand-deep/60"
          linkClassName="text-brand-deep hover:text-brand"
        />
      </div>
    </div>
  );
}
