import type { Position } from "@/lib/db/schema";

/**
 * Position hierarchy levels (lower = higher authority).
 * HR and Kontragent are functional roles outside the chain.
 */
export const POSITION_LEVEL: Record<Position, number> = {
  direktor: 1,
  orinbosar: 2,
  koordinator: 3,
  bolim_boshligi: 4,
  bosh_mutaxassis: 5,
  yetakchi_mutaxassis: 6,
  mutaxassis: 7,
  hr: 99,
  kontragent: 100,
};

export function getPositionLevel(p: Position): number {
  return POSITION_LEVEL[p] ?? 999;
}

export function isManagerial(p: Position): boolean {
  return ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis"].includes(
    p
  );
}

export function isInternalEmployee(p: Position): boolean {
  return p !== "kontragent";
}
