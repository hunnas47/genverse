import type { QuestNameResult } from "@/types/quest";

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 20;

const RESERVED_NAMES = new Set([
  "admin",
  "administrator",
  "genm",
  "guest",
  "moderator",
  "official",
  "support",
]);

const ALLOWED_CHARACTERS = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '’_-]*$/u;
const HAS_LETTER = /\p{L}/u;

export function normalizeDisplayName(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

function graphemeLength(value: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)]
      .length;
  }

  return [...value].length;
}

/**
 * Shared by the join dialog and (later) the server. It allows Malayalam and
 * other Indic scripts, but rejects links, markup, and impersonation names.
 */
export function validateDisplayName(raw: string): QuestNameResult {
  const value = normalizeDisplayName(raw);
  const length = graphemeLength(value);

  if (length < DISPLAY_NAME_MIN_LENGTH) {
    return { ok: false, message: "Use at least 2 characters." };
  }

  if (length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false, message: "That name contains unsupported characters." };
  }

  if (/(https?:|www\.|@|\/|\\|<>)/i.test(value)) {
    return { ok: false, message: "Links and symbols are not allowed." };
  }

  if (!HAS_LETTER.test(value) || !ALLOWED_CHARACTERS.test(value)) {
    return {
      ok: false,
      message: "Use letters, numbers, spaces, apostrophes, or hyphens.",
    };
  }

  if (RESERVED_NAMES.has(value.toLowerCase())) {
    return { ok: false, message: "That name is reserved. Try another." };
  }

  return { ok: true, value };
}
