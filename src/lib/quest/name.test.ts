import { describe, expect, it } from "vitest";

import {
  DISPLAY_NAME_MAX_LENGTH,
  normalizeDisplayName,
  validateDisplayName,
} from "@/lib/quest/name";

describe("display names", () => {
  it("normalizes whitespace", () => {
    expect(normalizeDisplayName("  Ayesha   K  ")).toBe("Ayesha K");
  });

  it("accepts Malayalam and Indic names", () => {
    expect(validateDisplayName("ആയിഷ").ok).toBe(true);
    expect(validateDisplayName("Fathima Zahra").ok).toBe(true);
    expect(validateDisplayName("O'Neill").ok).toBe(true);
  });

  it("rejects names that are too short or too long", () => {
    expect(validateDisplayName("A").ok).toBe(false);
    expect(validateDisplayName("x".repeat(DISPLAY_NAME_MAX_LENGTH + 1)).ok).toBe(
      false,
    );
  });

  it("rejects links, markup, and impersonation", () => {
    expect(validateDisplayName("https://genm.in").ok).toBe(false);
    expect(validateDisplayName("www.example.com").ok).toBe(false);
    expect(validateDisplayName("<script>").ok).toBe(false);
    expect(validateDisplayName("admin").ok).toBe(false);
    expect(validateDisplayName("GENM").ok).toBe(false);
  });

  it("rejects names without letters", () => {
    expect(validateDisplayName("1234").ok).toBe(false);
  });
});
