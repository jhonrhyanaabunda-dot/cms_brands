"use client";

import { CheckCircle2, Loader2, AlertTriangle, Pencil } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { AutosaveState } from "@/lib/hooks/use-autosave";

/**
 * Compact pill showing autosave status. Refreshes its "saved Ns ago" text
 * every 10s so it stays accurate without re-rendering the whole editor.
 */
export function SaveStatus({ state, className }: { state: AutosaveState; className?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(i);
  }, []);

  const base = "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md";
  if (state.status === "saving") {
    return <span className={cn(base, "text-muted-foreground", className)}><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>;
  }
  if (state.status === "dirty") {
    return <span className={cn(base, "text-amber-600 dark:text-amber-400", className)}><Pencil className="h-3 w-3" /> Unsaved changes</span>;
  }
  if (state.status === "error") {
    return <span className={cn(base, "text-red-500", className)} title={state.error}><AlertTriangle className="h-3 w-3" /> Save failed</span>;
  }
  if (state.status === "saved" || (state.status === "idle" && state.lastSavedAt)) {
    return (
      <span className={cn(base, "text-muted-foreground", className)}>
        <CheckCircle2 className="h-3 w-3 text-brand-500" /> Saved{state.lastSavedAt ? ` · ${relativeTime(state.lastSavedAt)}` : ""}
      </span>
    );
  }
  return <span className={cn(base, "text-muted-foreground", className)}>—</span>;
}
