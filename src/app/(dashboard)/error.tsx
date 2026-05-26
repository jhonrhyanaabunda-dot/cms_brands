"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-10 text-center space-y-3 max-w-xl mx-auto mt-12">
      <div className="mx-auto h-10 w-10 rounded-full bg-red-500/10 grid place-items-center text-red-500">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium">Something went wrong on this page</div>
      <div className="text-xs text-muted-foreground max-w-md mx-auto">
        {error.message || "An unexpected error occurred while rendering this view."}
        {error.digest && <span className="block mt-1 font-mono text-[10px] text-muted-foreground/60">ref: {error.digest}</span>}
      </div>
      <div className="flex justify-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={reset}>Try again</Button>
        <Button variant="ghost" size="sm" onClick={() => location.assign("/dashboard")}>Back to overview</Button>
      </div>
    </div>
  );
}
