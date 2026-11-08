import { describe, expect, it } from "vitest";

import { isAllCapsTitle } from "@/lib/programme";

describe("isAllCapsTitle", () => {
  it("flags titles published entirely in capitals", () => {
    expect(isAllCapsTitle("INAUGURATION")).toBe(true);
    expect(isAllCapsTitle("GEN Z REACTING!")).toBe(true);
    expect(isAllCapsTitle("FINDING ISLAM: The call that changed her")).toBe(
      false,
    );
  });

  it("leaves sentence-case, short, and Malayalam titles alone", () => {
    expect(isAllCapsTitle("Kerala Muslim Renaissance")).toBe(false);
    expect(isAllCapsTitle("AI")).toBe(false);
    expect(isAllCapsTitle("ബന്ധങ്ങൾ; വിലയറിഞ്ഞാൽ")).toBe(false);
  });
});
