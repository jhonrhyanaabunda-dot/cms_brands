"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Image as ImageIcon } from "lucide-react";
import { deleteMediaAsset, updateMediaAsset } from "@/server/media";

export type Asset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  aiTags: string | null;
  createdAt: string;
};

export function MediaGrid({ initial }: { initial: Asset[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [editing, setEditing] = useState<Asset | null>(null);
  const [pending, start] = useTransition();

  const tagsByAsset = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of initial) {
      try { m.set(a.id, (JSON.parse(a.aiTags ?? "[]") as string[]) ?? []); }
      catch { m.set(a.id, []); }
    }
    return m;
  }, [initial]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    tagsByAsset.forEach((tags) => tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [tagsByAsset]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return initial.filter((a) => {
      if (tagFilter && !(tagsByAsset.get(a.id) ?? []).includes(tagFilter)) return false;
      if (!ql) return true;
      if (a.filename.toLowerCase().includes(ql)) return true;
      if ((a.alt ?? "").toLowerCase().includes(ql)) return true;
      if ((tagsByAsset.get(a.id) ?? []).some((t) => t.toLowerCase().includes(ql))) return true;
      return false;
    });
  }, [initial, q, tagFilter, tagsByAsset]);

  function onDelete(a: Asset) {
    if (!confirm(`Delete ${a.filename}?`)) return;
    start(async () => {
      try { await deleteMediaAsset(a.id); toast.success("Deleted"); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search filename, alt text, tag…" className="h-9 pl-8 pr-8" />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {initial.length} assets
      </div>

      {filtered.length === 0 ? (
        initial.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No media yet"
            description="Drop files into the uploader above. We'll auto-tag and serve them through the CDN."
          />
        ) : (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No assets match these filters.</CardContent></Card>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((a) => {
            const tags = tagsByAsset.get(a.id) ?? [];
            return (
              <Card key={a.id} className="overflow-hidden group">
                <div className="aspect-square bg-muted relative">
                  {/^image\//.test(a.mimeType) ? (
                    <img src={a.url} alt={a.alt ?? ""} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">{a.mimeType}</div>
                  )}
                  {tags.length > 0 && (
                    <Badge variant="brand" className="absolute top-1 right-1 text-[10px]">AI tagged</Badge>
                  )}
                  <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" className="!h-7 !px-2 flex-1 bg-background/90 backdrop-blur" onClick={() => setEditing(a)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="!h-7 !px-2 bg-background/90 backdrop-blur text-red-500 hover:!text-red-500" onClick={() => onDelete(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-2 space-y-0.5">
                  <div className="text-xs truncate" title={a.filename}>{a.filename}</div>
                  <div className="text-[10px] text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <AssetDialog
          asset={editing}
          tags={tagsByAsset.get(editing.id) ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function AssetDialog({ asset, tags, onClose, onSaved }: {
  asset: Asset;
  tags: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [filename, setFilename] = useState(asset.filename);
  const [alt, setAlt] = useState(asset.alt ?? "");
  const [tagInput, setTagInput] = useState(tags.join(", "));
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const t = toast.loading("Saving…");
      try {
        await updateMediaAsset(asset.id, {
          filename,
          alt,
          aiTags: tagInput.split(",").map((s) => s.trim()).filter(Boolean),
        });
        toast.success("Saved", { id: t });
        onSaved();
      } catch (e: any) { toast.error(e?.message ?? "Failed", { id: t }); }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/^image\//.test(asset.mimeType) && (
            <div className="rounded-md border overflow-hidden bg-muted/40">
              <img src={asset.url} alt="" className="w-full h-auto max-h-64 object-contain" />
            </div>
          )}
          <div className="space-y-1.5"><Label>Filename</Label><Input value={filename} onChange={(e) => setFilename(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Alt text</Label><Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image for accessibility / SEO" /></div>
          <div className="space-y-1.5"><Label>Tags (comma-separated)</Label><Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
