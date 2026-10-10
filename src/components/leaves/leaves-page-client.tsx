"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Field } from "@/components/ui-biib/Field";
import { Input } from "@/components/ui-biib/Input";
import { Textarea } from "@/components/ui-biib/Textarea";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { approveLeave, rejectLeave, requestLeave } from "@/server/actions/leaves";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";

type Leave = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string | null;
  rejectionReason: string | null;
  userName?: string;
  userAvatarUrl?: string | null;
};

const STATUS_TONE: Record<string, StatusTone> = {
  approved: "success",
  rejected: "danger",
  pending: "warning",
};

export function LeavesPageClient({
  myLeaves,
  pendingForReview,
  canManage,
  calendar,
}: {
  myLeaves: Leave[];
  pendingForReview: Leave[];
  canManage: boolean;
  calendar?: ReactNode;
}) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const typeLabel = (type: string) => t(`leaves.types.${type}` as "leaves.types.vacation");
  const statusLabel = (status: string) => t(`status.${status}` as "status.approved");

  return (
    <>
      <PageHeader
        title={t("leaves.pageTitle")}
        actions={open ? undefined : <Button onClick={() => setOpen(true)}>{t("leaves.request")}</Button>}
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        {open && (
          <Card>
            <form
              action={(fd) => start(async () => { await requestLeave(fd); setOpen(false); })}
              className="flex flex-col gap-5"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="leave-type">{t("leaves.fields.type")}</Label>
                  <Select name="type" defaultValue="vacation">
                    <SelectTrigger id="leave-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">{t("leaves.types.vacation")}</SelectItem>
                      <SelectItem value="sick">{t("leaves.types.sick")}</SelectItem>
                      <SelectItem value="unpaid">{t("leaves.types.unpaid")}</SelectItem>
                      <SelectItem value="other">{t("leaves.types.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field id="leave-start" label={t("leaves.fields.start")} required>
                  {(c) => <Input {...c} name="startDate" type="date" />}
                </Field>
                <Field id="leave-end" label={t("leaves.fields.end")} required>
                  {(c) => <Input {...c} name="endDate" type="date" />}
                </Field>
              </div>
              <Field id="leave-reason" label={t("leaves.fields.reason")}>
                {(c) => <Textarea {...c} name="reason" rows={2} />}
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={pending}>{t("common.submit")}</Button>
              </div>
            </form>
          </Card>
        )}

        {calendar}

        {/* Mening tatillarim */}
        <Section title={t("leaves.myLeaves")}>
          <Card bare className="px-5 sm:px-6">
            {myLeaves.length === 0 ? (
              <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("leaves.none")}</p>
            ) : (
              <Rows>
                {myLeaves.map((l) => {
                  const note = l.status === "rejected" ? l.rejectionReason : l.reason;
                  return (
                    <Row key={l.id}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{typeLabel(l.type)}</p>
                        <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                          <span className="tabular-nums">{l.startDate} → {l.endDate}</span>
                          {note ? `, ${note}` : ""}
                        </p>
                      </div>
                      <Status tone={STATUS_TONE[l.status] ?? "neutral"} className="shrink-0">
                        {statusLabel(l.status)}
                      </Status>
                    </Row>
                  );
                })}
              </Rows>
            )}
          </Card>
        </Section>

        {/* Tasdiqlash kutilmoqda (rahbarlar) */}
        {canManage && (
          <Section title={t("leaves.pending")} meta={pendingForReview.length > 0 ? <span className="tabular-nums">{pendingForReview.length}</span> : undefined}>
            <Card bare className="px-5 sm:px-6">
              {pendingForReview.length === 0 ? (
                <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("contractors.none")}</p>
              ) : (
                <Rows>
                  {pendingForReview.map((l) => (
                    <Row key={l.id} className="flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="inline-flex min-w-0 items-center gap-1.5 text-[0.9375rem] font-medium text-[var(--ink)]">
                          {l.userName && <UserAvatar name={l.userName} avatarUrl={l.userAvatarUrl} size="xs" clickable={false} />}
                          <span className="truncate">{shortName(l.userName)}, {typeLabel(l.type)}</span>
                        </p>
                        <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                          <span className="tabular-nums">{l.startDate} → {l.endDate}</span>
                          {l.reason ? `, ${l.reason}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-2 max-sm:w-full">
                        {rejectId === l.id ? (
                          <>
                            <Input
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder={t("common.reason")}
                              aria-label={t("common.reason")}
                              className="h-10 w-full sm:w-56"
                            />
                            <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { await rejectLeave(l.id, reason); setRejectId(null); setReason(""); })}>
                              {t("tasks.transitions.confirmReject")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>{t("common.cancel")}</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" disabled={pending} onClick={() => start(async () => { await approveLeave(l.id); })}>{t("common.approve")}</Button>
                            <Button size="sm" variant="outline" onClick={() => setRejectId(l.id)}>{t("common.reject")}</Button>
                          </>
                        )}
                      </div>
                    </Row>
                  ))}
                </Rows>
              )}
            </Card>
          </Section>
        )}
      </div>
    </>
  );
}
