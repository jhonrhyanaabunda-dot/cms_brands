"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, ArrowRight } from "lucide-react";
import { createRedirect, deleteRedirect } from "@/server/seo";

export function RedirectsManager({ initial }: { initial: any[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [code, setCode] = useState(301);
  const [pending, start] = useTransition();
  const router = useRouter();

  function add() {
    if (!from || !to) return toast.error("Both URLs are required");
    start(async () => {
      try {
        await createRedirect({ from, to, statusCode: code });
        setFrom(""); setTo("");
        toast.success("Redirect added"); router.refresh();
      } catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-5"><Input placeholder="/old-path" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <ArrowRight className="hidden md:block h-4 w-4 mx-auto text-muted-foreground" />
          <div className="md:col-span-5"><Input placeholder="/new-path or https://…" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <select value={code} onChange={(e) => setCode(Number(e.target.value))} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value={301}>301</option>
            <option value={302}>302</option>
            <option value={308}>308</option>
          </select>
        </div>
        <Button onClick={add} variant="gradient" size="sm" disabled={pending}><Plus /> Add redirect</Button>

        <div className="border-t pt-4">
          {initial.length === 0 && <p className="text-sm text-muted-foreground">No redirects yet.</p>}
          <div className="divide-y">
            {initial.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                <div className="font-mono"><span className="text-muted-foreground">{r.from}</span> → {r.to}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{r.statusCode}</span>
                  <button className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded" onClick={() => deleteRedirect(r.id).then(() => { toast.success("Deleted"); router.refresh(); })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
