"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureError } from "@/lib/observability";

export default function DashboardError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  // Surface the real error in the browser console so Vercel-only failures
  // are debuggable without local repro. Minified production stacks are
  // limited; with productionBrowserSourceMaps enabled they map back to
  // real file:line. Goes through observability so a future Sentry hookup
  // captures it without touching this file.
  useEffect(() => {
    captureError(error, { source: "dashboard-error-boundary", digest: error.digest });
  }, [error]);

  return (
    <div className="rounded-lg border bg-card p-6 max-w-3xl mx-auto mt-12 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-red-500/10 grid place-items-center text-red-500 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-medium">Something went wrong on this page</div>
          {error.digest && <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">ref: {error.digest}</div>}
        </div>
      </div>

      {error.message && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Message</div>
          <pre className="text-xs whitespace-pre-wrap font-mono leading-snug">{error.message}</pre>
        </div>
      )}

      {error.stack && (
        <details className="rounded-md border bg-muted/30 p-3">
          <summary className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">Stack trace</summary>
          <pre className="text-[10px] whitespace-pre-wrap font-mono leading-snug mt-2 max-h-72 overflow-auto">{error.stack}</pre>
        </details>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={reset}>Try again</Button>
        <Button variant="ghost" size="sm" onClick={() => location.assign("/dashboard")}>Back to overview</Button>
      </div>
    </div>
  );
}
