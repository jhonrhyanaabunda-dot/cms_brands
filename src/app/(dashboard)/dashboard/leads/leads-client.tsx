"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, X, Phone, Mail, Trash2, Loader2, ChevronRight, MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Role } from "@/lib/types";
import { can } from "@/lib/rbac";
import { relativeTime, cn } from "@/lib/utils";
import { updateLeadStatus, updateLeadNotes, deleteLead } from "@/server/leads";

export type LeadRow = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  vehicleInterest: string | null;
  message: string | null;
  source: string | null;
  notes: string | null;
  createdAt: string;
};

const STATUS = [
  { id: "new",       label: "New",       variant: "info"      as const },
  { id: "contacted", label: "Contacted", variant: "warning"   as const },
  { id: "qualified", label: "Qualified", variant: "brand"     as const },
  { id: "converted", label: "Converted", variant: "success"   as const },
  { id: "archived",  label: "Archived",  variant: "secondary" as const },
];
const KIND_LABEL: Record<string, string> = {
  contact:   "Contact",
  testdrive: "Test drive",
  finance:   "Finance",
};
const STATUS_TABS: { id: string; label: string }[] = [
  { id: "open",      label: "Open" },       // new + contacted + qualified
  { id: "all",       label: "All" },
  { id: "new",       label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "converted", label: "Converted" },
  { id: "archived",  label: "Archived" },
];

export function LeadsClient({ initial, role }: { initial: LeadRow[]; role: Role }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("open");
  const [kindFilter, setKindFilter] = useState("");
  const [opened, setOpened] = useState<LeadRow | null>(null);
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initial.length, open: 0 };
    for (const s of STATUS) c[s.id] = 0;
    for (const l of initial) {
      c[l.status] = (c[l.status] ?? 0) + 1;
      if (l.status === "new" || l.status === "contacted" || l.status === "qualified") c.open++;
    }
    return c;
  }, [initial]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return initial.filter((l) => {
      if (kindFilter && l.kind !== kindFilter) return false;
      if (tab === "open") {
        if (!["new", "contacted", "qualified"].includes(l.status)) return false;
      } else if (tab !== "all") {
        if (l.status !== tab) return false;
      }
      if (!ql) return true;
      return (
        l.name.toLowerCase().includes(ql) ||
        l.email.toLowerCase().includes(ql) ||
        (l.phone ?? "").toLowerCase().includes(ql) ||
        (l.vehicleInterest ?? "").toLowerCase().includes(ql) ||
        (l.message ?? "").toLowerCase().includes(ql)
      );
    });
  }, [initial, q, tab, kindFilter]);

  function onStatus(l: LeadRow, status: string) {
    if (l.status === status) return;
    start(async () => {
      try { await updateLeadStatus(l.id, status as any); toast.success(`${l.name} → ${status}`); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }
  function onDelete(l: LeadRow) {
    if (!confirm(`Delete lead from ${l.name}?`)) return;
    start(async () => {
      try { await deleteLead(l.id); toast.success("Deleted"); setOpened(null); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const active = t.id === tab;
          const count = counts[t.id] ?? 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors",
                active && "text-foreground"
              )}
            >
              {t.label}
              <span className={cn(
                "ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                active ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : "bg-muted"
              )}>
                {count}
              </span>
              {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-brand-500 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, message…" className="h-9 pl-8 pr-8" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm">
          <option value="">All kinds</option>
          {Object.entries(KIND_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} of {initial.length} leads</div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No leads match these filters.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((l) => {
                const status = STATUS.find((s) => s.id === l.status) ?? STATUS[0];
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setOpened(l)}
                      className="w-full px-4 py-3 grid grid-cols-12 items-center gap-2 text-left hover:bg-accent/40 transition-colors"
                    >
                      <div className="col-span-5 sm:col-span-4 min-w-0">
                        <div className="font-medium truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{l.email}{l.phone && ` · ${l.phone}`}</div>
                      </div>
                      <div className="col-span-3 sm:col-span-2"><Badge variant="secondary">{KIND_LABEL[l.kind] ?? l.kind}</Badge></div>
                      <div className="col-span-3 sm:col-span-3 min-w-0 hidden sm:block">
                        <div className="text-xs text-muted-foreground truncate">{l.vehicleInterest || l.message || l.source}</div>
                      </div>
                      <div className="col-span-3 sm:col-span-2"><Badge variant={status.variant}>{status.label.toLowerCase()}</Badge></div>
                      <div className="col-span-1 text-right text-xs text-muted-foreground">{relativeTime(l.createdAt)}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {opened && (
        <LeadDetail
          lead={opened}
          role={role}
          onClose={() => setOpened(null)}
          onStatus={(s) => onStatus(opened, s)}
          onDelete={() => onDelete(opened)}
          pending={pending}
        />
      )}
    </div>
  );
}

function LeadDetail({ lead, role, onClose, onStatus, onDelete, pending }: {
  lead: LeadRow;
  role: Role;
  onClose: () => void;
  onStatus: (s: string) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savingNotes, startNotes] = useTransition();

  function saveNotes() {
    startNotes(async () => {
      try { await updateLeadNotes(lead.id, notes); toast.success("Notes saved"); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.name}
            <Badge variant="secondary">{KIND_LABEL[lead.kind] ?? lead.kind}</Badge>
          </DialogTitle>
          <DialogDescription>
            Submitted {relativeTime(lead.createdAt)}{lead.source && ` from ${lead.source}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 rounded-md border p-2.5 hover:border-brand-500 transition-colors">
              <Mail className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{lead.email}</span>
            </a>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 rounded-md border p-2.5 hover:border-brand-500 transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{lead.phone}</span>
              </a>
            )}
          </div>
          {lead.vehicleInterest && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Vehicle of interest</div>
              <div className="text-sm">{lead.vehicleInterest}</div>
            </div>
          )}
          {lead.message && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Message</div>
              <div className="text-sm whitespace-pre-wrap">{lead.message}</div>
            </div>
          )}

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onStatus(s.id)}
                  disabled={pending}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    lead.status === s.id
                      ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "hover:border-brand-500/40 text-muted-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><MessageSquare className="h-3 w-3" /> Internal notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sales follow-up notes (visible only to your team)…" />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save notes
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          {can(role, "reviews.manage") && (
            <Button variant="ghost" className="text-red-500 hover:!text-red-500" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
