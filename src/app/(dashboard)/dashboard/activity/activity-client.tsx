"use client";

import { useMemo, useState } from "react";
import { Search, X, User as UserIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/utils";

export type ActivityRow = {
  id: string;
  action: string;
  target: string | null;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
};

const KINDS = [
  { id: "",          label: "All kinds" },
  { id: "content",   label: "Content",   match: /content|blog|landing|gbp post|city page|published|drafted|archived|deleted .* content|generated|metas?|seo/i },
  { id: "workflow",  label: "Workflows", match: /workflow|scheduler|bulk|stale|auto-publish/i },
  { id: "review",    label: "Reviews",   match: /review|sync(ed)? .*reviews|escalat/i },
  { id: "inventory", label: "Inventory", match: /vehicle|inventory/i },
  { id: "offer",     label: "Offers",    match: /offer/i },
  { id: "team",      label: "Team",      match: /invited|removed|role/i },
  { id: "dealership",label: "Dealership",match: /dealership profile|updated.*dealership/i },
];

export function ActivityClient({
  initial, members, initialQuery, initialUser,
}: {
  initial: ActivityRow[];
  members: { id: string; name: string }[];
  initialQuery: string;
  initialUser: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [user, setUser] = useState(initialUser);
  const [kind, setKind] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const k = KINDS.find((x) => x.id === kind);
    return initial.filter((r) => {
      if (user && r.userId !== user) return false;
      if (k?.match && !k.match.test(r.action)) return false;
      if (!ql) return true;
      return (
        r.action.toLowerCase().includes(ql) ||
        (r.userName ?? "").toLowerCase().includes(ql) ||
        (r.userEmail ?? "").toLowerCase().includes(ql)
      );
    });
  }, [initial, q, user, kind]);

  // Group rows by day for a Twitter-style timeline.
  const groups = useMemo(() => {
    const m = new Map<string, ActivityRow[]>();
    for (const r of filtered) {
      const day = new Date(r.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(r);
    }
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action or member…" className="h-9 pl-8 pr-8" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select value={user} onChange={(e) => setUser(e.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm">
          <option value="">All members</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm">
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        {(q || user || kind) && (
          <Button size="sm" variant="ghost" onClick={() => { setQ(""); setUser(""); setKind(""); }}>
            <X className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} of {initial.length} events
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nothing matches these filters.
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, rows]) => (
            <section key={day} className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground sticky top-[68px] bg-background/80 backdrop-blur-sm py-1 z-10">{day}</h3>
              <div className="rounded-lg border bg-card">
                <ul className="divide-y">
                  {rows.map((r) => {
                    const name = r.userName || r.userEmail || "System";
                    const initials = name.split(/\s|@/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
                    return (
                      <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-[10px]">{r.userId ? initials : <UserIcon className="h-3.5 w-3.5" />}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm leading-snug">
                            <span className="font-medium">{name}</span>
                            <span className="text-muted-foreground"> · {r.action}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            <span title={new Date(r.createdAt).toLocaleString()}>{relativeTime(r.createdAt)}</span>
                            {r.target && <span className="ml-2 font-mono text-[10px]">ref:{r.target.slice(-8)}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
