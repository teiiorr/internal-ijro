import "server-only";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Position, UserStatus } from "@/lib/db/schema";
import { canEditProjects } from "@/lib/permissions/project-editors";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  position: Position;
  departmentId: string | null;
  status: UserStatus;
};

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    email: session.user.email!,
    fullName: session.user.fullName,
    position: session.user.position,
    departmentId: session.user.departmentId,
    status: session.user.status,
  };
}

export async function requirePosition(allowed: Position[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.position)) redirect("/dashboard");
  return user;
}

/** Only the fixed project-editor allowlist may mutate projects/stages. */
export async function requireProjectEditor(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canEditProjects(user.email)) redirect("/projects");
  return user;
}
