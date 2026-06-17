"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { createDepartment, updateDepartment, deleteDepartment } from "@/server/actions/departments";

type Dept = {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
  headFullName: string | null;
  memberCount: number;
};
type Manager = { id: string; fullName: string };

export function DepartmentsManager({ departments, managers }: { departments: Dept[]; managers: Manager[] }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>, id: string | "new") {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      nameRu: (fd.get("nameRu") as string) || null,
      nameEn: (fd.get("nameEn") as string) || null,
      nameUzLatn: (fd.get("nameUzLatn") as string) || null,
      nameUzCyrl: (fd.get("nameUzCyrl") as string) || null,
      description: (fd.get("description") as string) || null,
      parentDepartmentId: (fd.get("parentDepartmentId") as string) || null,
      headUserId: (fd.get("headUserId") as string) || null,
    };
    start(async () => {
      if (id === "new") await createDepartment(payload);
      else await updateDepartment(id, payload);
      setEditing(null);
    });
  }

  function onDelete(id: string) {
    if (!confirm(t("common.confirmDelete"))) return;
    start(async () => { await deleteDepartment(id); });
  }

  const Form = ({ id, initial }: { id: string | "new"; initial?: Partial<Dept> }) => (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={(e) => onSubmit(e, id)} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t("departments.fields.name")}</Label>
            <Input name="name" required defaultValue={initial?.name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("departments.fields.head")}</Label>
            <Select name="headUserId" defaultValue={initial?.headUserId ?? undefined}>
              <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("departments.fields.parent")}</Label>
            <Select name="parentDepartmentId" defaultValue={initial?.parentDepartmentId ?? undefined}>
              <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {departments
                  .filter((d) => d.id !== initial?.id)
                  .map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("departments.fields.nameRu")}</Label>
            <Input name="nameRu" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("departments.fields.nameEn")}</Label>
            <Input name="nameEn" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("departments.fields.nameUzLatn")}</Label>
            <Input name="nameUzLatn" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("departments.fields.nameUzCyrl")}</Label>
            <Input name="nameUzCyrl" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t("departments.fields.description")}</Label>
            <Textarea name="description" rows={2} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={pending}>{t("common.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}><X className="size-4" /> {t("common.cancel")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {editing === "new" ? null : (
          <Button onClick={() => setEditing("new")}><Plus className="size-4" /> {t("departments.addBtn")}</Button>
        )}
      </div>
      {editing === "new" && <Form id="new" />}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>{t("departments.table.name")}</TableHead><TableHead>{t("departments.table.head")}</TableHead><TableHead>{t("departments.table.members")}</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.headFullName ?? "—"}</TableCell>
                  <TableCell>{d.memberCount}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(d.id)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(d.id)}><Trash2 className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-[var(--muted)] py-6">{t("departments.empty")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && editing !== "new" && (
        <Form id={editing} initial={departments.find((d) => d.id === editing) ?? undefined} />
      )}
    </div>
  );
}
