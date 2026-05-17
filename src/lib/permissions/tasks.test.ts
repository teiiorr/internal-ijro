import { describe, expect, it } from "vitest";
import { canTransition, type TaskStatus } from "./tasks";
import { getPositionLevel } from "./positions";

const A = (overrides: Partial<{ id: string; position: string; isCreator: boolean; isAssignee: boolean }>) => ({
  id: overrides.id ?? "actor",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  position: (overrides.position as any) ?? "mutaxassis",
  isCreator: overrides.isCreator ?? false,
  isAssignee: overrides.isAssignee ?? false,
});

describe("canTransition (TZ §6.3 lifecycle)", () => {
  it("assignee can start a todo", () => {
    expect(canTransition("todo", "in_progress", A({ isAssignee: true }))).toBe(true);
  });
  it("assignee can submit for review", () => {
    expect(canTransition("in_progress", "under_review", A({ isAssignee: true }))).toBe(true);
  });
  it("only creator can approve", () => {
    expect(canTransition("under_review", "completed", A({ isAssignee: true }))).toBe(false);
    expect(canTransition("under_review", "completed", A({ isCreator: true }))).toBe(true);
  });
  it("only creator can reject", () => {
    expect(canTransition("under_review", "rejected", A({ isAssignee: true }))).toBe(false);
    expect(canTransition("under_review", "rejected", A({ isCreator: true }))).toBe(true);
  });
  it("rejected returns to in_progress", () => {
    expect(canTransition("rejected", "in_progress", A({ isAssignee: true }))).toBe(true);
  });
  it("Direktor can do anything", () => {
    expect(canTransition("todo", "completed", A({ position: "direktor" }))).toBe(true);
    expect(canTransition("completed", "todo", A({ position: "direktor" }))).toBe(true);
  });
  it("random outsider cannot move tasks", () => {
    expect(canTransition("todo", "in_progress", A({ position: "mutaxassis" }))).toBe(false);
  });
  it("noop transition forbidden", () => {
    const cur: TaskStatus = "in_progress";
    expect(canTransition(cur, cur, A({ isAssignee: true }))).toBe(false);
  });
});

describe("getPositionLevel", () => {
  it("orders the chain", () => {
    expect(getPositionLevel("direktor")).toBeLessThan(getPositionLevel("orinbosar"));
    expect(getPositionLevel("orinbosar")).toBeLessThan(getPositionLevel("koordinator"));
    expect(getPositionLevel("koordinator")).toBeLessThan(getPositionLevel("bolim_boshligi"));
    expect(getPositionLevel("bolim_boshligi")).toBeLessThan(getPositionLevel("bosh_mutaxassis"));
    expect(getPositionLevel("bosh_mutaxassis")).toBeLessThan(getPositionLevel("yetakchi_mutaxassis"));
    expect(getPositionLevel("yetakchi_mutaxassis")).toBeLessThan(getPositionLevel("mutaxassis"));
  });
});
