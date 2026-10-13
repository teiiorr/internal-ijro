import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Position, UserStatus } from "@/lib/db/schema";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  position: Position;
  departmentId: string | null;
  status: UserStatus;
};

/**
 * Bitta so'rov/render ichida sessiyani bir marta oladi (React cache). Layout + page +
 * requireUser ketma-ket chaqirilganda auth() faqat bir marta ishlaydi.
 */
export const getSession = cache(async () => auth());

export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    email: session.user.email!,
    fullName: session.user.fullName,
    position: session.user.position,
    departmentId: session.user.departmentId,
    status: session.user.status,
  };
});

export async function requirePosition(allowed: Position[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.position)) redirect("/dashboard");
  return user;
}

/** Project-editor allowlist YOKI egasi tomonidan berilgan `projects.edit` imkoniyati. */
export async function requireProjectEditor(): Promise<SessionUser> {
  const user = await requireUser();
  if (canEditProjects(user.email)) return user;
  if (await hasGrant(user.id, "projects.edit")) return user;
  redirect("/projects");
}
