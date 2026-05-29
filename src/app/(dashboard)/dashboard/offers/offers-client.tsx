"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { can } from "@/lib/rbac";
import { createOffer, updateOffer, deleteOffer } from "@/server/offers";

export type OfferRow = {
  id: string;
  headline: string; subheadline: string | null;
  detail: string | null;
  ctaLabel: string | null; ctaUrl: string | null;
  imageUrl: string | null;
  startsAt: string | null; expiresAt: string | null;
  oemBrand: string | null; model: string | null;
  monthlyPayment: any; apr: any; termMonths: number | null;
  disclaimer: string | null; status: string;
};

export function OffersClient({ initial, role }: { initial: OfferRow[]; role: Role }) {
  const router = useRouter();
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();

  function onDelete(o: OfferRow) {
    if (!confirm(`Delete offer "${o.headline}"?`)) return;
    start(async () => {
      try { await deleteOffer(o.id); toast.success("Deleted"); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can(role, "content.create") && (
          <Button variant="gradient" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New offer
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {initial.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No offers yet. Click "New offer" to create one — it'll surface on the public site immediately.
            </CardContent>
          </Card>
        )}
        {initial.map((o) => {
          const archived = o.status === "ARCHIVED";
          const expired = o.expiresAt && new Date(o.expiresAt) < new Date();
          return (
            <Card key={o.id} className={`group hover:shadow-md hover:border-brand-500/40 transition-all ${archived ? "opacity-60" : ""}`}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase font-semibold text-brand-500">{o.oemBrand ?? "Offer"}</div>
                  <div className="flex items-center gap-2">
                    {archived
                      ? <Badge variant="secondary">archived</Badge>
                      : expired
                        ? <Badge variant="warning">expired</Badge>
                        : <Badge variant="success">active</Badge>}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-accent text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Offer actions">⋯</button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(o)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                        {can(role, "content.delete") && (
                          <DropdownMenuItem className="text-red-500 focus:text-red-500" onSelect={() => onDelete(o)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="font-semibold">{o.headline}</div>
                {o.subheadline && <p className="text-sm text-muted-foreground">{o.subheadline}</p>}
                <div className="flex items-center gap-3 text-sm pt-2">
                  {o.monthlyPayment && <span>{formatCurrency(o.monthlyPayment as any)}/mo</span>}
                  {o.termMonths && <span className="text-muted-foreground">{o.termMonths} mo</span>}
                  {o.apr && <span className="text-muted-foreground">{Number(o.apr)}% APR</span>}
                </div>
                {o.expiresAt && (
                  <div className="text-[11px] text-muted-foreground">
                    Expires {new Date(o.expiresAt).toLocaleDateString()}
                  </div>
                )}
                {o.disclaimer && <p className="text-[10px] text-muted-foreground pt-2 border-t">{o.disclaimer}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(creating || editing) && (
        <OfferDialog
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function OfferDialog({ initial, onClose, onSaved }: {
  initial: OfferRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [o, setO] = useState<any>(initial ?? {
    headline: "", subheadline: "", detail: "",
    ctaLabel: "", ctaUrl: "", imageUrl: "",
    startsAt: "", expiresAt: "",
    oemBrand: "", model: "",
    monthlyPayment: 0, apr: 0, termMonths: 36,
    disclaimer: "", status: "ACTIVE",
  });
  const [pending, start] = useTransition();

  function set<K extends keyof typeof o>(k: K, val: any) { setO((c: any) => ({ ...c, [k]: val })); }

  function toDateInput(s: string | null | undefined) {
    if (!s) return "";
    try { return new Date(s).toISOString().slice(0, 10); } catch { return ""; }
  }

  function save() {
    start(async () => {
      const t = toast.loading(initial ? "Saving…" : "Creating offer…");
      try {
        const data: any = {};
        for (const [k, val] of Object.entries(o)) {
          if (val === "" || val === null || val === undefined) continue;
          if (["monthlyPayment", "apr", "termMonths"].includes(k)) data[k] = Number(val);
          else data[k] = val;
        }
        if (initial) await updateOffer(initial.id, data);
        else await createOffer(data);
        toast.success(initial ? "Saved" : "Created", { id: t });
        onSaved();
      } catch (e: any) { toast.error(e?.message ?? "Failed", { id: t }); }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit offer" : "New offer"}</DialogTitle>
          <DialogDescription>{initial ? "Update offer details. Changes go live immediately on the public site." : "Create a lease or finance offer for this dealership."}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="col-span-2"><Field label="Headline"><Input value={o.headline} onChange={(e) => set("headline", e.target.value)} placeholder="e.g. $299/mo Lease on 2025 BMW 330i" /></Field></div>
          <div className="col-span-2"><Field label="Subheadline"><Input value={o.subheadline ?? ""} onChange={(e) => set("subheadline", e.target.value)} /></Field></div>
          <Field label="OEM brand"><Input value={o.oemBrand ?? ""} onChange={(e) => set("oemBrand", e.target.value)} placeholder="BMW / Toyota / …" /></Field>
          <Field label="Model"><Input value={o.model ?? ""} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Monthly payment ($)"><Input type="number" min={0} value={o.monthlyPayment ?? 0} onChange={(e) => set("monthlyPayment", Number(e.target.value))} /></Field>
          <Field label="Term (months)"><Input type="number" min={1} value={o.termMonths ?? 36} onChange={(e) => set("termMonths", Number(e.target.value))} /></Field>
          <Field label="APR (%)"><Input type="number" min={0} step={0.1} value={o.apr ?? 0} onChange={(e) => set("apr", Number(e.target.value))} /></Field>
          <Field label="Status">
            <select value={o.status} onChange={(e) => set("status", e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
          <Field label="Starts"><Input type="date" value={toDateInput(o.startsAt)} onChange={(e) => set("startsAt", e.target.value)} /></Field>
          <Field label="Expires"><Input type="date" value={toDateInput(o.expiresAt)} onChange={(e) => set("expiresAt", e.target.value)} /></Field>
          <Field label="CTA label"><Input value={o.ctaLabel ?? ""} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Reserve yours" /></Field>
          <Field label="CTA URL"><Input value={o.ctaUrl ?? ""} onChange={(e) => set("ctaUrl", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Image URL"><Input value={o.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Disclaimer"><Textarea rows={3} value={o.disclaimer ?? ""} onChange={(e) => set("disclaimer", e.target.value)} placeholder="Required disclosures, leasing terms, residency restrictions, etc." /></Field></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={save} disabled={pending || !o.headline}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {initial ? "Save changes" : "Create offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
