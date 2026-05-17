"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { markAllAsRead, markAsRead } from "@/lib/notifications";

export async function markOneRead(id: string) {
  await requireUser();
  await markAsRead(id);
  revalidatePath("/notifications");
}

export async function markAllRead() {
  const me = await requireUser();
  await markAllAsRead(me.id);
  revalidatePath("/notifications");
}
