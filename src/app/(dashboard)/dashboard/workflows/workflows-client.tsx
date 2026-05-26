"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Play, Power, Loader2, History, Trash2, Pencil, Calendar, Zap,
  FileText, Star, Layers, Clock, FlaskConical, Tag, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  createWorkflow, updateWorkflow, toggleWorkflow, deleteWorkflow, runWorkflow,
  runDueWorkflows, listWorkflowRuns,
} from "@/server/workflows";
import { formatNumber } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

const TEMPLATES = [
  { id: "weekly_gbp",            label: "Weekly GBP post",            icon: Calendar, kind: "schedule" as const,
    desc: "Auto-draft a Google Business Profile post on a weekly cadence." },
  { id: "weekly_blog",           label: "Weekly blog post",           icon: FileText, kind: "schedule" as const,
    desc: "Auto-draft a full blog post from a rotating topic list, on a weekly cadence." },
  { id: "monthly_city_pages",    label: "Monthly city-page batch",    icon: Layers,   kind: "schedule" as const,
    desc: "Generate N city-targeted landing pages once per month." },
  { id: "stale_audit",           label: "Stale content audit",        icon: FileText, kind: "schedule" as const,
    desc: "Flag content older than N days as NEEDS_REVISION so the team can refresh it." },
  { id: "hourly_autopublish",    label: "Hourly auto-publish",        icon: Clock,    kind: "schedule" as const,
    desc: "Push SCHEDULED/APPROVED content past its scheduled time into PUBLISHED." },
  { id: "fill_meta",             label: "Auto-fill missing meta",     icon: Search,   kind: "schedule" as const,
    desc: "Scan content with empty meta title/description and generate them via AI." },
  { id: "archive_expired_offers",label: "Auto-archive expired offers",icon: Tag,      kind: "schedule" as const,
    desc: "Flip lease/finance offers to ARCHIVED status once their expiry date passes." },
  { id: "review_autoreply",      label: "Auto-reply 4–5★ reviews",    icon: Star,     kind: "event" as const,
    desc: "When a positive review is synced, draft a reply and auto-post it." },
  { id: "review_autoescalate",   label: "Auto-escalate 1–2★ reviews", icon: Star,     kind: "event" as const,
    desc: "When a low-star review is synced, draft a reply, flag, and notify (no auto-post)." },
] as const;
type TemplateId = (typeof TEMPLATES)[number]["id"];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type WorkflowDTO = {
  id: string;
  name: string;
  template: string;
  triggerKind: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: string | null;
  trigger: any;
  config: any;
  totalRuns: number;
  totalTokens: number;
};

// ─────────────────────────────────────────────────────────────
// Top-level new-workflow button (reusable from page header + empty state)
//
// NOTE: every component below is a *top-level named export*. Don't wrap
// them in a namespace object — across the RSC boundary, server components
// can only render client components that are named exports of a "use client"
// file. A wrapper object resolves to `undefined` and throws React #130.
// ─────────────────────────────────────────────────────────────

export function NewButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New workflow
      </Button>
      {open && <WorkflowFormDialog open mode="create" onOpenChange={setOpen} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────

export function List({ initial, role }: { initial: WorkflowDTO[]; role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [editing, setEditing]   = useState<WorkflowDTO | null>(null);
  const [dryRunOutput, setDryRunOutput] = useState<{ name: string; status: string; summary?: string; output?: any } | null>(null);

  function refresh() { router.refresh(); }

  function onToggle(id: string) {
    start(async () => {
      try { await toggleWorkflow(id); toast.success("Updated"); refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }
  function onRunNow(id: string) {
    start(async () => {
      const t = toast.loading("Running…");
      try {
        const r = await runWorkflow(id, "manual");
        if (r.status === "error") toast.error(r.error ?? "Workflow failed", { id: t });
        else if (r.status === "skipped") toast.info(r.summary ?? "Skipped", { id: t });
        else toast.success(r.summary ?? "Workflow ran", { id: t });
        refresh();
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }
  function onDryRun(w: WorkflowDTO) {
    start(async () => {
      const t = toast.loading("Running dry-run…");
      try {
        const r = await runWorkflow(w.id, "dryrun", { dryRun: true });
        if (r.status === "error") toast.error(r.error ?? "Dry-run failed", { id: t });
        else toast.success("Preview ready", { id: t });
        setDryRunOutput({ name: w.name, status: r.status, summary: r.summary, output: r.output });
        refresh();
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }
  function onDelete(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return;
    start(async () => {
      try { await deleteWorkflow(id); toast.success("Deleted"); refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }
  function onRunDue() {
    start(async () => {
      const t = toast.loading("Running due workflows…");
      try {
        const r = await runDueWorkflows();
        toast.success(`Ran ${r.ran} workflow${r.ran === 1 ? "" : "s"}`, { id: t });
        refresh();
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onRunDue} disabled={pending}>
          <Play className="h-3.5 w-3.5" /> Run due now
        </Button>
        <NewButton />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {initial.map((w) => {
          const tpl = TEMPLATES.find((t) => t.id === w.template as TemplateId);
          const Icon = tpl?.icon ?? Zap;
          return (
            <Card key={w.id} className={`transition-all ${w.enabled ? "" : "opacity-60"}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-md bg-brand-500/10 grid place-items-center text-brand-500 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{w.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{tpl?.label ?? w.template}</div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-accent text-muted-foreground" aria-label="Workflow actions">⋯</button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onRunNow(w.id)}><Play className="h-3.5 w-3.5" /> Run now</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onDryRun(w)}><FlaskConical className="h-3.5 w-3.5" /> Dry run (preview)</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEditing(w)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onToggle(w.id)}><Power className="h-3.5 w-3.5" /> {w.enabled ? "Disable" : "Enable"}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setHistoryId(w.id)}><History className="h-3.5 w-3.5" /> Run history</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500 focus:text-red-500" onSelect={() => onDelete(w.id, w.name)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={w.enabled ? "success" : "secondary"}>{w.enabled ? "enabled" : "paused"}</Badge>
                  <Badge variant={w.triggerKind === "event" ? "info" : "outline"}>{w.triggerKind === "event" ? "event-triggered" : describeSchedule(w.trigger)}</Badge>
                  {w.lastStatus && (
                    <Badge variant={w.lastStatus === "success" ? "success" : w.lastStatus === "error" ? "danger" : "warning"}>
                      last: {w.lastStatus}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t pt-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider">Last run</div>
                    <div className="text-foreground">{w.lastRunAt ? relativeTime(w.lastRunAt) : "never"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider">Next run</div>
                    <div className="text-foreground">
                      {w.triggerKind === "event"
                        ? "on event"
                        : (w.nextRunAt && w.enabled ? new Date(w.nextRunAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider">Activity</div>
                    <div className="text-foreground tabular-nums" title={`${w.totalTokens} tokens total`}>
                      {w.totalRuns} run{w.totalRuns === 1 ? "" : "s"} · ~{formatNumber(w.totalTokens)} tok
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={w.enabled} onCheckedChange={() => onToggle(w.id)} disabled={pending} />
                    <Label className="text-xs text-muted-foreground">{w.enabled ? "Active" : "Paused"}</Label>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onDryRun(w)} disabled={pending} title="Dry-run (preview only)">
                      <FlaskConical className="h-3.5 w-3.5" /> Dry
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRunNow(w.id)} disabled={pending}>
                      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {historyId && (
        <RunHistoryDrawer
          workflowId={historyId}
          onClose={() => setHistoryId(null)}
        />
      )}

      {editing && (
        <WorkflowFormDialog
          open
          mode="edit"
          initial={editing}
          onOpenChange={(v) => { if (!v) setEditing(null); }}
        />
      )}

      {dryRunOutput && (
        <DryRunDialog
          payload={dryRunOutput}
          onClose={() => setDryRunOutput(null)}
        />
      )}
    </div>
  );
}

function describeSchedule(t: any): string {
  if (!t?.cadence) return "schedule";
  if (t.cadence === "hourly") return `every hour at :${String(t.minute ?? 0).padStart(2, "0")}`;
  if (t.cadence === "daily") return `daily at ${formatTime(t.hour, t.minute)}`;
  if (t.cadence === "weekly") return `${DAYS[t.dayOfWeek ?? 1]} at ${formatTime(t.hour, t.minute)}`;
  if (t.cadence === "monthly") return `day ${t.dayOfMonth ?? 1} at ${formatTime(t.hour, t.minute)}`;
  return t.cadence;
}
function formatTime(h?: number, m?: number) {
  const hh = h ?? 9;
  const mm = String(m ?? 0).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const hh12 = ((hh + 11) % 12) + 1;
  return `${hh12}:${mm} ${ampm}`;
}

// ─────────────────────────────────────────────────────────────
// Run history drawer
// ─────────────────────────────────────────────────────────────

function RunHistoryDrawer({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
  const [runs, setRuns] = useState<any[] | null>(null);
  const [open, setOpen] = useState(true);

  useMemo(() => {
    listWorkflowRuns(workflowId, 30).then(setRuns).catch(() => setRuns([]));
  }, [workflowId]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Run history</DialogTitle>
          <DialogDescription>Last 30 runs for this workflow.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {runs === null && <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>}
          {runs && runs.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No runs yet.</div>}
          {runs && runs.map((r: any) => (
            <div key={r.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "success" ? "success" : r.status === "error" ? "danger" : "warning"}>{r.status}</Badge>
                  <span className="text-xs text-muted-foreground">{r.triggeredBy}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</span>
              </div>
              {r.summary && <div className="text-sm mt-1.5">{r.summary}</div>}
              {r.error && <div className="text-xs text-red-500 mt-1.5 font-mono">{r.error}</div>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// New-workflow dialog: template picker → fields
// ─────────────────────────────────────────────────────────────

/**
 * Unified create/edit dialog. In `create` mode you start at the template
 * picker; in `edit` mode you jump straight to the configured form for the
 * existing workflow's template.
 */
function WorkflowFormDialog({
  open, onOpenChange, mode, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: WorkflowDTO;
}) {
  const router = useRouter();
  const isEdit = mode === "edit" && !!initial;
  const [template, setTemplate] = useState<TemplateId | null>(
    isEdit ? (initial!.template as TemplateId) : null
  );
  const [name, setName] = useState(isEdit ? initial!.name : "");
  const [trigger, setTrigger] = useState<any>(isEdit ? initial!.trigger : {});
  const [config, setConfig] = useState<any>(isEdit ? initial!.config : {});
  const [pending, start] = useTransition();

  function pickTemplate(id: TemplateId) {
    const tpl = TEMPLATES.find((t) => t.id === id)!;
    setTemplate(id);
    setName(tpl.label);
    setTrigger(defaultTriggerFor(id));
    setConfig(defaultConfigFor(id));
  }

  function submit() {
    if (!template) return;
    start(async () => {
      const t = toast.loading(isEdit ? "Saving…" : "Creating workflow…");
      try {
        if (isEdit) {
          await updateWorkflow(initial!.id, { name, trigger, config });
          toast.success("Saved", { id: t });
        } else {
          await createWorkflow({ template, name, trigger, config });
          toast.success("Workflow created", { id: t });
        }
        onOpenChange(false);
        if (!isEdit) { setTemplate(null); setName(""); setTrigger({}); setConfig({}); }
        router.refresh();
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  const tplDef = template ? TEMPLATES.find((t) => t.id === template) : null;
  const titleText = isEdit
    ? `Edit: ${initial!.name}`
    : template ? `Configure: ${tplDef?.label}` : "Pick a workflow template";
  const descText = isEdit
    ? `Update the schedule or template-specific fields. Template (${tplDef?.label}) can't be changed — create a new workflow to switch.`
    : template ? "Tune the schedule and template-specific fields below."
                : "Start from a template — you can edit it any time.";

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v && !isEdit) { setTemplate(null); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{descText}</DialogDescription>
        </DialogHeader>

        {!template ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id} type="button" onClick={() => pickTemplate(t.id)}
                  className="text-left rounded-md border p-3 hover:border-brand-500 hover:bg-brand-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-7 w-7 rounded bg-brand-500/10 grid place-items-center text-brand-500"><Icon className="h-3.5 w-3.5" /></div>
                    <div className="font-medium text-sm">{t.label}</div>
                    <Badge variant={t.kind === "event" ? "info" : "outline"} className="ml-auto">{t.kind}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <ScheduleEditor template={template} trigger={trigger} setTrigger={setTrigger} />
            <ConfigEditor    template={template} config={config}   setConfig={setConfig} />
          </div>
        )}

        <DialogFooter>
          {template && !isEdit && <Button variant="ghost" onClick={() => setTemplate(null)}>Back</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {template && (
            <Button variant="gradient" onClick={submit} disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
              {isEdit ? "Save changes" : "Create workflow"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shows what a workflow's dry-run would have produced — title, summary,
 * and a readable rendering of the structured output (preview text, lists
 * of pages that would have been flagged/published, etc.).
 */
function DryRunDialog({ payload, onClose }: {
  payload: { name: string; status: string; summary?: string; output?: any };
  onClose: () => void;
}) {
  const o = payload.output ?? {};
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Dry-run preview · {payload.name}</DialogTitle>
          <DialogDescription>
            Nothing was created, flagged, or published. This is what the workflow <em>would</em> do if you ran it now.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-2">
            <Badge variant={payload.status === "success" ? "success" : payload.status === "error" ? "danger" : "warning"}>{payload.status}</Badge>
            <div className="text-sm">{payload.summary}</div>
          </div>

          {o.title && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</div>
              <div className="font-medium">{o.title}</div>
            </div>
          )}
          {Array.isArray(o.outline) && o.outline.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Outline</div>
              <ol className="text-sm list-decimal pl-5 space-y-0.5">{o.outline.map((h: string, i: number) => <li key={i}>{h}</li>)}</ol>
            </div>
          )}
          {o.preview && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Body preview</div>
              <pre className="text-xs whitespace-pre-wrap font-mono leading-snug">{o.preview}</pre>
            </div>
          )}
          {Array.isArray(o.flagged) && o.flagged.length > 0 && (
            <DryRunList label="Would flag as NEEDS_REVISION" rows={o.flagged} />
          )}
          {Array.isArray(o.wouldPublish) && o.wouldPublish.length > 0 && (
            <DryRunList label="Would publish" rows={o.wouldPublish} />
          )}
          {Array.isArray(o.wouldFill) && o.wouldFill.length > 0 && (
            <DryRunList label="Would fill meta tags" rows={o.wouldFill} />
          )}
          {Array.isArray(o.wouldArchive) && o.wouldArchive.length > 0 && (
            <DryRunList label="Would archive" rows={o.wouldArchive} render={(r) => r.headline} />
          )}
          {Array.isArray(o.cities) && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cities ({o.cityCount})</div>
              <div className="text-sm flex flex-wrap gap-1.5">{o.cities.map((c: string) => <Badge key={c} variant="secondary">{c}</Badge>)}</div>
            </div>
          )}
          {o.reply && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Draft reply</div>
              <pre className="text-xs whitespace-pre-wrap font-mono leading-snug">{o.reply}</pre>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DryRunList({ label, rows, render }: { label: string; rows: any[]; render?: (r: any) => React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label} ({rows.length})</div>
      <ul className="text-sm space-y-1">
        {rows.slice(0, 12).map((r, i) => (
          <li key={r.id ?? i} className="truncate">{render ? render(r) : (r.title ?? r.id ?? JSON.stringify(r))}</li>
        ))}
        {rows.length > 12 && <li className="text-xs text-muted-foreground">…+{rows.length - 12} more</li>}
      </ul>
    </div>
  );
}

function defaultTriggerFor(id: TemplateId): any {
  switch (id) {
    case "weekly_gbp":             return { cadence: "weekly",  dayOfWeek: 1, hour: 9, minute: 0 };
    case "weekly_blog":            return { cadence: "weekly",  dayOfWeek: 3, hour: 9, minute: 0 };
    case "monthly_city_pages":     return { cadence: "monthly", dayOfMonth: 1, hour: 6, minute: 0 };
    case "stale_audit":            return { cadence: "weekly",  dayOfWeek: 1, hour: 7, minute: 0 };
    case "hourly_autopublish":     return { cadence: "hourly",  minute: 0 };
    case "fill_meta":              return { cadence: "daily",   hour: 4, minute: 0 };
    case "archive_expired_offers": return { cadence: "daily",   hour: 2, minute: 0 };
    case "review_autoreply":       return { eventType: "review.synced", filter: { minRating: 4 } };
    case "review_autoescalate":    return { eventType: "review.synced", filter: { maxRating: 2 } };
  }
}
function defaultConfigFor(id: TemplateId): any {
  switch (id) {
    case "weekly_gbp": return {
      topicRotation: [
        "This week's featured service offer",
        "Why families choose us for trade-ins",
        "Behind the scenes in our service bay",
        "What's new in our showroom this week",
      ],
      tone: "friendly",
      cta: "Schedule today",
      autoPublish: false,
    };
    case "weekly_blog": return {
      topicRotation: [
        "What to check before a long road trip",
        "How to choose the right tire for your model",
        "Decoding your dashboard warning lights",
        "When to lease vs. finance — a practical guide",
      ],
      keyword: "automotive service",
      tone: "professional",
      structure: "article",
      audience: "general",
      wordCount: 1000,
      autoPublish: false,
    };
    case "monthly_city_pages": return {
      service: "Brake service", keyword: "brake service",
      cities: ["Atlanta", "Marietta", "Decatur"], state: "GA", publish: "draft",
    };
    case "stale_audit":            return { ageDays: 180, max: 20 };
    case "hourly_autopublish":     return {};
    case "fill_meta":              return { max: 25 };
    case "archive_expired_offers": return {};
    case "review_autoreply":       return { tone: "friendly",     autoPost: true };
    case "review_autoescalate":    return { tone: "professional", autoPost: false, escalate: true };
  }
}

// ─────────────────────────────────────────────────────────────
// Schedule + config editors (per template)
// ─────────────────────────────────────────────────────────────

function ScheduleEditor({ template, trigger, setTrigger }: { template: TemplateId; trigger: any; setTrigger: (t: any) => void }) {
  const tpl = TEMPLATES.find((t) => t.id === template)!;
  if (tpl.kind === "event") {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        Event-triggered — fires automatically when a matching {trigger.eventType ?? "event"} happens.
        {trigger.filter?.minRating != null && <div className="mt-1">Filter: rating ≥ <strong>{trigger.filter.minRating}</strong></div>}
        {trigger.filter?.maxRating != null && <div className="mt-1">Filter: rating ≤ <strong>{trigger.filter.maxRating}</strong></div>}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-md border p-3">
      <Label className="text-xs uppercase tracking-wider">Schedule</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Cadence</Label>
          <select
            value={trigger.cadence ?? "weekly"}
            onChange={(e) => setTrigger({ ...trigger, cadence: e.target.value })}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {trigger.cadence === "weekly" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Day of week</Label>
            <select
              value={trigger.dayOfWeek ?? 1}
              onChange={(e) => setTrigger({ ...trigger, dayOfWeek: Number(e.target.value) })}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
        )}
        {trigger.cadence === "monthly" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Day of month</Label>
            <Input
              type="number" min={1} max={28}
              value={trigger.dayOfMonth ?? 1}
              onChange={(e) => setTrigger({ ...trigger, dayOfMonth: Number(e.target.value) })}
            />
          </div>
        )}
        {(trigger.cadence === "daily" || trigger.cadence === "weekly" || trigger.cadence === "monthly") && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Hour (0–23)</Label>
              <Input type="number" min={0} max={23} value={trigger.hour ?? 9} onChange={(e) => setTrigger({ ...trigger, hour: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minute</Label>
              <Input type="number" min={0} max={59} value={trigger.minute ?? 0} onChange={(e) => setTrigger({ ...trigger, minute: Number(e.target.value) })} />
            </div>
          </>
        )}
        {trigger.cadence === "hourly" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Minute past the hour</Label>
            <Input type="number" min={0} max={59} value={trigger.minute ?? 0} onChange={(e) => setTrigger({ ...trigger, minute: Number(e.target.value) })} />
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigEditor({ template, config, setConfig }: { template: TemplateId; config: any; setConfig: (c: any) => void }) {
  if (template === "hourly_autopublish") {
    return <div className="text-xs text-muted-foreground">No additional configuration — publishes anything past its scheduled time.</div>;
  }
  if (template === "archive_expired_offers") {
    return <div className="text-xs text-muted-foreground">No additional configuration — flips offers with an expired <code>expiresAt</code> to ARCHIVED.</div>;
  }

  if (template === "weekly_blog") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <Label className="text-xs uppercase tracking-wider">Blog post</Label>
        <div className="space-y-1.5">
          <Label className="text-xs">Topic rotation (one per line)</Label>
          <Textarea rows={4} value={(config.topicRotation ?? []).join("\n")} onChange={(e) => setConfig({ ...config, topicRotation: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Primary keyword</Label>
            <Input value={config.keyword ?? ""} onChange={(e) => setConfig({ ...config, keyword: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Target words</Label>
            <select value={config.wordCount ?? 1000} onChange={(e) => setConfig({ ...config, wordCount: Number(e.target.value) })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {[500, 800, 1200, 1800].map((w) => <option key={w} value={w}>{w} words</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Structure</Label>
            <select value={config.structure ?? "article"} onChange={(e) => setConfig({ ...config, structure: e.target.value })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {["article","howto","listicle","comparison","news","faq"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Audience</Label>
            <select value={config.audience ?? "general"} onChange={(e) => setConfig({ ...config, audience: e.target.value })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {["general","family","luxury","performance","firsttime","fleet"].map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tone</Label>
            <select value={config.tone ?? "professional"} onChange={(e) => setConfig({ ...config, tone: e.target.value })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {["professional","friendly","luxury","energetic","trustworthy","authoritative"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Switch checked={!!config.autoPublish} onCheckedChange={(v) => setConfig({ ...config, autoPublish: v })} />
          <Label className="text-xs">Auto-publish (skip review)</Label>
        </div>
      </div>
    );
  }

  if (template === "fill_meta") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <Label className="text-xs uppercase tracking-wider">Meta-fill scan</Label>
        <div className="space-y-1.5">
          <Label className="text-xs">Max items per run</Label>
          <Input type="number" min={1} max={100} value={config.max ?? 25} onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })} />
        </div>
      </div>
    );
  }

  if (template === "weekly_gbp") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <Label className="text-xs uppercase tracking-wider">GBP post</Label>
        <div className="space-y-1.5">
          <Label className="text-xs">Topic rotation (one per line)</Label>
          <Textarea rows={4} value={(config.topicRotation ?? []).join("\n")} onChange={(e) => setConfig({ ...config, topicRotation: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tone</Label>
            <select value={config.tone ?? "friendly"} onChange={(e) => setConfig({ ...config, tone: e.target.value })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {["professional","friendly","luxury","energetic","trustworthy","authoritative"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CTA</Label>
            <Input value={config.cta ?? ""} onChange={(e) => setConfig({ ...config, cta: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Switch checked={!!config.autoPublish} onCheckedChange={(v) => setConfig({ ...config, autoPublish: v })} />
          <Label className="text-xs">Auto-publish (skip review)</Label>
        </div>
      </div>
    );
  }

  if (template === "monthly_city_pages") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <Label className="text-xs uppercase tracking-wider">City pages</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Service</Label><Input value={config.service ?? ""} onChange={(e) => setConfig({ ...config, service: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Primary keyword</Label><Input value={config.keyword ?? ""} onChange={(e) => setConfig({ ...config, keyword: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cities (one per line, max 25)</Label>
          <Textarea rows={4} value={(config.cities ?? []).join("\n")} onChange={(e) => setConfig({ ...config, cities: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={config.state ?? ""} onChange={(e) => setConfig({ ...config, state: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">Publish status</Label>
            <select value={config.publish ?? "draft"} onChange={(e) => setConfig({ ...config, publish: e.target.value })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              <option value="draft">Save as draft</option>
              <option value="live">Publish immediately</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (template === "stale_audit") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <Label className="text-xs uppercase tracking-wider">Stale audit</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Age threshold (days)</Label><Input type="number" min={30} value={config.ageDays ?? 180} onChange={(e) => setConfig({ ...config, ageDays: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Max items per run</Label><Input type="number" min={1} max={100} value={config.max ?? 20} onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })} /></div>
        </div>
      </div>
    );
  }

  if (template === "review_autoreply" || template === "review_autoescalate") {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <Label className="text-xs uppercase tracking-wider">Reply settings</Label>
        <div className="space-y-1.5">
          <Label className="text-xs">Tone</Label>
          <select value={config.tone ?? "friendly"} onChange={(e) => setConfig({ ...config, tone: e.target.value })} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
            {["professional","friendly","luxury","trustworthy","authoritative"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!config.autoPost} onCheckedChange={(v) => setConfig({ ...config, autoPost: v })} />
          <Label className="text-xs">Auto-post reply (skip approval)</Label>
        </div>
      </div>
    );
  }

  return null;
}

