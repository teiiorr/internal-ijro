"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { completeProjectWithRating } from "@/server/actions/projects";
import { cn } from "@/lib/utils";

export function CompleteProjectDialog({ projectId, externalCompanyId }: { projectId: string; externalCompanyId: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [score, setScore] = useState(5);
  const [notes, setNotes] = useState("");

  function onSubmit() {
    start(async () => {
      await completeProjectWithRating({ projectId, externalCompanyId, score, notes: notes || null });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Complete & rate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Complete project</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {externalCompanyId && (
            <div className="space-y-2">
              <p className="text-sm">Rate the contractor:</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setScore(n)} className="p-1" type="button">
                    <Star className={cn("size-6", n <= score ? "fill-[var(--warning)] text-[var(--warning)]" : "text-[var(--muted)]")} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button onClick={onSubmit} disabled={pending}>Complete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
