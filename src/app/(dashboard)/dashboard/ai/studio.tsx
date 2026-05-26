"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, FileText, Globe2, Layers, Zap, Wand2, RotateCw, Loader2, Save, ImageIcon, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { SerpPreview, CharCounter } from "@/components/ui/serp-preview";
import {
  generateBlog, generateLandingPage, generateGbpPost, generateCityPagesBulk, generateCityPageOne, generateHeroImage,
} from "@/server/ai";
import { createContent } from "@/server/content";

const TONES = ["professional","friendly","luxury","energetic","trustworthy","authoritative"] as const;
const STRUCTURES = [
  { id: "article",    label: "Editorial article", desc: "Long-form, 4–6 H2s" },
  { id: "howto",      label: "How-to guide",      desc: "Numbered step-by-step" },
  { id: "listicle",   label: "Listicle",          desc: "10 numbered items + takeaway" },
  { id: "comparison", label: "Comparison",        desc: "Side-by-side table + verdict" },
  { id: "news",       label: "News update",       desc: "Lede + what-it-means + next" },
  { id: "faq",        label: "FAQ-driven",        desc: "10–15 questions answered" },
] as const;
const AUDIENCES = [
  { id: "general",     label: "Everyday drivers" },
  { id: "family",      label: "Family buyers" },
  { id: "luxury",      label: "Luxury buyers" },
  { id: "performance", label: "Performance enthusiasts" },
  { id: "firsttime",   label: "First-time buyers" },
  { id: "fleet",       label: "Fleet & commercial" },
] as const;
const WORD_TARGETS = [500, 800, 1200, 1800] as const;

export function AIStudio() {
  return (
    <Tabs defaultValue="blog">
      <TabsList className="bg-card border">
        <TabsTrigger value="blog"><FileText className="h-3.5 w-3.5 mr-1.5" /> Blog</TabsTrigger>
        <TabsTrigger value="landing"><Layers className="h-3.5 w-3.5 mr-1.5" /> Landing page</TabsTrigger>
        <TabsTrigger value="gbp"><Globe2 className="h-3.5 w-3.5 mr-1.5" /> GBP post</TabsTrigger>
        <TabsTrigger value="bulk"><Zap className="h-3.5 w-3.5 mr-1.5" /> Bulk city pages</TabsTrigger>
        <TabsTrigger value="hero"><ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Hero image</TabsTrigger>
      </TabsList>

      <TabsContent value="blog"><BlogGen /></TabsContent>
      <TabsContent value="landing"><LandingGen /></TabsContent>
      <TabsContent value="gbp"><GbpGen /></TabsContent>
      <TabsContent value="bulk"><BulkCity /></TabsContent>
      <TabsContent value="hero"><HeroGen /></TabsContent>
    </Tabs>
  );
}

// ---------------- Hero image ----------------
const HERO_STYLES = [
  { id: "gradient",   label: "Gradient",   desc: "Bold color → dark, radial highlight" },
  { id: "minimal",    label: "Minimal",    desc: "Dark canvas, accent rule, big type" },
  { id: "geometric",  label: "Geometric",  desc: "Abstract shapes, dynamic mood" },
  { id: "automotive", label: "Automotive", desc: "Speed lines + car silhouette" },
] as const;

type HeroVariant = { dataUrl: string; style: string };

function HeroGen() {
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [accent, setAccent] = useState("#1DB954");
  const [variants, setVariants] = useState<HeroVariant[]>([]);
  const [selected, setSelected] = useState(0);
  const [pending, start] = useTransition();

  function run() {
    if (!headline.trim()) return toast.error("Headline is required");
    start(async () => {
      const t = toast.loading(variants.length ? "Regenerating variants…" : "Generating 4 variants…");
      try {
        const rs = await Promise.all(HERO_STYLES.map((s) =>
          generateHeroImage({ headline, subhead, accent, style: s.id as any })
        ));
        setVariants(rs.map((r) => ({ dataUrl: r.dataUrl, style: r.style })));
        setSelected(0);
        toast.success("Generated 4 variants", { id: t });
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  function downloadSvg() {
    const v = variants[selected];
    if (!v) return;
    const a = document.createElement("a");
    a.href = v.dataUrl;
    a.download = `hero-${v.style}-${headline.slice(0, 30).replace(/\W+/g, "-").toLowerCase() || "image"}.svg`;
    a.click();
  }

  async function downloadPng() {
    const v = variants[selected];
    if (!v) return;
    const t = toast.loading("Rendering PNG…");
    try {
      const png = await svgDataUrlToPng(v.dataUrl, 1200, 630);
      const a = document.createElement("a");
      a.href = png;
      a.download = `hero-${v.style}-${headline.slice(0, 30).replace(/\W+/g, "-").toLowerCase() || "image"}.png`;
      a.click();
      toast.success("PNG downloaded", { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "PNG render failed", { id: t });
    }
  }

  function copyDataUrl() {
    const v = variants[selected];
    if (!v) return;
    navigator.clipboard.writeText(v.dataUrl).then(() => toast.success("Data URL copied"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Hero image generator</CardTitle>
        <CardDescription>Four on-brand variants in one click — gradient, minimal, geometric, and automotive. Download SVG or PNG.</CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Headline"><Input placeholder="e.g. End-of-year BMW lease offers" value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
          <Field label="Subhead"><Input placeholder="e.g. Limited inventory · Atlanta, GA" value={subhead} onChange={(e) => setSubhead(e.target.value)} /></Field>
          <Field label="Accent color">
            <div className="flex items-center gap-3">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 rounded border bg-transparent p-0.5 cursor-pointer" />
              <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
              <div className="hidden md:flex gap-1">
                {["#1DB954", "#3B82F6", "#F59E0B", "#EF4444", "#A855F7"].map((c) => (
                  <button key={c} type="button" onClick={() => setAccent(c)} aria-label={`Use ${c}`}
                    className="h-7 w-7 rounded border" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </Field>

          <div className="flex gap-2">
            <Button onClick={run} variant="gradient" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
              {variants.length ? "Regenerate 4 variants" : "Generate 4 variants"}
            </Button>
            {variants.length > 0 && (
              <>
                <Button onClick={downloadSvg} variant="outline"><Download className="h-4 w-4" /> SVG</Button>
                <Button onClick={downloadPng} variant="outline"><Download className="h-4 w-4" /> PNG</Button>
                <Button onClick={copyDataUrl} variant="ghost" size="sm">Copy URL</Button>
              </>
            )}
          </div>

          {variants.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {variants.map((v, i) => (
                <button
                  key={v.style}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`relative rounded-md overflow-hidden border transition-all ${selected === i ? "border-brand-500 ring-2 ring-brand-500/30" : "hover:border-brand-500/40"}`}
                >
                  <img src={v.dataUrl} alt={v.style} className="block w-full aspect-[1200/630] object-cover" />
                  <span className="absolute bottom-1 left-1 text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {HERO_STYLES.find((s) => s.id === v.style)?.label ?? v.style}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {!variants.length && <EmptyPreview />}
          {variants[selected] && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Preview · 1200×630 (Open Graph)</span>
                <Badge variant="brand">{HERO_STYLES.find((s) => s.id === variants[selected].style)?.label}</Badge>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <img src={variants[selected].dataUrl} alt={headline} className="w-full h-auto block" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                Use SVG for crisp scaling on the web; PNG for social and ad units that don't accept SVG.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Rasterize an SVG data URL to a PNG data URL via canvas. Stays purely
 * client-side so no image-generation API is required.
 */
function svgDataUrlToPng(dataUrl: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      try { resolve(canvas.toDataURL("image/png")); }
      catch (e: any) { reject(e); }
    };
    img.onerror = () => reject(new Error("Failed to rasterize SVG"));
    img.src = dataUrl;
  });
}

// ---------------- Blog ----------------
function BlogGen() {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("professional");
  const [city, setCity] = useState("");
  const [structure, setStructure] = useState<(typeof STRUCTURES)[number]["id"]>("article");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["id"]>("general");
  const [wordCount, setWordCount] = useState<(typeof WORD_TARGETS)[number]>(1200);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    if (!topic.trim() || !keyword.trim()) return toast.error("Topic and keyword are required");
    start(async () => {
      const t = toast.loading(result ? "Regenerating…" : "Generating blog…");
      try {
        const r = await generateBlog({ topic, keyword, tone, city, structure, audience, wordCount });
        setResult(r); toast.success("Generated", { id: t });
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  async function saveAsDraft() {
    if (!result) return;
    setSaving(true);
    try {
      const created = await createContent({
        type: "BLOG", title: result.title, slug: result.slug, excerpt: result.excerpt,
        bodyMarkdown: result.bodyMarkdown, metaTitle: result.metaTitle, metaDescription: result.metaDescription,
        aiGenerated: true, aiModel: "gpt-4o-mini", targetCity: city || undefined, targetKeyword: keyword,
      });
      toast.success("Saved as draft");
      router.push(`/dashboard/content/${created.id}`);
    } catch (e: any) {
      toast.error(e.message);
      setSaving(false);
    }
  }

  const words = result?.bodyMarkdown ? (result.bodyMarkdown as string).trim().split(/\s+/).length : 0;
  const readMin = Math.max(1, Math.round(words / 220));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-brand-500" /> AI blog generator</CardTitle>
        <CardDescription>SEO-optimized blog drafts with structure presets, audience tuning, and an outline-first preview.</CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Topic"><Textarea rows={2} placeholder="e.g. Winter tire maintenance tips for SUV drivers" value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
          <Field label="Primary keyword"><Input placeholder="e.g. winter tires for SUVs" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></Field>

          <Field label="Structure">
            <div className="grid grid-cols-2 gap-2">
              {STRUCTURES.map((s) => (
                <button
                  key={s.id} type="button" onClick={() => setStructure(s.id)}
                  className={`text-left rounded-md border p-2.5 transition-colors ${structure === s.id ? "border-brand-500 bg-brand-500/10" : "hover:border-brand-500/40"}`}
                >
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Audience">
              <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={audience} onChange={(e) => setAudience(e.target.value as any)}>
                {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="Tone">
              <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={tone} onChange={(e) => setTone(e.target.value as any)}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={`Target length · ${wordCount} words`}>
              <div className="flex gap-1">
                {WORD_TARGETS.map((w) => (
                  <button key={w} type="button" onClick={() => setWordCount(w)}
                    className={`flex-1 h-9 rounded-md border text-xs font-medium transition-colors ${wordCount === w ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "hover:border-brand-500/40"}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Target city (optional)"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          </div>

          <div className="flex gap-2">
            <Button onClick={run} variant="gradient" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
              {result ? "Regenerate" : "Generate blog"}
            </Button>
            {result && (
              <Button onClick={run} variant="outline" disabled={pending} title="Regenerate">
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {pending && !result && <GenerationSkeleton />}
          {!pending && !result && <EmptyPreview />}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="brand">{STRUCTURES.find((s) => s.id === structure)?.label}</Badge>
                <span>·</span>
                <span><strong className="text-foreground tabular-nums">{words}</strong> words</span>
                <span>·</span>
                <span><strong className="text-foreground tabular-nums">{readMin}</strong> min read</span>
              </div>
              {Array.isArray(result.outline) && result.outline.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Outline</div>
                  <ol className="text-sm list-decimal pl-5 space-y-0.5">
                    {result.outline.map((h: string, i: number) => <li key={i} className="truncate">{h}</li>)}
                  </ol>
                </div>
              )}
              <ResultPanel result={result} kind="blog" pending={pending} saving={saving} onSave={saveAsDraft} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Landing ----------------
function LandingGen() {
  const [service, setService] = useState("");
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [oem, setOem] = useState("");
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    if (!service || !keyword) return toast.error("Service + keyword required");
    start(async () => {
      const t = toast.loading(result ? "Regenerating…" : "Generating landing page…");
      try {
        const r = await generateLandingPage({ service, city, keyword, oemBrand: oem });
        setResult(r); toast.success("Generated", { id: t });
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }
  async function save() {
    if (!result) return;
    setSaving(true);
    try {
      const c = await createContent({
        type: "LANDING_PAGE", title: result.title, slug: result.slug, excerpt: result.excerpt,
        bodyMarkdown: result.bodyMarkdown, metaTitle: result.metaTitle, metaDescription: result.metaDescription,
        aiGenerated: true, targetCity: city || undefined, targetKeyword: keyword,
      });
      toast.success("Saved");
      router.push(`/dashboard/content/${c.id}`);
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Landing page generator</CardTitle><CardDescription>SEO landing with hero, value props, FAQ, CTA.</CardDescription></CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Service / offer"><Input placeholder="e.g. Brake service" value={service} onChange={(e) => setService(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <Field label="OEM brand"><Input placeholder="BMW / Toyota / …" value={oem} onChange={(e) => setOem(e.target.value)} /></Field>
          </div>
          <Field label="Primary keyword"><Input value={keyword} onChange={(e) => setKeyword(e.target.value)} /></Field>
          <div className="flex gap-2">
            <Button onClick={run} variant="gradient" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
              {result ? "Regenerate" : "Generate landing page"}
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {pending && !result && <GenerationSkeleton />}
          {!pending && !result && <EmptyPreview />}
          {result && <ResultPanel result={result} kind="landing" pending={pending} saving={saving} onSave={save} />}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- GBP ----------------
const GBP_POST_TYPES = [
  { id: "update",   label: "Update",       desc: "General announcement" },
  { id: "offer",    label: "Offer",        desc: "Discount or deal" },
  { id: "event",    label: "Event",        desc: "Hosted event / open house" },
  { id: "whatsnew", label: "What's new",   desc: "Product / service launch" },
] as const;

type GbpVariant = { title: string; bodyMarkdown: string; hashtags?: string[] };

function GbpGen() {
  const [topic, setTopic] = useState("");
  const [cta, setCta] = useState("Schedule today");
  const [tone, setTone] = useState<(typeof TONES)[number]>("friendly");
  const [postType, setPostType] = useState<(typeof GBP_POST_TYPES)[number]["id"]>("update");
  // Offer fields
  const [offerName, setOfferName] = useState("");
  const [offerStart, setOfferStart] = useState("");
  const [offerEnd, setOfferEnd] = useState("");
  const [offerCode, setOfferCode] = useState("");
  // Event fields
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const [result, setResult] = useState<{ variants: GbpVariant[]; postType: string } | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    if (!topic) return toast.error("Topic required");
    start(async () => {
      const t = toast.loading(result ? "Regenerating…" : "Generating 3 variants…");
      try {
        const r = await generateGbpPost({
          topic, tone, cta, postType,
          offer: postType === "offer" ? { name: offerName, startDate: offerStart, endDate: offerEnd, couponCode: offerCode } : undefined,
          event: postType === "event" ? { name: eventName, date: eventDate, location: eventLocation } : undefined,
        });
        setResult(r); setSelectedVariant(0);
        toast.success("Generated", { id: t });
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  async function save() {
    if (!result) return;
    const v = result.variants[selectedVariant];
    setSaving(true);
    try {
      const c = await createContent({
        type: "GBP_POST", title: v.title, bodyMarkdown: v.bodyMarkdown, aiGenerated: true,
      });
      toast.success("Saved");
      router.push(`/dashboard/content/${c.id}`);
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  }

  function copyToClipboard() {
    if (!result) return;
    const v = result.variants[selectedVariant];
    navigator.clipboard.writeText(v.bodyMarkdown).then(() => toast.success("Copied to clipboard"));
  }

  const variant = result?.variants[selectedVariant];
  const charCount = variant?.bodyMarkdown.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Globe2 className="h-4 w-4" /> Google Business Profile post</CardTitle>
        <CardDescription>Short-form, on-brand posts in 4 post types — generated as 3 angles so you can pick the best one.</CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Post type">
            <div className="grid grid-cols-2 gap-2">
              {GBP_POST_TYPES.map((pt) => (
                <button
                  key={pt.id} type="button" onClick={() => setPostType(pt.id)}
                  className={`text-left rounded-md border p-2.5 transition-colors ${postType === pt.id ? "border-brand-500 bg-brand-500/10" : "hover:border-brand-500/40"}`}
                >
                  <div className="text-sm font-medium">{pt.label}</div>
                  <div className="text-[11px] text-muted-foreground">{pt.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Topic"><Textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={
            postType === "offer" ? "e.g. End-of-month BMW lease offer" :
            postType === "event" ? "e.g. Saturday cars-and-coffee" :
            postType === "whatsnew" ? "e.g. New EV service bay just opened" :
            "e.g. Reminder to schedule winter service"
          } /></Field>

          {postType === "offer" && (
            <div className="rounded-md border border-brand-500/30 bg-brand-500/5 p-3 space-y-3">
              <div className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300 font-semibold">Offer details</div>
              <Field label="Offer name"><Input value={offerName} onChange={(e) => setOfferName(e.target.value)} placeholder="e.g. $500 off any brake service" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Starts"><Input type="date" value={offerStart} onChange={(e) => setOfferStart(e.target.value)} /></Field>
                <Field label="Ends"><Input type="date" value={offerEnd} onChange={(e) => setOfferEnd(e.target.value)} /></Field>
              </div>
              <Field label="Coupon code (optional)"><Input value={offerCode} onChange={(e) => setOfferCode(e.target.value)} placeholder="e.g. BRAKE500" /></Field>
            </div>
          )}

          {postType === "event" && (
            <div className="rounded-md border border-brand-500/30 bg-brand-500/5 p-3 space-y-3">
              <div className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300 font-semibold">Event details</div>
              <Field label="Event name"><Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Cars & Coffee Open House" /></Field>
              <Field label="Date / time"><Input value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="e.g. Sat May 30 · 9–11am" /></Field>
              <Field label="Location"><Input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="e.g. Service drive entrance" /></Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tone">
              <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={tone} onChange={(e) => setTone(e.target.value as any)}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="CTA"><Input value={cta} onChange={(e) => setCta(e.target.value)} /></Field>
          </div>

          <Button onClick={run} variant="gradient" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
            {result ? "Regenerate 3 variants" : "Generate 3 variants"}
          </Button>
        </div>

        <div className="space-y-3">
          {pending && !result && <GenerationSkeleton />}
          {!pending && !result && <EmptyPreview />}
          {result && variant && (
            <div className="space-y-3">
              {/* Variant picker */}
              <div className="flex items-center gap-1">
                {result.variants.map((_, i) => (
                  <button
                    key={i} type="button" onClick={() => setSelectedVariant(i)}
                    className={`flex-1 h-9 rounded-md border text-xs font-medium transition-colors ${selectedVariant === i ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "hover:border-brand-500/40 text-muted-foreground"}`}
                  >
                    Variant {i + 1}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{variant.title}</div>
                <CharCounter value={variant.bodyMarkdown} max={1500} label="body" />
              </div>

              <div className="rounded-md border p-3 bg-muted/30 max-h-72 overflow-auto">
                <MarkdownPreview source={variant.bodyMarkdown} />
              </div>

              {variant.hashtags && variant.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {variant.hashtags.map((h) => (
                    <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">#{h}</span>
                  ))}
                </div>
              )}

              {charCount > 1500 && (
                <Badge variant="warning">Over GBP 1,500-character limit by {charCount - 1500}</Badge>
              )}

              <div className="flex gap-2">
                <Button onClick={save} variant="gradient" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save as draft →
                </Button>
                <Button onClick={copyToClipboard} variant="outline">Copy</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Bulk city pages ----------------
type BulkRow = {
  city: string;
  status: "queued" | "running" | "done" | "error";
  result?: { id: string; title: string; slug: string; metaDescription?: string; duplicateScore: number; duplicateAgainst: null | { id: string; title: string } };
  error?: string;
};
const PUBLISH_OPTIONS = [
  { id: "draft",     label: "Save as draft", desc: "Review before going live" },
  { id: "scheduled", label: "Schedule",      desc: "Publish at a specific time" },
  { id: "live",      label: "Publish now",   desc: "Live immediately on the site" },
] as const;

function BulkCity() {
  const [service, setService] = useState("");
  const [keyword, setKeyword] = useState("");
  const [state, setState] = useState("");
  const [cities, setCities] = useState("");
  const [publish, setPublish] = useState<(typeof PUBLISH_OPTIONS)[number]["id"]>("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [concurrency, setConcurrency] = useState(3);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);

  const parsed = cities.split(/[,\n]/).map((c) => c.trim()).filter(Boolean);
  const done = rows.filter((r) => r.status === "done").length;
  const errored = rows.filter((r) => r.status === "error").length;
  const total = rows.length;

  async function run() {
    if (!service || !keyword || parsed.length === 0) return toast.error("Service, keyword, and at least one city required");
    if (parsed.length > 25) return toast.error("Max 25 cities at once");
    if (publish === "scheduled" && !scheduledAt) return toast.error("Pick a schedule time");

    const initial: BulkRow[] = parsed.map((city) => ({ city, status: "queued" }));
    setRows(initial);
    setRunning(true);

    const queue = [...parsed];
    const work = async (): Promise<void> => {
      while (queue.length) {
        const city = queue.shift()!;
        setRows((prev) => prev.map((r) => (r.city === city ? { ...r, status: "running" } : r)));
        try {
          const res = await generateCityPageOne({ service, keyword, city, state, publish, scheduledAt });
          setRows((prev) => prev.map((r) => (r.city === city ? { ...r, status: "done", result: res } : r)));
        } catch (e: any) {
          setRows((prev) => prev.map((r) => (r.city === city ? { ...r, status: "error", error: e?.message ?? "Failed" } : r)));
        }
      }
    };

    const workers = Math.min(concurrency, parsed.length);
    await Promise.all(Array.from({ length: workers }, () => work()));
    setRunning(false);
    toast.success(`Generated ${parsed.length - errored} of ${parsed.length}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Bulk city page generator</CardTitle>
        <CardDescription>Programmatic SEO at scale — parallel generation, live progress, duplicate-content detection.</CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Service"><Input placeholder="e.g. Brake service" value={service} onChange={(e) => setService(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary keyword"><Input value={keyword} onChange={(e) => setKeyword(e.target.value)} /></Field>
            <Field label="State"><Input value={state} onChange={(e) => setState(e.target.value)} /></Field>
          </div>
          <Field label={`Cities · ${parsed.length} parsed${parsed.length > 25 ? " (max 25)" : ""}`}>
            <Textarea rows={6} value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Atlanta, Marietta, Decatur, Smyrna…" />
          </Field>

          <Field label="Publish status">
            <div className="grid grid-cols-3 gap-2">
              {PUBLISH_OPTIONS.map((p) => (
                <button
                  key={p.id} type="button" onClick={() => setPublish(p.id)}
                  className={`text-left rounded-md border p-2.5 transition-colors ${publish === p.id ? "border-brand-500 bg-brand-500/10" : "hover:border-brand-500/40"}`}
                >
                  <div className="text-xs font-medium">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          {publish === "scheduled" && (
            <Field label="Schedule at">
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </Field>
          )}

          <Field label={`Parallel workers · ${concurrency}`}>
            <input
              type="range" min={1} max={6} step={1}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="text-[10px] text-muted-foreground">Higher = faster batch, more concurrent AI calls.</div>
          </Field>

          <Button onClick={run} variant="gradient" disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
            {running ? `Generating ${done + 1}/${total}…` : `Generate ${parsed.length || ""} city pages`}
          </Button>
        </div>

        <div className="space-y-3">
          {/* Progress bar */}
          {total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="tabular-nums font-medium">{done}/{total}{errored > 0 && <span className="text-red-500 ml-2">· {errored} errored</span>}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all duration-500"
                  style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyPreview />
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {rows.map((r) => (
                <div key={r.city} className={`text-sm border rounded-md p-3 ${
                  r.status === "done" ? "border-brand-500/30 bg-brand-500/5" :
                  r.status === "running" ? "border-amber-500/30 bg-amber-500/5" :
                  r.status === "error" ? "border-red-500/30 bg-red-500/5" :
                  ""
                }`}>
                  <div className="flex items-center gap-2">
                    {r.status === "queued"  && <Loader2 className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    {r.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />}
                    {r.status === "done"    && <span className="h-3.5 w-3.5 rounded-full bg-brand-500 grid place-items-center text-[10px] text-charcoal-500">✓</span>}
                    {r.status === "error"   && <span className="h-3.5 w-3.5 rounded-full bg-red-500 grid place-items-center text-[10px] text-white">!</span>}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.result?.title ?? r.city}</div>
                      {r.result?.metaDescription && <div className="text-xs text-muted-foreground line-clamp-1">{r.result.metaDescription}</div>}
                      {r.error && <div className="text-xs text-red-500 line-clamp-1">{r.error}</div>}
                    </div>
                    {r.result && r.result.duplicateScore > 35 && (
                      <Badge variant="warning" className="shrink-0">~{r.result.duplicateScore}% dup</Badge>
                    )}
                    {r.result && (
                      <a href={`/dashboard/content/${r.result.id}`} className="text-brand-500 text-xs shrink-0">Open →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Shared preview pieces ----------------
function ResultPanel({
  result,
  kind,
  pending,
  saving,
  onSave,
}: {
  result: any;
  kind: "blog" | "landing";
  pending: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Title</div>
          <div className="font-semibold truncate">{result.title}</div>
        </div>
        {result.duplicateAgainst && result.duplicateScore > 35 && (
          <Badge variant="warning" className="shrink-0">
            ~{result.duplicateScore}% similar to "{result.duplicateAgainst.title}"
          </Badge>
        )}
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1.5">SERP preview</div>
        <SerpPreview
          url={`yourdealership.com/${result.slug ?? ""}`}
          title={result.metaTitle}
          description={result.metaDescription}
        />
        <div className="flex gap-3 mt-1.5">
          <CharCounter value={result.metaTitle ?? ""} max={60} label="title" />
          <CharCounter value={result.metaDescription ?? ""} max={160} label="description" />
        </div>
      </div>

      {Array.isArray(result.keywords) && result.keywords.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Target keywords</div>
          <div className="flex flex-wrap gap-1.5">
            {result.keywords.map((k: string) => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-muted-foreground mb-1.5">Body preview</div>
        <div className="rounded-md border p-4 bg-muted/30 max-h-96 overflow-auto">
          <MarkdownPreview source={result.bodyMarkdown ?? ""} />
        </div>
      </div>

      <Button onClick={onSave} variant="gradient" disabled={pending || saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save as draft →
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function EmptyPreview() {
  return (
    <div className="rounded-lg border border-dashed h-72 grid place-items-center text-sm text-muted-foreground">
      Generated content will appear here.
    </div>
  );
}
function GenerationSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3 animate-pulse">
      <div className="h-4 w-3/5 bg-muted rounded" />
      <div className="h-20 bg-muted rounded" />
      <div className="h-3 w-2/3 bg-muted rounded" />
      <div className="h-3 w-1/2 bg-muted rounded" />
      <div className="h-24 bg-muted rounded" />
    </div>
  );
}
