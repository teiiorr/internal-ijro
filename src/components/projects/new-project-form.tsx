"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject } from "@/server/actions/projects";

type Company = { id: string; name: string };
type User = { id: string; fullName: string };

export function NewProjectForm({ companies, curators }: { companies: Company[]; curators: User[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<"internal" | "external">("internal");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const res = await createProject({
          name: String(fd.get("name") ?? ""),
          description: (fd.get("description") as string) || null,
          type,
          externalCompanyId: type === "external" ? ((fd.get("externalCompanyId") as string) || null) : null,
          curatorUserId: (fd.get("curatorUserId") as string) || null,
          startDate: (fd.get("startDate") as string) || null,
          deadline: (fd.get("deadline") as string) || null,
          budget: fd.get("budget") ? Number(fd.get("budget")) : null,
          budgetCurrency: String(fd.get("budgetCurrency") ?? "UZS"),
        });
        router.push(`/projects/${res.id}`);
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="external">External (with contractor)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "external" && (
          <div className="space-y-1.5">
            <Label>Contractor company</Label>
            <Select name="externalCompanyId">
              <SelectTrigger><SelectValue placeholder="Pick approved contractor" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Curator</Label>
          <Select name="curatorUserId">
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {curators.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline">Deadline</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="budget">Budget</Label>
          <div className="flex gap-2">
            <Input id="budget" name="budget" type="number" step="0.01" />
            <Input name="budgetCurrency" defaultValue="UZS" className="w-24" />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <Button type="submit" disabled={pending}>Create project</Button>
    </form>
  );
}
