import { describe, expect, it } from "vitest";

import { getAvatarFacing } from "./avatar";

describe("getAvatarFacing", () => {
  it("maps the cardinal directions to the supplied views", () => {
    expect(getAvatarFacing(1, 0)).toBe("right");
    expect(getAvatarFacing(-1, 0)).toBe("left");
    expect(getAvatarFacing(0, 1)).toBe("down");
    expect(getAvatarFacing(0, -1)).toBe("up");
  });

  it("favours the side view for diagonal movement", () => {
    expect(getAvatarFacing(1, 1)).toBe("right");
    expect(getAvatarFacing(-1, 1)).toBe("left");
    expect(getAvatarFacing(1, -1)).toBe("right");
    expect(getAvatarFacing(-1, -1)).toBe("left");
  });

  it("uses the vertical view when movement is mostly vertical", () => {
    expect(getAvatarFacing(0.2, 1)).toBe("down");
    expect(getAvatarFacing(-0.2, -1)).toBe("up");
  });

  it("keeps the current facing when there is no movement", () => {
    expect(getAvatarFacing(0, 0)).toBeNull();
    expect(getAvatarFacing(0.0005, 0.0005)).toBeNull();
  });
});
