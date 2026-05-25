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
  generateBlog, generateLandingPage, generateGbpPost, generateCityPagesBulk, generateHeroImage,
} from "@/server/ai";
import { createContent } from "@/server/content";

const TONES = ["professional","friendly","luxury","energetic","trustworthy","authoritative"] as const;

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
function HeroGen() {
  const [headline, setHeadline] = useState("");
  const [subhead, setSubhead] = useState("");
  const [accent, setAccent] = useState("#1DB954");
  const [result, setResult] = useState<any>(null);
  const [pending, start] = useTransition();

  function run() {
    if (!headline.trim()) return toast.error("Headline is required");
    start(async () => {
      const t = toast.loading(result ? "Regenerating…" : "Generating hero image…");
      try {
        const r = await generateHeroImage({ headline, subhead, accent });
        setResult(r);
        toast.success("Generated", { id: t });
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  function downloadSvg() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.dataUrl;
    a.download = `hero-${headline.slice(0, 40).replace(/\W+/g, "-").toLowerCase() || "image"}.svg`;
    a.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Hero image generator</CardTitle>
        <CardDescription>Deterministic, on-brand hero SVG — no image-generation API needed.</CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Headline"><Input placeholder="e.g. End-of-year BMW lease offers" value={headline} onChange={(e) => setHeadline(e.target.value)} /></Field>
          <Field label="Subhead"><Input placeholder="e.g. Limited inventory · Atlanta, GA" value={subhead} onChange={(e) => setSubhead(e.target.value)} /></Field>
          <Field label="Accent color">
            <div className="flex items-center gap-3">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 rounded border bg-transparent p-0.5 cursor-pointer" />
              <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
            </div>
          </Field>
          <div className="flex gap-2">
            <Button onClick={run} variant="gradient" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
              {result ? "Regenerate" : "Generate hero"}
            </Button>
            {result && (
              <Button onClick={downloadSvg} variant="outline">
                <Download className="h-4 w-4" /> Download SVG
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {!result && <EmptyPreview />}
          {result && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Preview · 1200×630 (Open Graph)</div>
              <div className="rounded-lg border overflow-hidden">
                <img src={result.dataUrl} alt={headline} className="w-full h-auto block" />
              </div>
              <div className="text-[11px] text-muted-foreground">
                Tip: drop into <code>Content.heroImageUrl</code> by saving the data URL — or download the SVG for the asset library.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Blog ----------------
function BlogGen() {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("professional");
  const [city, setCity] = useState("");
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    if (!topic.trim() || !keyword.trim()) return toast.error("Topic and keyword are required");
    start(async () => {
      const t = toast.loading(result ? "Regenerating…" : "Generating blog…");
      try {
        const r = await generateBlog({ topic, keyword, tone, city });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-brand-500" /> AI blog generator</CardTitle>
        <CardDescription>SEO-optimized blog draft with H2 sections, FAQ, and internal links.</CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Topic"><Textarea rows={2} placeholder="e.g. Winter tire maintenance tips for SUV drivers" value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
          <Field label="Primary keyword"><Input placeholder="e.g. winter tires for SUVs" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tone">
              <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={tone} onChange={(e) => setTone(e.target.value as any)}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
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
          {result && <ResultPanel result={result} kind="blog" pending={pending} saving={saving} onSave={saveAsDraft} />}
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
function GbpGen() {
  const [topic, setTopic] = useState("");
  const [cta, setCta] = useState("Schedule today");
  const [tone, setTone] = useState<(typeof TONES)[number]>("friendly");
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    if (!topic) return toast.error("Topic required");
    start(async () => {
      const t = toast.loading(result ? "Regenerating…" : "Generating GBP post…");
      try { const r = await generateGbpPost({ topic, tone, cta }); setResult(r); toast.success("Generated", { id: t }); }
      catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }
  async function save() {
    if (!result) return;
    setSaving(true);
    try {
      const c = await createContent({
        type: "GBP_POST", title: result.title, bodyMarkdown: result.bodyMarkdown, aiGenerated: true,
      });
      toast.success("Saved");
      router.push(`/dashboard/content/${c.id}`);
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  }

  const charCount = (result?.bodyMarkdown ?? "").length;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Google Business Profile post</CardTitle><CardDescription>Short-form, on-brand, ready to publish.</CardDescription></CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Topic"><Textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. End-of-month BMW lease offer" /></Field>
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
            {result ? "Regenerate" : "Generate post"}
          </Button>
        </div>
        <div className="space-y-3">
          {pending && !result && <GenerationSkeleton />}
          {!pending && !result && <EmptyPreview />}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{result.title}</div>
                <CharCounter value={result.bodyMarkdown ?? ""} max={1500} label="body" />
              </div>
              <div className="rounded-md border p-3 bg-muted/30">
                <MarkdownPreview source={result.bodyMarkdown} />
              </div>
              {charCount > 1500 && (
                <Badge variant="warning">Over GBP 1,500-character limit by {charCount - 1500}</Badge>
              )}
              <Button onClick={save} variant="gradient" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save as draft →
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Bulk city pages ----------------
function BulkCity() {
  const [service, setService] = useState("");
  const [keyword, setKeyword] = useState("");
  const [state, setState] = useState("");
  const [cities, setCities] = useState("");
  const [pending, start] = useTransition();
  const [results, setResults] = useState<any[]>([]);

  function run() {
    const list = cities.split(/[,\n]/).map((c) => c.trim()).filter(Boolean);
    if (!service || !keyword || list.length === 0) return toast.error("Fill all fields and at least one city");
    if (list.length > 25) return toast.error("Max 25 cities at once");
    start(async () => {
      const t = toast.loading(`Generating ${list.length} city pages…`);
      try {
        const r = await generateCityPagesBulk({ service, keyword, cities: list, state });
        setResults(r); toast.success("Generated " + r.length + " pages", { id: t });
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Bulk city page generator</CardTitle>
        <CardDescription>Programmatic SEO at scale — spin up city-targeted landing pages.</CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label="Service"><Input placeholder="e.g. Brake service" value={service} onChange={(e) => setService(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary keyword"><Input value={keyword} onChange={(e) => setKeyword(e.target.value)} /></Field>
            <Field label="State"><Input value={state} onChange={(e) => setState(e.target.value)} /></Field>
          </div>
          <Field label="Cities (comma or newline separated)"><Textarea rows={6} value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Atlanta, Marietta, Decatur, Smyrna…" /></Field>
          <Button onClick={run} variant="gradient" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
            Generate batch
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Results</div>
          {results.length === 0 && !pending && <EmptyPreview />}
          {pending && results.length === 0 && <GenerationSkeleton />}
          {results.map((r) => (
            <div key={r.id} className="text-sm border rounded-md p-3 flex justify-between">
              <span className="truncate">{r.title}</span>
              <a href={`/dashboard/content/${r.id}`} className="text-brand-500 text-xs">Open →</a>
            </div>
          ))}
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
