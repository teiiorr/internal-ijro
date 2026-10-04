import "server-only";
import { isOwner } from "@/lib/permissions/owner";
import { canEditProjects, canViewMoney } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";

/**
 * Pul (byudjet / toʻlov summalari) koʻrinishi va tahriri uchun yagona tekshiruv.
 * Loyiha sahifalaridagi qoida bilan bir xil: egasi, money-allowlist yoki owner
 * bergan `money.view` grant. Boshqa xususiyatlar (masalan, haftalik brif) ham
 * shu funksiyalarni import qiladi — imzoni oʻzgartirmang.
 */
export type MoneyActor = { id: string; email: string | null | undefined };

export async function canSeeMoney(user: MoneyActor): Promise<boolean> {
  if (isOwner(user.email) || canViewMoney(user.email)) return true;
  return hasGrant(user.id, "money.view");
}

/** Toʻlov holatini oʻzgartirish huquqi = loyiha muharriri (allowlist yoki `projects.edit` grant). */
export async function canEditMoney(user: MoneyActor): Promise<boolean> {
  if (canEditProjects(user.email)) return true;
  return hasGrant(user.id, "projects.edit");
}
