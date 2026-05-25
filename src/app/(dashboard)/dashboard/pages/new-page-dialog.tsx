"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createPage } from "@/server/pages";

export function NewPageDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("/");
  const router = useRouter();

  async function submit() {
    if (!title.trim()) return toast.error("Title required");
    try {
      const p = await createPage({ title, path });
      toast.success("Page created");
      setOpen(false);
      router.push(`/dashboard/pages/${p.id}`);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="gradient"><Plus /> New page</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New page</DialogTitle>
          <DialogDescription>Pick a path and title — you can add blocks next.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. About us" /></div>
          <div className="space-y-1.5"><Label>Path</Label><Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/about" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gradient" onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
