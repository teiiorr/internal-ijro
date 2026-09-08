import "server-only";
import type { Position } from "@/lib/db/schema";
import { isOwner } from "./owner";
import { canEditProjects } from "./project-editors";
import { hasGrant } from "./grants";

/** Studiyalar bölimini asli boşqara oladigan lavozimlar. */
const MANAGER_POSITIONS: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"];

/**
 * Lavozimidan qatʼi nazar Studiyalar bölimiga kiritilgan qöşimça foydalanuvçilar
 * (ID böyiça). Nazoratchi mas'ul rolidagi, biroq katta lavozimga ega bölmagan xodim.
 */
const CONTRACTOR_MANAGER_USER_IDS = ["90956fa9-4892-4677-a31b-10af180e341a"];

type ContractorUser = { id: string; email: string | null | undefined; position: Position };

/**
 * Studiyalar bölimini töliq boşqaruvçilar — köra, yoza va moderatsiya qila oladi.
 * Platforma egasi (Bakhtiyorxöja) bu töplamga har doim kiradi.
 */
export function isContractorManager(user: ContractorUser): boolean {
  return (
    isOwner(user.email) ||
    MANAGER_POSITIONS.includes(user.position) ||
    CONTRACTOR_MANAGER_USER_IDS.includes(user.id)
  );
}

/**
 * Studiya suhbatlarini KÖRA oladigan tomon: boşqaruvçilar, hamda egasi maxsus
 * `contractors.chat_read` huquqini bergan xodimlar. Bu huquq faqat öqiş uçun —
 * yozish/öçirish boşqaruvçilarga qoladi.
 */
export async function canViewContractorChats(user: ContractorUser): Promise<boolean> {
  if (isContractorManager(user)) return true;
  return hasGrant(user.id, "contractors.chat_read");
}

/**
 * Suhbatdagi istalgan xabarni öçira oladigan (moderatsiya) tomonni aniqlaydi.
 * `deleteProjectMessage` server nazorati bilan bir xil: egasi, loyiha muharriri
 * yoki `projects.edit` grantiga ega xodim. Muallif öz xabarini baribir öçiradi.
 */
export async function canModerateContractorChats(user: ContractorUser): Promise<boolean> {
  return (
    isOwner(user.email) ||
    canEditProjects(user.email) ||
    hasGrant(user.id, "projects.edit")
  );
}
