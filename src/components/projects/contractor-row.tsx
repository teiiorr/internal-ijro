"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { approveContractor, rejectContractor } from "@/server/actions/projects";

type C = { id: string; name: string; contactPerson: string | null; contactEmail: string | null; status: string; rating: string | null };

export function ContractorRow({ c }: { c: C }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="border rounded-lg p-3 flex items-start justify-between flex-wrap gap-3">
      <div>
        <p className="font-medium">{c.name}</p>
        <p className="text-xs text-[var(--muted)]">{c.contactPerson} · {c.contactEmail}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={c.status === "approved" ? "success" : c.status === "rejected" ? "danger" : "warning"}>{c.status}</Badge>
        {c.rating && <Badge variant="secondary">⭐ {c.rating}</Badge>}
        {c.status === "pending" && (
          <>
            <Button size="sm" disabled={pending} onClick={() => start(async () => { await approveContractor(c.id); })}>Approve</Button>
            {showReject ? (
              <>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-9 w-40" />
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { await rejectContractor(c.id, reason); setShowReject(false); })}>Reject</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>Reject</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
