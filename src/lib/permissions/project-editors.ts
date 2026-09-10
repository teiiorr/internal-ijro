/**
 * Faqat belgilangan katta xodimlar töplami loyiha va bosqiçlarni yaratiş / tahrirlaş /
 * öçiriş huquqiga ega. Qolganlar loyihalarni faqat köriş huquqiga ega. Korporativ
 * email'ning familiya qismi böyiça (`surname.name@bkrm.uz`) moslaştiriladi; imlo
 * variantlari (x/h) ham kiritilgan.
 */
const PROJECT_EDITOR_SURNAMES = new Set([
  "murodxojayev",
  "yuldashev",
  "akromov",
  "bosimov",
  "bobomurodov",
  "xasanova",
  "hasanova",
  "mirzaliyev",
  "madraximov",
  "madrahimov",
  "serobov",
  "kuralov",
  "toshxodjayev",
  "ahmedov",
  "mamatov",
]);

export function canEditProjects(email: string | null | undefined): boolean {
  if (!email) return false;
  const surname = email.split("@")[0]?.split(".")[0]?.toLowerCase() ?? "";
  return PROJECT_EDITOR_SURNAMES.has(surname);
}

/**
 * Loyiha darajasidagi hujjat panellarini — "Loyiha bo'yicha tahlil" + "Xalqaro
 * tajriba" — QÖŞIŞga ruxsat etilgan qöşimça xodimlar (muharrir allowlist'idan
 * taşqari). Ular yuklay oladi, biroq öçira olmaydi (öçiriş faqat muharrirlarga qoladi).
 */
const PROJECT_DOC_UPLOADER_SURNAMES = new Set(["matyakubov", "matyoqubov"]);

export function canUploadProjectDocs(email: string | null | undefined): boolean {
  if (!email) return false;
  const surname = email.split("@")[0]?.split(".")[0]?.toLowerCase() ?? "";
  return PROJECT_EDITOR_SURNAMES.has(surname) || PROJECT_DOC_UPLOADER_SURNAMES.has(surname);
}

/**
 * Pul körinişi. Byudjetlar va tölov summalari (raqamlarda) FAQAT şu belgilangan
 * allowlist'ga körsatiladi; qolganlar örniga {@link MONEY_MASK} ni köradi. Yagona
 * istisno — boşqaruv panelidagi "To'lovlar ko'rinishi" kartasi, u öz kengroq
 * auditoriyasini saqlaydi (direktor + Moliya bölimi + bölim boşliqlari).
 */
export function canViewMoney(email: string | null | undefined): boolean {
  return canEditProjects(email);
}

/** Pul köriş huquqiga ega bölmagan foydalanuvçilar uçun byudjet/summa örniga körsatiladigan öringazar. */
export const MONEY_MASK = "***";
