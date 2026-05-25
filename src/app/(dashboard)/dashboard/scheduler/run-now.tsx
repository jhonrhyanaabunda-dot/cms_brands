"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlayCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDueScheduledNow } from "@/server/content";

export function RunSchedulerNow() {
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    start(async () => {
      const t = toast.loading("Running scheduler…");
      try {
        const r = await runDueScheduledNow();
        if (r.publishedCount === 0) {
          toast.info("Nothing due yet", { id: t, description: "Items publish when their scheduled time passes." });
        } else {
          toast.success(`Published ${r.publishedCount} item${r.publishedCount === 1 ? "" : "s"}`, { id: t });
        }
        router.refresh();
      } catch (e: any) {
        toast.error(e.message ?? "Scheduler failed", { id: t });
      }
    });
  }

  return (
    <Button onClick={run} variant="outline" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
      Run scheduler now
    </Button>
  );
}
