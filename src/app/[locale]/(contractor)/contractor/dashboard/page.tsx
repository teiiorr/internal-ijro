import { redirect } from "next/navigation";

// Loyihalar iş navbatiga birlaştirildi — faqat eski havola va xatchöplarni yönaltiriş uchun qoldirilgan.
export default function ContractorDashboardPage() {
  redirect("/contractor/projects");
}
