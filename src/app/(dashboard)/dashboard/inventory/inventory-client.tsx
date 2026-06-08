"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, X, Pencil, Trash2, Loader2, Download } from "lucide-react";
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
import {
  createInventoryItem, updateInventoryItem, deleteInventoryItem,
  previewInventoryFeed, importInventoryFeed,
} from "@/server/inventory";

export type Vehicle = {
  id: string;
  vin: string; year: number; make: string; model: string;
  trim: string | null; bodyStyle: string | null;
  exteriorColor: string | null; interiorColor: string | null;
  mileage: number | null; price: any; msrp: any;
  stockNumber: string | null; fuelType: string | null;
  transmission: string | null; drivetrain: string | null;
  imageUrl: string | null; status: string;
};

const STATUS_OPTIONS = [
  { id: "AVAILABLE", label: "Available", variant: "success" as const },
  { id: "ON_HOLD",   label: "On hold",   variant: "warning" as const },
  { id: "SOLD",      label: "Sold",      variant: "secondary" as const },
  { id: "ARCHIVED",  label: "Archived",  variant: "secondary" as const },
];

export function InventoryClient({ initial, role }: { initial: Vehicle[]; role: Role }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return initial.filter((v) => {
      if (statusFilter && v.status !== statusFilter) return false;
      if (!ql) return true;
      return (
        v.vin.toLowerCase().includes(ql) ||
        v.make.toLowerCase().includes(ql) ||
        v.model.toLowerCase().includes(ql) ||
        (v.trim ?? "").toLowerCase().includes(ql) ||
        (v.stockNumber ?? "").toLowerCase().includes(ql)
      );
    });
  }, [initial, q, statusFilter]);

  function onDelete(v: Vehicle) {
    if (!confirm(`Delete ${v.year} ${v.make} ${v.model} (VIN ${v.vin})?`)) return;
    start(async () => {
      try { await deleteInventoryItem(v.id); toast.success("Deleted"); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search VIN, make, model, stock #…" className="h-9 pl-8 pr-8" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm">
          <option value="">All status</option>
          {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {can(role, "content.update") && (
          <Button variant="outline" onClick={() => setImporting(true)}>
            <Download className="h-4 w-4" /> Import feed
          </Button>
        )}
        {can(role, "content.create") && (
          <Button variant="gradient" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add vehicle
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {initial.length} vehicles
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              {initial.length === 0
                ? "No inventory yet — click \"Add vehicle\" to start, or wire your dealer feed."
                : "No vehicles match these filters."}
            </CardContent>
          </Card>
        )}
        {filtered.map((v) => {
          const status = STATUS_OPTIONS.find((s) => s.id === v.status);
          return (
            <Card key={v.id} className="overflow-hidden group hover:shadow-md hover:border-brand-500/40 transition-all">
              <div className="aspect-video bg-muted relative">
                {v.imageUrl ? <img src={v.imageUrl} alt="" className="h-full w-full object-cover" /> : (
                  <div className="h-full grid place-items-center text-xs text-muted-foreground">{v.year} {v.make} {v.model}</div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute top-2 right-2 rounded-md bg-background/90 backdrop-blur p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(v)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                    {can(role, "content.delete") && (
                      <DropdownMenuItem className="text-red-500 focus:text-red-500" onSelect={() => onDelete(v)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="p-3 space-y-1">
                <div className="font-medium text-sm truncate">{v.year} {v.make} {v.model} {v.trim ?? ""}</div>
                <div className="text-xs text-muted-foreground truncate">VIN {v.vin} · {v.mileage?.toLocaleString() ?? 0} mi</div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold">{formatCurrency(v.price as any)}</span>
                  {status && <Badge variant={status.variant}>{status.label.toLowerCase()}</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(creating || editing) && (
        <VehicleDialog
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}

      {importing && (
        <ImportFeedDialog
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function ImportFeedDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [mode, setMode] = useState<"url" | "paste">("url");
  const [url, setUrl] = useState("");
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [pending, start] = useTransition();

  function input() {
    return mode === "url" ? { url } : { raw };
  }

  function onPreview() {
    start(async () => {
      const t = toast.loading("Fetching feed…");
      try {
        const p = await previewInventoryFeed(input());
        setPreview(p);
        toast.success(`Parsed ${p.parsable} vehicles`, { id: t });
      } catch (e: any) { toast.error(e?.message ?? "Failed", { id: t }); setPreview(null); }
    });
  }
  function onImport() {
    start(async () => {
      const t = toast.loading("Importing…");
      try {
        const r = await importInventoryFeed(input());
        toast.success(`Imported · ${r.added} added · ${r.updated} updated${r.errored ? ` · ${r.errored} errored` : ""}`, { id: t });
        onImported();
      } catch (e: any) { toast.error(e?.message ?? "Failed", { id: t }); }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import inventory feed</DialogTitle>
          <DialogDescription>Paste a JSON feed URL or the feed body itself. Upserts by VIN — existing vehicles get refreshed, new ones get added.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode("url"); setPreview(null); }}
              className={`flex-1 h-9 rounded-md border text-xs font-medium transition-colors ${mode === "url" ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "hover:border-brand-500/40"}`}
            >URL</button>
            <button
              type="button"
              onClick={() => { setMode("paste"); setPreview(null); }}
              className={`flex-1 h-9 rounded-md border text-xs font-medium transition-colors ${mode === "paste" ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "hover:border-brand-500/40"}`}
            >Paste JSON</button>
          </div>

          {mode === "url" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Feed URL</Label>
              <Input value={url} onChange={(e) => { setUrl(e.target.value); setPreview(null); }} placeholder="https://example.com/feed.json" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Paste JSON (either an array of vehicles, or {`{ "vehicles": [...] }`})</Label>
              <Textarea rows={8} value={raw} onChange={(e) => { setRaw(e.target.value); setPreview(null); }} className="font-mono text-xs" />
            </div>
          )}

          {preview && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <Stat label="Parsed"    value={preview.parsable} />
                <Stat label="Skipped"   value={preview.skipped} />
                <Stat label="To add"    value={preview.toAdd} tone="success" />
                <Stat label="To update" value={preview.toUpdate} tone="info" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">Sample (first 5)</div>
              <ul className="text-xs divide-y border-t">
                {preview.sample.map((s: any, i: number) => (
                  <li key={i} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="truncate">{s.year} {s.make} {s.model} {s.trim ?? ""}</span>
                    <span className="font-mono text-muted-foreground">{s.vin}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!preview ? (
            <Button variant="gradient" onClick={onPreview} disabled={pending || (mode === "url" ? !url : !raw)}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Preview
            </Button>
          ) : (
            <Button variant="gradient" onClick={onImport} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Import {preview.parsable} vehicles
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "info" }) {
  const color = tone === "success" ? "text-brand-600" : tone === "info" ? "text-blue-500" : "text-foreground";
  return (
    <div className="rounded border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function VehicleDialog({ initial, onClose, onSaved }: {
  initial: Vehicle | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<any>(initial ?? {
    vin: "", year: new Date().getFullYear(), make: "", model: "", trim: "",
    bodyStyle: "", exteriorColor: "", interiorColor: "",
    mileage: 0, price: 0, msrp: 0, stockNumber: "",
    fuelType: "", transmission: "", drivetrain: "", imageUrl: "", status: "AVAILABLE",
  });
  const [pending, start] = useTransition();

  function set<K extends keyof typeof v>(k: K, val: any) { setV((cur: any) => ({ ...cur, [k]: val })); }

  function save() {
    start(async () => {
      const t = toast.loading(initial ? "Saving…" : "Adding vehicle…");
      try {
        // Strip empty strings (Prisma rejects them on number columns).
        const data: any = {};
        for (const [k, val] of Object.entries(v)) {
          if (val === "" || val === null || val === undefined) continue;
          if (["year", "mileage", "price", "msrp"].includes(k)) data[k] = Number(val);
          else data[k] = val;
        }
        if (initial) await updateInventoryItem(initial.id, data);
        else await createInventoryItem(data);
        toast.success(initial ? "Saved" : "Added", { id: t });
        onSaved();
      } catch (e: any) { toast.error(e?.message ?? "Failed", { id: t }); }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>{initial ? `VIN ${initial.vin}` : "Add a vehicle to your dealership's inventory."}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <Field label="VIN"><Input value={v.vin} onChange={(e) => set("vin", e.target.value.toUpperCase())} disabled={!!initial} /></Field>
          <Field label="Stock #"><Input value={v.stockNumber ?? ""} onChange={(e) => set("stockNumber", e.target.value)} /></Field>
          <Field label="Year"><Input type="number" min={1980} max={2100} value={v.year} onChange={(e) => set("year", Number(e.target.value))} /></Field>
          <Field label="Make"><Input value={v.make} onChange={(e) => set("make", e.target.value)} /></Field>
          <Field label="Model"><Input value={v.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Trim"><Input value={v.trim ?? ""} onChange={(e) => set("trim", e.target.value)} /></Field>
          <Field label="Body style"><Input value={v.bodyStyle ?? ""} onChange={(e) => set("bodyStyle", e.target.value)} placeholder="Sedan / SUV / …" /></Field>
          <Field label="Mileage"><Input type="number" min={0} value={v.mileage ?? 0} onChange={(e) => set("mileage", Number(e.target.value))} /></Field>
          <Field label="Price ($)"><Input type="number" min={0} value={v.price ?? 0} onChange={(e) => set("price", Number(e.target.value))} /></Field>
          <Field label="MSRP ($)"><Input type="number" min={0} value={v.msrp ?? 0} onChange={(e) => set("msrp", Number(e.target.value))} /></Field>
          <Field label="Exterior color"><Input value={v.exteriorColor ?? ""} onChange={(e) => set("exteriorColor", e.target.value)} /></Field>
          <Field label="Interior color"><Input value={v.interiorColor ?? ""} onChange={(e) => set("interiorColor", e.target.value)} /></Field>
          <Field label="Fuel type"><Input value={v.fuelType ?? ""} onChange={(e) => set("fuelType", e.target.value)} /></Field>
          <Field label="Transmission"><Input value={v.transmission ?? ""} onChange={(e) => set("transmission", e.target.value)} /></Field>
          <Field label="Drivetrain"><Input value={v.drivetrain ?? ""} onChange={(e) => set("drivetrain", e.target.value)} placeholder="AWD / FWD / RWD / 4WD" /></Field>
          <Field label="Status">
            <select value={v.status} onChange={(e) => set("status", e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Image URL"><Input value={v.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={save} disabled={pending || !v.vin || !v.make || !v.model}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {initial ? "Save changes" : "Add vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
