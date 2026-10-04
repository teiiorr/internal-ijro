"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconSend, IconLoader2, IconAlertTriangle } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmployeePicker } from "@/components/ui/employee-picker";
import { cn } from "@/lib/utils";
import { createAckRequest } from "@/server/actions/normative-ack";
import type { Audience } from "@/lib/audience";
import { addDaysYmd, errorKey, type AckComposerOptions } from "./logic";

type Mode = "all" | "departments" | "positions" | "people";

const CHECK = "size-4 shrink-0 accent-[var(--primary)]";
const DEFAULT_DAYS = 3;

/**
 * "Tanishtirishga yuborish": audience (all / departments / positions / people) + deadline + message.
 * Limited senders (bolim_boshligi, koordinator) only see their allowed departments and people;
 * the server re-checks with canSendToAudience (forbidden_audience).
 */
export function AckRequestDialog({
  documentId,
  fileName,
  options,
  today,
}: {
  documentId: string;
  fileName: string;
  options: AckComposerOptions;
  /** Tashkent date (YYYY-MM-DD) from the server — the earliest allowed deadline. */
  today: string;
}) {
  const t = useTranslations("staffX.normativeAck");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const isAny = options.allowed === "any";
  const modes: Mode[] = isAny ? ["all", "departments", "positions", "people"] : ["departments", "people"];
  const noScope = !isAny && options.departments.length === 0;

  const [mode, setMode] = useState<Mode>(isAny ? "all" : "departments");
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(() => addDaysYmd(today, DEFAULT_DAYS));
  const [message, setMessage] = useState("");

  const modeLabel: Record<Mode, string> = {
    all: t("audienceAll"),
    departments: t("audienceDepartments"),
    positions: t("audiencePositions"),
    people: t("audiencePeople"),
  };

  function reset() {
    setMode(isAny ? "all" : "departments");
    // Limited roles: their allowed departments are pre-checked.
    setDeptIds(isAny ? [] : options.departments.map((d) => d.id));
    setPositions([]);
    setUserIds([]);
    setDeadline(addDaysYmd(today, DEFAULT_DAYS));
    setMessage("");
  }

  function onOpenChange(next: boolean) {
    if (next) reset();
    setOpen(next);
  }

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  function buildAudience(): Audience | null {
    if (mode === "all") return isAny ? { all: true } : null;
    if (mode === "departments") return deptIds.length ? { departmentIds: deptIds } : null;
    if (mode === "positions") return positions.length ? ({ positions } as Audience) : null;
    return userIds.length ? { userIds } : null;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const audience = buildAudience();
    if (!audience) {
      toast.error(t("selectAudience"));
      return;
    }
    if (!deadline || deadline < today) {
      toast.error(t("errors.dateInPast"));
      return;
    }
    start(async () => {
      try {
        const res = await createAckRequest({ documentId, audience, deadline, message: message.trim() || null });
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          return;
        }
        toast.success(t("sent", { count: res.recipients }));
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  const idp = `ack-${documentId.slice(0, 8)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="soft" size="sm" className="h-8 rounded-xl px-2.5 text-xs">
          <IconSend className="size-3.5" />
          {t("sendAck")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1.5rem)] max-h-[85vh] gap-4 overflow-y-auto p-5 sm:max-w-2xl sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <IconSend className="size-5 shrink-0 text-[var(--primary)]" />
            <span className="min-w-0 break-words">{t("sendAck")}</span>
          </DialogTitle>
          <DialogDescription className="break-words [overflow-wrap:anywhere]">{fileName}</DialogDescription>
        </DialogHeader>

        {noScope ? (
          <div className="flex items-start gap-2 rounded-2xl border border-[var(--warning)]/35 bg-[var(--warning-soft)] p-3 text-sm">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
            <span className="min-w-0 break-words">{t("forbiddenAudience")}</span>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="min-w-0 space-y-5">
            <p className="text-sm text-[var(--muted)]">{t("sendAckHint")}</p>

            {/* Kimlarga */}
            <fieldset className="min-w-0 space-y-2.5">
              <legend className="mb-2 text-[13px] font-semibold">{t("audience")}</legend>
              <div
                role="radiogroup"
                aria-label={t("audience")}
                className={cn("grid gap-1 rounded-2xl bg-[var(--surface-2)] p-1", isAny ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}
              >
                {modes.map((md) => (
                  <button
                    key={md}
                    type="button"
                    role="radio"
                    aria-checked={mode === md}
                    onClick={() => setMode(md)}
                    className={cn(
                      "min-h-9 rounded-xl px-2 py-1.5 text-xs font-semibold leading-tight transition-colors sm:text-sm",
                      mode === md
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-1)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {modeLabel[md]}
                  </button>
                ))}
              </div>

              {mode === "departments" && (
                <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-2xl border border-[var(--border)] p-2 sm:grid-cols-2">
                  {options.departments.map((d) => (
                    <label
                      key={d.id}
                      className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                    >
                      <input
                        type="checkbox"
                        className={CHECK}
                        checked={deptIds.includes(d.id)}
                        onChange={() => toggle(deptIds, setDeptIds, d.id)}
                      />
                      <span className="min-w-0 break-words">{d.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {mode === "positions" && (
                <div className="grid grid-cols-1 gap-1.5 rounded-2xl border border-[var(--border)] p-2 sm:grid-cols-2">
                  {options.positions.map((p) => (
                    <label
                      key={p}
                      className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                    >
                      <input
                        type="checkbox"
                        className={CHECK}
                        checked={positions.includes(p)}
                        onChange={() => toggle(positions, setPositions, p)}
                      />
                      <span className="min-w-0 break-words">{tr(`positions.${p}`)}</span>
                    </label>
                  ))}
                </div>
              )}

              {mode === "people" && (
                <div className="max-h-[45vh] overflow-y-auto rounded-2xl border border-[var(--border)] p-2 sm:p-3">
                  <EmployeePicker
                    people={options.people}
                    selectedIds={userIds}
                    onToggle={(id) => toggle(userIds, setUserIds, id)}
                    positionLabel={(p) => tr(`positions.${p}`)}
                  />
                </div>
              )}
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${idp}-deadline`}>{t("deadline")}</Label>
                <Input
                  id={`${idp}-deadline`}
                  type="date"
                  required
                  min={today}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${idp}-msg`}>{t("message")}</Label>
                <Textarea
                  id={`${idp}-msg`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={pending} className="w-full sm:w-auto">
                  {tr("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                {pending ? <IconLoader2 className="size-4 animate-spin" /> : <IconSend className="size-4" />}
                {t("sendAck")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
