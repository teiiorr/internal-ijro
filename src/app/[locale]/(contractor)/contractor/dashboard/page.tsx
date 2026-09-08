import { redirect } from "next/navigation";

// Merged into the projects work-queue — kept only to redirect old links/bookmarks.
export default function ContractorDashboardPage() {
  redirect("/contractor/projects");
}
