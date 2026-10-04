import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { activityLog, users } from "@/lib/db/schema";
import { taskDeadlineRequests } from "@/lib/db/tables/task-edit";
import {
  historyDetails,
  historyKindForAction,
  historyUserRefs,
  toTashkentIso,
  type DeadlineRequestView,
  type HistoryEvent,
  type HistoryKind,
} from "@/components/staff/task-edit/task-edit-logic";

export type { DeadlineRequestView, HistoryEvent, HistoryKind };

/**
 * Every deadline-extension request of a task, pending first, then newest first.
 * Empty when the 0031 migration is not applied yet.
 */
export async function getTaskDeadlineRequests(taskId: string): Promise<DeadlineRequestView[]> {
  try {
    const requester = alias(users, "requester");
    const decider = alias(users, "decider");
    const rows = await db
      .select({
        id: taskDeadlineRequests.id,
        requestedById: taskDeadlineRequests.requestedByUserId,
        requesterName: requester.fullName,
        requesterAvatar: requester.avatarUrl,
        previousDeadline: taskDeadlineRequests.previousDeadline,
        requestedDeadline: taskDeadlineRequests.requestedDeadline,
        reason: taskDeadlineRequests.reason,
        status: taskDeadlineRequests.status,
        deciderName: decider.fullName,
        decisionNote: taskDeadlineRequests.decisionNote,
        decidedAt: taskDeadlineRequests.decidedAt,
        createdAt: taskDeadlineRequests.createdAt,
      })
      .from(taskDeadlineRequests)
      .innerJoin(requester, eq(requester.id, taskDeadlineRequests.requestedByUserId))
      .leftJoin(decider, eq(decider.id, taskDeadlineRequests.decidedByUserId))
      .where(eq(taskDeadlineRequests.taskId, taskId))
      .orderBy(desc(taskDeadlineRequests.createdAt))
      .limit(100);
    const out: DeadlineRequestView[] = rows.map((r) => ({
      ...r,
      deciderName: r.deciderName ?? null,
      previousDate: r.previousDeadline ? toTashkentIso(r.previousDeadline) : null,
      requestedDate: toTashkentIso(r.requestedDeadline),
    }));
    // Stable partition: pending requests first.
    return [...out.filter((r) => r.status === "pending"), ...out.filter((r) => r.status !== "pending")];
  } catch {
    return [];
  }
}

/**
 * Task timeline from activity_log. activity_log.entity_id has no index, so the scan
 * is bounded by created_at (indexed) starting one minute before the task was created.
 */
export async function getTaskHistory(taskId: string, taskCreatedAt: Date | string): Promise<HistoryEvent[]> {
  try {
    const since = new Date(new Date(taskCreatedAt).getTime() - 60_000);
    const rows = await db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        createdAt: activityLog.createdAt,
        actorName: users.fullName,
        actorAvatar: users.avatarUrl,
      })
      .from(activityLog)
      .leftJoin(users, eq(users.id, activityLog.userId))
      .where(
        and(
          eq(activityLog.entityType, "task"),
          eq(activityLog.entityId, taskId),
          gte(activityLog.createdAt, since)
        )
      )
      // Newest 200 (the card shows newest first), then back to chronological order.
      .orderBy(desc(activityLog.createdAt))
      .limit(200);
    rows.reverse();

    const mapped = rows
      .map((r) => ({ ...r, kind: historyKindForAction(r.action) }))
      .filter((r): r is typeof r & { kind: HistoryKind } => r.kind !== null);

    // One extra query resolves every referenced user (review targets, added/removed assignees, nudged people).
    const refIds = Array.from(new Set(mapped.flatMap((r) => historyUserRefs(r.kind, r.newValue))));
    const names = new Map<string, string>();
    if (refIds.length > 0) {
      const people = await db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, refIds));
      for (const p of people) names.set(p.id, p.fullName);
    }
    const nameOf = (id: string) => names.get(id) ?? null;

    return mapped.map((r) => ({
      id: r.id,
      at: r.createdAt,
      actorName: r.actorName ?? null,
      actorAvatar: r.actorAvatar ?? null,
      kind: r.kind,
      details: historyDetails(r.kind, r.oldValue, r.newValue, nameOf),
    }));
  } catch {
    return [];
  }
}
