"use client";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { uploadEmployeeDocument, deleteEmployeeDocument } from "@/server/actions/employees";
import { Trash2, Download } from "lucide-react";
import { formatDate } from "@/lib/dates";

type Doc = {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedAt: Date | string;
};

const TYPES = [
  "contract", "passport", "diploma", "medical", "certificate", "other",
] as const;

export function DocumentsTab({ userId, documents, canEdit }: { userId: string; documents: Doc[]; canEdit: boolean }) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [docType, setDocType] = useState<string>("contract");
  const [title, setTitle] = useState("");

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fileRef.current?.files?.[0];
    if (!f || !title) return;
    start(async () => {
      await uploadEmployeeDocument(userId, docType, title, f);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function onDelete(id: string) {
    if (!confirm(t("common.confirmDelete"))) return;
    start(async () => { await deleteEmployeeDocument(id); });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={onUpload} className="grid gap-3 md:grid-cols-4 items-end border rounded-lg p-4">
          <div className="space-y-1.5">
            <Label>{t("employees.docs.type")}</Label>
            <Select value={docType} onValueChange={setDocType} name="documentType">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("employees.docs.title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{t("employees.docs.file")}</Label>
            <div className="flex gap-2">
              <Input type="file" ref={fileRef} required />
              <Button type="submit" disabled={pending}>{t("employees.docs.upload")}</Button>
            </div>
          </div>
        </form>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("employees.docs.title")}</TableHead><TableHead>{t("employees.docs.type")}</TableHead>
            <TableHead>{t("common.size")}</TableHead><TableHead>{t("employees.docs.uploaded")}</TableHead><TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.title}</TableCell>
              <TableCell>{d.documentType}</TableCell>
              <TableCell>{d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : "—"}</TableCell>
              <TableCell>{formatDate(d.uploadedAt)}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon">
                  <a href={d.fileUrl}><Download className="size-4" /></a>
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(d.id)} disabled={pending}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted)] py-6">{t("employees.docs.noDocs")}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
