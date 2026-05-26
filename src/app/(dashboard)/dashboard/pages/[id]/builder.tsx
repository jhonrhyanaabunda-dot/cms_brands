"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, Smartphone, Tablet, Monitor, Trash2, ArrowUp, ArrowDown,
  Plus, Settings, Copy, Undo2, Redo2, Search as SearchIcon, GripVertical,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  BLOCK_LIBRARY, type Block, type BlockCategory, type BlockType, duplicateBlock, newBlock,
} from "@/lib/blocks";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { savePage } from "@/server/pages";
import { cn } from "@/lib/utils";
import { useAutosave, useDirtyGuard } from "@/lib/hooks/use-autosave";
import { SaveStatus } from "@/components/dashboard/save-status";

const DEVICES = {
  mobile: { w: 390, label: "Mobile", icon: Smartphone },
  tablet: { w: 820, label: "Tablet", icon: Tablet },
  desktop: { w: 1280, label: "Desktop", icon: Monitor },
} as const;

const HISTORY_MAX = 30;

export function PageBuilder({ initial }: { initial: any }) {
  const router = useRouter();
  const [title, setTitle] = useState<string>(initial.title);
  const [path, setPath] = useState<string>(initial.path);
  const [blocks, setBlocksRaw] = useState<Block[]>(() => {
    if (Array.isArray(initial.blocks)) return initial.blocks as Block[];
    try { return JSON.parse(initial.blocks ?? "[]") as Block[]; } catch { return []; }
  });
  const [published, setPublished] = useState<boolean>(initial.published);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [pending, start] = useTransition();

  // Undo/redo history. Each entry is a `blocks` snapshot.
  const history = useRef<Block[][]>([blocks]);
  const cursor = useRef(0);

  function setBlocks(updater: Block[] | ((prev: Block[]) => Block[]), opts: { history?: boolean } = {}) {
    setBlocksRaw((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      if (opts.history !== false) {
        // Drop forward history, push, cap size.
        const trimmed = history.current.slice(0, cursor.current + 1);
        trimmed.push(next);
        const overflow = Math.max(0, trimmed.length - HISTORY_MAX);
        history.current = trimmed.slice(overflow);
        cursor.current = history.current.length - 1;
      }
      return next;
    });
  }
  function undo() {
    if (cursor.current <= 0) return;
    cursor.current -= 1;
    setBlocksRaw(history.current[cursor.current]);
    setSelectedIdx(null);
  }
  function redo() {
    if (cursor.current >= history.current.length - 1) return;
    cursor.current += 1;
    setBlocksRaw(history.current[cursor.current]);
    setSelectedIdx(null);
  }
  const canUndo = cursor.current > 0;
  const canRedo = cursor.current < history.current.length - 1;

  // Mutators
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
    if (selectedIdx === i) setSelectedIdx(i + dir);
  }
  function reorder(from: number, to: number) {
    if (from === to || to < 0) return;
    setBlocks((bs) => {
      const next = [...bs];
      const [m] = next.splice(from, 1);
      next.splice(to > from ? to - 1 : to, 0, m);
      return next;
    });
    setSelectedIdx(null);
  }
  function remove(i: number) {
    setBlocks((bs) => bs.filter((_, k) => k !== i));
    setSelectedIdx(null);
  }
  function duplicate(i: number) {
    setBlocks((bs) => {
      const copy = duplicateBlock(bs[i]);
      const next = [...bs];
      next.splice(i + 1, 0, copy);
      return next;
    });
    setSelectedIdx(i + 1);
  }
  function patchSelected(patch: any) {
    if (selectedIdx === null) return;
    setBlocks((bs) =>
      bs.map((b, i) => (i === selectedIdx ? ({ ...b, props: { ...(b as any).props, ...patch } } as Block) : b))
    );
  }

  // Autosave watches the editable shape of the page.
  const autosave = useAutosave(
    { title, path, blocks, published },
    async (d) => { await savePage(initial.id, d); router.refresh(); },
    { delay: 1500 }
  );
  useDirtyGuard(autosave.status === "dirty" || autosave.status === "saving");

  function saveNow() {
    start(async () => {
      try { await autosave.saveNow(); toast.success("Saved"); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  // Global keyboard shortcuts. Skip when typing into a text input/textarea —
  // those still own their own keys for normal text editing.
  useEffect(() => {
    function inEditable(t: EventTarget | null) {
      if (!(t instanceof HTMLElement)) return false;
      return ["INPUT", "TEXTAREA"].includes(t.tagName) || t.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveNow(); return; }
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); return; }
      if (selectedIdx !== null && !inEditable(e.target)) {
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(selectedIdx); }
        else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(selectedIdx); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx]);

  const selected = selectedIdx !== null ? blocks[selectedIdx] : null;

  // Group blocks by category, filtered by palette search.
  const groupedLibrary = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    const matching = BLOCK_LIBRARY.filter((b) =>
      !q || b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || (b.keywords ?? "").toLowerCase().includes(q)
    );
    const map = new Map<BlockCategory, typeof BLOCK_LIBRARY>();
    for (const b of matching) {
      const list = map.get(b.category) ?? [];
      list.push(b);
      map.set(b.category, list);
    }
    return Array.from(map.entries());
  }, [paletteQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild size="sm" variant="ghost"><Link href="/dashboard/pages"><ArrowLeft /> Pages</Link></Button>
          <div className="min-w-0">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 font-semibold border-none focus-visible:ring-0 px-0" />
            <Input value={path} onChange={(e) => setPath(e.target.value)} className="h-6 font-mono text-xs text-muted-foreground border-none focus-visible:ring-0 px-0" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5">
            <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)"><Undo2 className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)"><Redo2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="flex rounded-md border bg-card p-0.5">
            {(Object.entries(DEVICES) as [keyof typeof DEVICES, any][]).map(([k, d]) => (
              <button key={k} onClick={() => setDevice(k)} className={cn("px-2 py-1 rounded text-xs flex items-center gap-1", device === k && "bg-accent")}>
                <d.icon className="h-3 w-3" /> {d.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mx-2"><Switch checked={published} onCheckedChange={setPublished} /><Label className="text-xs">Published</Label></div>
          <SaveStatus state={autosave} />
          <Button size="sm" variant="outline" onClick={() => window.open(`/preview/page/${initial.id}`, "_blank")}><Eye /> Preview</Button>
          <Button size="sm" variant="gradient" onClick={saveNow} disabled={pending || autosave.status === "saving"} title="Save (⌘S)"><Save /> Save</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr_320px] gap-4">
        {/* Block palette */}
        <Card className="self-start">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} placeholder="Search blocks…" className="h-8 pl-8" />
            </div>
            <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {groupedLibrary.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-4 text-center">Nothing matches.</div>
              )}
              {groupedLibrary.map(([category, items]) => (
                <div key={category}>
                  <div className="text-[10px] font-semibold text-muted-foreground px-1 py-1 uppercase tracking-wider">{category}</div>
                  <div className="space-y-0.5">
                    {items.map((b) => (
                      <button
                        key={b.type}
                        onClick={() => add(b.type)}
                        className="w-full flex items-start gap-2 rounded-md p-2 text-left hover:bg-accent transition-colors"
                      >
                        <span className="text-lg leading-none mt-0.5">{b.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{b.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{b.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 bg-muted/40">
            <div className="mx-auto bg-background border-x" style={{ width: DEVICES[device].w, transition: "width .2s" }}>
              {blocks.length === 0 && (
                <div className="h-[60vh] grid place-items-center text-sm text-muted-foreground">
                  Click a block on the left to add it.
                </div>
              )}
              {blocks.map((b, i) => (
                <CanvasBlock
                  key={b.id}
                  index={i}
                  block={b}
                  selected={selectedIdx === i}
                  total={blocks.length}
                  onSelect={() => setSelectedIdx(i)}
                  onMoveUp={() => move(i, -1)}
                  onMoveDown={() => move(i, 1)}
                  onDuplicate={() => duplicate(i)}
                  onRemove={() => remove(i)}
                  onReorder={reorder}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inspector */}
        <Card className="self-start">
          <CardContent className="p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><Settings className="h-3 w-3" /> Inspector</div>
            {!selected ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Select a block to edit its properties.</p>
                <div className="text-xs text-muted-foreground/80 space-y-1 pt-2 border-t">
                  <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">⌘S</kbd> save</div>
                  <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">⌘Z</kbd> undo · <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">⌘⇧Z</kbd> redo</div>
                  <div><kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">⌘D</kbd> duplicate · <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">Del</kbd> remove</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="brand">{selected.type}</Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => duplicate(selectedIdx!)} title="Duplicate (⌘D)"><Copy className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:!text-red-500" onClick={() => remove(selectedIdx!)} title="Delete (Del)"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <Inspector block={selected} onChange={patchSelected} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CanvasBlock({
  index, block, selected, total, onSelect, onMoveUp, onMoveDown, onDuplicate, onRemove, onReorder,
}: {
  index: number;
  block: Block;
  selected: boolean;
  total: number;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [dragHover, setDragHover] = useState<"top" | "bottom" | null>(null);

  return (
    <div
      className={cn("relative group cursor-pointer", selected && "outline outline-2 outline-brand-500 outline-offset-[-2px]")}
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        setDragHover(e.clientY < r.top + r.height / 2 ? "top" : "bottom");
      }}
      onDragLeave={() => setDragHover(null)}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/block-index"));
        setDragHover(null);
        if (Number.isNaN(from)) return;
        const to = dragHover === "top" ? index : index + 1;
        onReorder(from, to);
      }}
    >
      {dragHover === "top"    && <div className="absolute inset-x-0 -top-px h-0.5 bg-brand-500 z-10 pointer-events-none" />}
      {dragHover === "bottom" && <div className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-500 z-10 pointer-events-none" />}

      <BlockRenderer block={block} />

      <div
        className={cn(
          "absolute left-2 top-2 hidden group-hover:flex items-center cursor-grab active:cursor-grabbing rounded-md border bg-background/95 p-1 shadow",
          selected && "flex"
        )}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/block-index", String(index));
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      <div className={cn(
        "absolute right-2 top-2 hidden group-hover:flex gap-1 rounded-md border bg-background/95 p-1 shadow",
        selected && "flex"
      )}>
        <button title="Move up"    disabled={index === 0}           onClick={(e) => { e.stopPropagation(); onMoveUp(); }}    className="p-1 hover:bg-accent rounded disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
        <button title="Move down"  disabled={index === total - 1}   onClick={(e) => { e.stopPropagation(); onMoveDown(); }}  className="p-1 hover:bg-accent rounded disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
        <button title="Duplicate (⌘D)" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-accent rounded"><Copy className="h-3 w-3" /></button>
        <button title="Delete (Del)"   onClick={(e) => { e.stopPropagation(); onRemove(); }}    className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded"><Trash2 className="h-3 w-3" /></button>
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
