import type { Position } from "@/lib/db/schema";

/**
 * TZ §4.4 dan olingan sof (DB'siz) qobiliyatlar matritsasi.
 * Server action'lardan ham, unit-testlardan ham import qilinadi — DB yoki `server-only` ni tortmasligi kerak.
 */
export type Capability =
  | "settings.company"
  | "users.assign_position"
  | "departments.manage"
  | "employees.create"
  | "employees.archive"
  | "employees.view_all"
  | "hr.documents"
  | "projects.create"
  | "contractors.approve"
  | "tasks.assign"
  | "audit.view_full"
  | "audit.view_hr"
  | "leaves.manage";

export function can(position: Position, cap: Capability): boolean {
  switch (cap) {
    case "settings.company":
      return position === "direktor";
    case "users.assign_position":
      return position === "direktor" || position === "orinbosar";
    case "departments.manage":
      return position === "direktor" || position === "orinbosar";
    case "employees.create":
    case "employees.archive":
    case "hr.documents":
      return position === "direktor" || position === "orinbosar" || position === "hr";
    case "employees.view_all":
      return position !== "kontragent";
    case "projects.create":
      return ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"].includes(position);
    case "contractors.approve":
      return ["direktor", "orinbosar", "koordinator"].includes(position);
    case "tasks.assign":
      return !["mutaxassis", "hr", "kontragent"].includes(position);
    case "audit.view_full":
      return position === "direktor" || position === "orinbosar";
    case "audit.view_hr":
      return position === "hr";
    case "leaves.manage":
      return ["direktor", "orinbosar", "hr"].includes(position);
    default:
      return false;
  }
}
