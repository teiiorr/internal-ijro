import type { Position } from "@/lib/db/schema";

/**
 * Pure (no DB) capability matrix derived from TZ §4.4.
 * Imported from server actions AND unit tests — must not pull DB or `server-only`.
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
      return ["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(position);
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
