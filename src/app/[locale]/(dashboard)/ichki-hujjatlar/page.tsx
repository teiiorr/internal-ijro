import { redirect } from "next/navigation";

/** /ichki-hujjatlar → birinchi koʻrinish (Bildirgilar). */
export default function InternalDocsIndex() {
  redirect("/ichki-hujjatlar/bildirgilar");
}
