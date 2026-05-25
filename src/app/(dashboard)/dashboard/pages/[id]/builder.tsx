"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Smartphone, Tablet, Monitor, Trash2, ArrowUp, ArrowDown, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { BLOCK_LIBRARY, type Block, type BlockType, newBlock } from "@/lib/blocks";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { savePage } from "@/server/pages";
import { cn } from "@/lib/utils";

const DEVICES = {
  mobile: { w: 390, label: "Mobile", icon: Smartphone },
  tablet: { w: 820, label: "Tablet", icon: Tablet },
  desktop: { w: 1280, label: "Desktop", icon: Monitor },
} as const;

export function PageBuilder({ initial }: { initial: any }) {
  const [title, setTitle] = useState<string>(initial.title);
  const [path, setPath] = useState<string>(initial.path);
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (Array.isArray(initial.blocks)) return initial.blocks as Block[];
    try { return JSON.parse(initial.blocks ?? "[]") as Block[]; } catch { return []; }
  });
  const [published, setPublished] = useState<boolean>(initial.published);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function add(type: BlockType) {
    setBlocks((bs) => [...bs, newBlock(type)]);
  }
  function move(i: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const next = [...bs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return bs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setBlocks((bs) => bs.filter((_, k) => k !== i));
    setSelectedIdx(null);
  }
  function patchSelected(patch: any) {
    if (selectedIdx === null) return;
    setBlocks((bs) =>
      bs.map((b, i) => (i === selectedIdx ? ({ ...b, props: { ...(b as any).props, ...patch } } as Block) : b))
    );
  }
  function save() {
    start(async () => {
      try { await savePage(initial.id, { title, path, blocks, published }); toast.success("Saved"); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  const selected = selectedIdx !== null ? blocks[selectedIdx] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost"><Link href="/dashboard/pages"><ArrowLeft /> Pages</Link></Button>
          <div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 font-semibold border-none focus-visible:ring-0 px-0" />
            <Input value={path} onChange={(e) => setPath(e.target.value)} className="h-6 font-mono text-xs text-muted-foreground border-none focus-visible:ring-0 px-0" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-card p-0.5">
            {(Object.entries(DEVICES) as [keyof typeof DEVICES, any][]).map(([k, d]) => (
              <button key={k} onClick={() => setDevice(k)} className={cn("px-2 py-1 rounded text-xs flex items-center gap-1", device === k && "bg-accent")}>
                <d.icon className="h-3 w-3" /> {d.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mx-2"><Switch checked={published} onCheckedChange={setPublished} /><Label className="text-xs">Published</Label></div>
          <Button size="sm" variant="outline" onClick={() => window.open(`/preview/page/${initial.id}`, "_blank")}><Eye /> Preview</Button>
          <Button size="sm" variant="gradient" onClick={save} disabled={pending}><Save /> Save</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr_320px] gap-4">
        {/* Block library */}
        <Card>
          <CardContent className="p-3 space-y-1">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-2">Blocks</div>
            {BLOCK_LIBRARY.map((b) => (
              <button key={b.type} onClick={() => add(b.type)} className="w-full flex items-start gap-2 rounded-md p-2 text-left hover:bg-accent">
                <span className="text-lg leading-none mt-0.5">{b.emoji}</span>
                <div>
                  <div className="text-sm font-medium">{b.label}</div>
                  <div className="text-xs text-muted-foreground">{b.description}</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 bg-muted/40">
            <div className="mx-auto bg-background border-x" style={{ width: DEVICES[device].w, transition: "width .2s" }}>
              {blocks.length === 0 && (
                <div className="h-[60vh] grid place-items-center text-sm text-muted-foreground">
                  Drop blocks from the left to start building.
                </div>
              )}
              {blocks.map((b, i) => (
                <div
                  key={b.id}
                  className={cn("relative group cursor-pointer", selectedIdx === i && "outline outline-2 outline-brand-500")}
                  onClick={() => setSelectedIdx(i)}
                >
                  <BlockRenderer block={b} />
                  <div className="absolute right-2 top-2 hidden group-hover:flex gap-1 rounded-md border bg-background p-1 shadow">
                    <button title="Up" onClick={(e) => { e.stopPropagation(); move(i, -1); }} className="p-1 hover:bg-accent rounded"><ArrowUp className="h-3 w-3" /></button>
                    <button title="Down" onClick={(e) => { e.stopPropagation(); move(i, 1); }} className="p-1 hover:bg-accent rounded"><ArrowDown className="h-3 w-3" /></button>
                    <button title="Delete" onClick={(e) => { e.stopPropagation(); remove(i); }} className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inspector */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><Settings className="h-3 w-3" /> Inspector</div>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a block to edit its properties.</p>
            ) : (
              <div className="space-y-3">
                <Badge variant="brand">{selected.type}</Badge>
                <Inspector block={selected} onChange={patchSelected} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Inspector({ block, onChange }: { block: Block; onChange: (patch: any) => void }) {
  const p = block.props as any;
  const text = (k: string, label: string, multiline = false) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea value={p[k] ?? ""} onChange={(e) => onChange({ [k]: e.target.value })} rows={3} />
      ) : (
        <Input value={p[k] ?? ""} onChange={(e) => onChange({ [k]: e.target.value })} />
      )}
    </div>
  );

  switch (block.type) {
    case "hero":
      return <>{text("eyebrow", "Eyebrow")}{text("headline", "Headline")}{text("subheadline", "Subheadline", true)}{text("ctaLabel", "CTA label")}{text("ctaHref", "CTA URL")}{text("imageUrl", "Image URL")}</>;
    case "cta":
      return <>{text("headline", "Headline")}{text("subheadline", "Subheadline", true)}{text("ctaLabel", "CTA label")}{text("ctaHref", "CTA URL")}</>;
    case "inventory":
      return <>{text("headline", "Headline")}{text("brand", "Brand filter")}{text("bodyStyle", "Body style filter")}<NumberField k="limit" label="Limit" p={p} onChange={onChange} /></>;
    case "financing":
      return <>{text("headline", "Headline")}<ArrayField k="bullets" label="Bullets" p={p} onChange={onChange} />{text("ctaLabel", "CTA label")}{text("ctaHref", "CTA URL")}</>;
    case "service":
      return <>{text("headline", "Headline")}<ObjArrayField k="services" label="Services" p={p} onChange={onChange} fields={["name","description"]} /></>;
    case "faq":
      return <>{text("headline", "Headline")}<ObjArrayField k="items" label="Q&A" p={p} onChange={onChange} fields={["q","a"]} /></>;
    case "richText":
      return text("markdown", "Markdown", true);
    case "offers":
      return <>{text("headline", "Headline")}<NumberField k="limit" label="Limit" p={p} onChange={onChange} /></>;
    case "testimonials":
      return <>{text("headline", "Headline")}<ObjArrayField k="items" label="Testimonials" p={p} onChange={onChange} fields={["quote","author"]} /></>;
    case "embed":
      return text("html", "HTML", true);
    default:
      return <p className="text-xs text-muted-foreground">No fields.</p>;
  }
}

function NumberField({ k, label, p, onChange }: any) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>
    <Input type="number" value={p[k] ?? ""} onChange={(e) => onChange({ [k]: Number(e.target.value) })} /></div>;
}
function ArrayField({ k, label, p, onChange }: any) {
  return <div className="space-y-1.5"><Label className="text-xs">{label} (one per line)</Label>
    <Textarea rows={3} value={(p[k] ?? []).join("\n")} onChange={(e) => onChange({ [k]: e.target.value.split("\n").filter(Boolean) })} /></div>;
}
function ObjArrayField({ k, label, p, onChange, fields }: { k: string; label: string; p: any; onChange: any; fields: string[] }) {
  const items = (p[k] ?? []) as any[];
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {items.map((it, i) => (
        <div key={i} className="border rounded p-2 space-y-1.5">
          {fields.map((f) => (
            <Input key={f} placeholder={f} value={it[f] ?? ""} onChange={(e) => {
              const next = [...items]; next[i] = { ...it, [f]: e.target.value };
              onChange({ [k]: next });
            }} />
          ))}
          <button className="text-xs text-red-500" onClick={() => onChange({ [k]: items.filter((_, j) => j !== i) })}>Remove</button>
        </div>
      ))}
      <button className="text-xs text-brand-500 flex items-center gap-1" onClick={() => {
        const empty = Object.fromEntries(fields.map((f) => [f, ""]));
        onChange({ [k]: [...items, empty] });
      }}><Plus className="h-3 w-3" /> Add</button>
    </div>
  );
}
