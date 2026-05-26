"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Trash2, CheckCircle2, Archive, Calendar, ArrowUpDown,
  Copy, MoreHorizontal, X, ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn, relativeTime } from "@/lib/utils";
import type { Role, WorkflowStatus, ContentType } from "@/lib/types";
import { can } from "@/lib/rbac";
import {
  bulkTransitionStatus, bulkSchedule, bulkDelete, duplicateContent,
} from "@/server/content";

const STATUS_VARIANT: Record<string, "secondary" | "success" | "info" | "warning" | "danger"> = {
  DRAFT: "secondary",
  IN_REVIEW: "info",
  NEEDS_REVISION: "warning",
  APPROVED: "info",
  SCHEDULED: "info",
  PUBLISHED: "success",
  ARCHIVED: "secondary",
};

const TYPE_OPTIONS: ContentType[] = [
  "BLOG", "LANDING_PAGE", "CITY_PAGE", "DEALER_PAGE", "OEM_PAGE", "GBP_POST",
  "FAQ", "SERVICE_PAGE", "MODEL_RESEARCH", "COMPARE_PAGE", "TRADE_IN_PAGE",
  "FINANCE_PAGE", "OFFER",
];

const VIEW_TABS: { id: string; label: string; statuses?: WorkflowStatus[] }[] = [
  { id: "all",       label: "All" },
  { id: "drafts",    label: "Drafts",      statuses: ["DRAFT", "NEEDS_REVISION"] },
  { id: "review",    label: "In review",   statuses: ["IN_REVIEW"] },
  { id: "scheduled", label: "Scheduled",   statuses: ["APPROVED", "SCHEDULED"] },
  { id: "published", label: "Published",   statuses: ["PUBLISHED"] },
  { id: "archived",  label: "Archived",    statuses: ["ARCHIVED"] },
];

export type ContentRow = {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  status: WorkflowStatus;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  aiGenerated: boolean;
  authorName: string | null;
};

type SortKey = "title" | "type" | "status" | "updatedAt";

export function ContentListClient({ initialItems, role }: { initialItems: ContentRow[]; role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  // URL-synced filter state
  const view = params.get("view") ?? "all";
  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const sortKey = (params.get("sort") as SortKey | null) ?? "updatedAt";
  const sortDir = (params.get("dir") as "asc" | "desc" | null) ?? "desc";

  const [searchInput, setSearchInput] = useState(q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleWhen, setScheduleWhen] = useState("");

  function patchUrl(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const viewDef = VIEW_TABS.find((t) => t.id === view) ?? VIEW_TABS[0];
  const visible = useMemo(() => {
    const wanted = viewDef.statuses;
    let rows = initialItems.filter((r) => {
      if (wanted && !wanted.includes(r.status)) return false;
      if (type && r.type !== type) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      const ord = (av ?? "") < (bv ?? "") ? -1 : 1;
      return sortDir === "asc" ? ord : -ord;
    });
    return rows;
  }, [initialItems, viewDef, type, q, sortKey, sortDir]);

  // Counts by view tab (recomputed from initialItems so they stay accurate
  // regardless of the type/search filters).
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialItems.length };
    for (const t of VIEW_TABS) {
      if (t.id === "all" || !t.statuses) continue;
      counts[t.id] = initialItems.filter((r) => t.statuses!.includes(r.status)).length;
    }
    return counts;
  }, [initialItems]);

  function toggleAll() {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function clearSelection() { setSelected(new Set()); }

  function runBulk(action: () => Promise<{ count: number } | void>, successLabel: string) {
    start(async () => {
      try {
        const r = await action();
        toast.success(`${successLabel}${r && typeof r === "object" && "count" in r ? ` · ${r.count}` : ""}`);
        clearSelection();
        router.refresh();
      } catch (e: any) { toast.error(e.message ?? "Action failed"); }
    });
  }

  function sortBy(key: SortKey) {
    const sameKey = sortKey === key;
    patchUrl({
      sort: key === "updatedAt" && sortDir === "desc" && !sameKey ? null : key,
      dir: sameKey ? (sortDir === "asc" ? "desc" : "asc") : (key === "updatedAt" ? "desc" : "asc"),
    });
  }

  const selectionCount = selected.size;
  const allChecked = visible.length > 0 && selected.size === visible.length;

  return (
    <div className="space-y-4">
      {/* View tabs */}
      <div className="flex items-center gap-1 border-b overflow-x-auto">
        {VIEW_TABS.map((t) => {
          const active = t.id === view;
          return (
            <button
              key={t.id}
              onClick={() => { patchUrl({ view: t.id === "all" ? null : t.id }); clearSelection(); }}
              className={cn(
                "relative px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                active && "text-foreground"
              )}
            >
              <span>{t.label}</span>
              {tabCounts[t.id] != null && (
                <span className={cn(
                  "ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : "bg-muted"
                )}>
                  {tabCounts[t.id]}
                </span>
              )}
              {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-brand-500 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-3">
        <form
          className="flex flex-wrap gap-2 items-center"
          onSubmit={(e) => { e.preventDefault(); patchUrl({ q: searchInput || null }); }}
        >
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title…"
              className="h-9 pl-8 pr-8"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); patchUrl({ q: null }); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={type}
            onChange={(e) => patchUrl({ type: e.target.value || null })}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ").toLowerCase()}</option>
            ))}
          </select>
          {(q || type || view !== "all" || sortKey !== "updatedAt" || sortDir !== "desc") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setSearchInput(""); router.replace(pathname, { scroll: false }); }}
            >
              <X className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </Card>

      {/* Bulk action bar */}
      {selectionCount > 0 && (
        <div className="sticky top-[68px] z-10 rounded-md border bg-brand-500/10 px-3 py-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{selectionCount} selected</span>
          <Button size="sm" variant="ghost" onClick={clearSelection}><X className="h-3.5 w-3.5" /> Clear</Button>
          <div className="flex-1" />
          {can(role, "content.publish") && (
            <Button
              size="sm" variant="outline" disabled={pending}
              onClick={() => runBulk(() => bulkTransitionStatus(Array.from(selected), "PUBLISHED"), "Published")}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Publish
            </Button>
          )}
          {can(role, "content.update") && (
            <Button
              size="sm" variant="outline" disabled={pending}
              onClick={() => setScheduleOpen(true)}
            >
              <Calendar className="h-3.5 w-3.5" /> Schedule…
            </Button>
          )}
          {can(role, "content.update") && (
            <Button
              size="sm" variant="outline" disabled={pending}
              onClick={() => runBulk(() => bulkTransitionStatus(Array.from(selected), "ARCHIVED"), "Archived")}
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
          )}
          {can(role, "content.delete") && (
            <Button
              size="sm" variant="outline" disabled={pending}
              className="text-red-500 hover:!text-red-500 hover:!border-red-500"
              onClick={() => {
                if (!confirm(`Delete ${selectionCount} item${selectionCount === 1 ? "" : "s"}? This cannot be undone.`)) return;
                runBulk(() => bulkDelete(Array.from(selected)), "Deleted");
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[36px_1fr_140px_140px_140px_40px] px-4 py-2 text-xs text-muted-foreground border-b uppercase tracking-wider items-center">
          <div>
            <Checkbox checked={allChecked} indeterminate={selectionCount > 0 && !allChecked} onChange={toggleAll} aria-label="Select all" />
          </div>
          <SortHeader label="Title"   active={sortKey === "title"}     dir={sortDir} onClick={() => sortBy("title")} />
          <SortHeader label="Type"    active={sortKey === "type"}      dir={sortDir} onClick={() => sortBy("type")} />
          <SortHeader label="Status"  active={sortKey === "status"}    dir={sortDir} onClick={() => sortBy("status")} />
          <SortHeader label="Updated" active={sortKey === "updatedAt"} dir={sortDir} onClick={() => sortBy("updatedAt")} className="text-right" />
          <div />
        </div>

        {visible.length === 0 ? (
          <EmptyState hasFilters={!!(q || type || view !== "all")} />
        ) : (
          <ul className="divide-y">
            {visible.map((c) => {
              const checked = selected.has(c.id);
              return (
                <li
                  key={c.id}
                  className={cn(
                    "grid grid-cols-[36px_1fr_140px_140px_140px_40px] items-center px-4 py-3 group hover:bg-accent/40 transition-colors",
                    checked && "bg-brand-500/5"
                  )}
                >
                  <div>
                    <Checkbox checked={checked} onChange={() => toggleOne(c.id)} aria-label={`Select ${c.title}`} />
                  </div>
                  <Link href={`/dashboard/content/${c.id}`} className="min-w-0 block">
                    <div className="font-medium truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      /{c.slug}
                      {c.aiGenerated && <span className="ml-1.5 text-brand-500">· AI</span>}
                      {c.authorName && <span className="ml-1.5">· {c.authorName}</span>}
                    </div>
                  </Link>
                  <div className="text-xs text-muted-foreground">{c.type.replace("_", " ").toLowerCase()}</div>
                  <div><Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>{c.status.replace("_", " ").toLowerCase()}</Badge></div>
                  <div className="text-right text-xs text-muted-foreground">
                    {c.status === "SCHEDULED" && c.scheduledAt ? (
                      <span title={new Date(c.scheduledAt).toLocaleString()}>scheduled · {relativeTime(c.scheduledAt)}</span>
                    ) : c.status === "PUBLISHED" && c.publishedAt ? (
                      <span title={new Date(c.publishedAt).toLocaleString()}>{relativeTime(c.publishedAt)}</span>
                    ) : (
                      <span title={new Date(c.updatedAt).toLocaleString()}>{relativeTime(c.updatedAt)}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="Row actions"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent text-muted-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/content/${c.id}`}>Open</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/preview/${c.id}`} target="_blank" rel="noopener">Preview</a>
                        </DropdownMenuItem>
                        {can(role, "content.create") && (
                          <DropdownMenuItem
                            onSelect={() => {
                              start(async () => {
                                try { const copy = await duplicateContent(c.id); toast.success("Duplicated"); router.push(`/dashboard/content/${copy.id}`); }
                                catch (e: any) { toast.error(e.message); }
                              });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </DropdownMenuItem>
                        )}
                        {can(role, "content.delete") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-500"
                              onSelect={() => {
                                if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
                                runBulk(() => bulkDelete([c.id]), "Deleted");
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule {selectionCount} item{selectionCount === 1 ? "" : "s"}</DialogTitle>
            <DialogDescription>Items move to <span className="font-medium">Scheduled</span>. The scheduler page publishes them when the time arrives.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Publish at</Label>
            <Input type="datetime-local" value={scheduleWhen} onChange={(e) => setScheduleWhen(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              variant="gradient"
              disabled={!scheduleWhen || pending}
              onClick={() => {
                runBulk(() => bulkSchedule(Array.from(selected), scheduleWhen), "Scheduled");
                setScheduleOpen(false); setScheduleWhen("");
              }}
            >
              <Calendar className="h-3.5 w-3.5" /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({
  label, active, dir, onClick, className,
}: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center gap-1 hover:text-foreground transition-colors", active && "text-foreground", className)}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3 opacity-40", active && "opacity-100")} />
      {active && <span className="sr-only">{dir === "asc" ? "ascending" : "descending"}</span>}
    </button>
  );
}

function Checkbox({
  checked, indeterminate, onChange, ...rest
}: { checked: boolean; indeterminate?: boolean; onChange: () => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      ref={(el) => { if (el) el.indeterminate = !!indeterminate; }}
      className="h-4 w-4 rounded border-border accent-brand-500 cursor-pointer"
      {...rest}
    />
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="p-12 text-center space-y-1">
        <div className="text-sm font-medium">No content matches these filters</div>
        <div className="text-xs text-muted-foreground">Adjust filters above, or reset to see everything.</div>
      </div>
    );
  }
  return (
    <div className="p-12 text-center space-y-2">
      <div className="mx-auto h-10 w-10 rounded-full bg-brand-500/10 grid place-items-center text-brand-500">
        <ChevronDown className="h-4 w-4 rotate-180" />
      </div>
      <div className="text-sm font-medium">No content yet</div>
      <div className="text-xs text-muted-foreground">
        Start with the <Link href="/dashboard/ai" className="text-brand-500 hover:underline">AI Studio</Link> or hand-write a draft.
      </div>
    </div>
  );
}
