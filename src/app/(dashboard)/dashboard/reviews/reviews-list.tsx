"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, RefreshCw, AlertTriangle } from "lucide-react";
import { syncReviews, draftReply, approveReply } from "@/server/reviews";

export function ReviewsList({ reviews }: { reviews: any[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function sync() {
    start(async () => {
      const t = toast.loading("Syncing reviews…");
      try { const n = await syncReviews(); toast.success(`Synced ${n} reviews`, { id: t }); router.refresh(); }
      catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={sync} disabled={pending}><RefreshCw className={pending ? "animate-spin" : ""} /> Sync reviews</Button>
      </div>

      {reviews.length === 0 && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No reviews synced yet — click "Sync reviews".</CardContent></Card>}

      {reviews.map((r) => {
        const reply = r.replies[0];
        return (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{r.authorName}</div>
                    <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    {r.isEscalated && <Badge variant="danger"><AlertTriangle className="h-3 w-3 mr-1" />Escalated</Badge>}
                    <Badge variant={r.sentiment === "POSITIVE" ? "success" : r.sentiment === "NEGATIVE" ? "danger" : "secondary"}>{r.sentiment.toLowerCase()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{r.body}</p>
                </div>
              </div>

              {!reply && (
                <Button size="sm" variant="outline" onClick={() => {
                  start(async () => { try { await draftReply(r.id); toast.success("Draft created"); router.refresh(); } catch (e: any) { toast.error(e.message); } });
                }}><Sparkles /> AI draft reply</Button>
              )}
              {reply && (
                <div className="border-l-2 border-brand-500 pl-3 space-y-2">
                  <div className="text-xs text-muted-foreground">Reply · {reply.status.toLowerCase()}{reply.aiGenerated && " · AI"}</div>
                  <p className="text-sm">{reply.body}</p>
                  {reply.status === "DRAFT" && (
                    <Button size="sm" variant="gradient" onClick={() => {
                      start(async () => { try { await approveReply(reply.id); toast.success("Reply posted"); router.refresh(); } catch (e: any) { toast.error(e.message); } });
                    }}><Send /> Approve & post</Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
