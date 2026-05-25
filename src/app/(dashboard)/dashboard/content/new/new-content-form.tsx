"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createContent } from "@/server/content";

const TYPES = [
  "BLOG","LANDING_PAGE","CITY_PAGE","DEALER_PAGE","OEM_PAGE","GBP_POST",
  "FAQ","SERVICE_PAGE","MODEL_RESEARCH","COMPARE_PAGE","TRADE_IN_PAGE","FINANCE_PAGE","OFFER",
] as const;

export function NewContentForm() {
  const [type, setType] = useState<typeof TYPES[number]>("BLOG");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    start(async () => {
      try {
        const c = await createContent({ type, title, excerpt });
        toast.success("Content created");
        router.push(`/dashboard/content/${c.id}`);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Type</Label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{t.replace("_"," ").toLowerCase()}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5 reasons to schedule winter service" />
          </div>
          <div className="space-y-2">
            <Label>Excerpt (optional)</Label>
            <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary used for previews and meta description" rows={3} />
          </div>
          <Button type="submit" variant="gradient" disabled={pending}>Create</Button>
        </form>
      </CardContent>
    </Card>
  );
}
