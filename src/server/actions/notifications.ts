"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { markAllAsRead, markAsRead } from "@/lib/notifications";

export async function markOneRead(id: string) {
  const me = await requireUser();
  await markAsRead(id, me.id);
  revalidatePath("/notifications");
}

export async function markAllRead() {
  const me = await requireUser();
  await markAllAsRead(me.id);
  revalidatePath("/notifications");
}
