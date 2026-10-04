import { describe, expect, it } from "vitest";
import { effectivePosition, isOwner, OWNER_EMAILS } from "./owner";

describe("effectivePosition", () => {
  const owner = OWNER_EMAILS[0];

  it("egasi bazadagi lavozimidan qat'i nazar direktor huquqlarini oladi", () => {
    expect(effectivePosition(owner, "mutaxassis")).toBe("direktor");
    expect(effectivePosition(` ${owner.toUpperCase()} `, "mutaxassis")).toBe("direktor");
  });

  it("boshqa xodimlarning lavozimi o'zgarmaydi", () => {
    expect(effectivePosition("someone@bkrm.uz", "mutaxassis")).toBe("mutaxassis");
    expect(effectivePosition(null, "hr")).toBe("hr");
    expect(isOwner(undefined)).toBe(false);
  });
});
