"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Save, Sparkles, Eye, ArrowLeft, History, Send, CheckCircle2, Clock,
  AlertTriangle, MessageSquare, Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { MarkdownPreview as MdPreview } from "@/components/ui/markdown-preview";
import {
  updateContent, transitionStatus, deleteContent, addComment, rollbackToRevision,
} from "@/server/content";
import { generateMeta, rewriteContent, aiQaCheck, suggestInternalLinks } from "@/server/ai";
import { scoreSeo } from "@/lib/seo";
import type { Role, WorkflowStatus } from "@/lib/types";
import { can } from "@/lib/rbac";
import { relativeTime, parseJson } from "@/lib/utils";

export function ContentEditor({ initial, role }: { initial: any; role: Role }) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
  const [body, setBody] = useState(initial.bodyMarkdown ?? "");
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle ?? "");
  const [metaDesc, setMetaDesc] = useState(initial.metaDescription ?? "");
  const [keywords, setKeywords] = useState<string[]>(parseJson<string[]>(initial.keywords, []));
  const [noindex, setNoindex] = useState<boolean>(initial.noindex ?? false);
  const [scheduledAt, setScheduledAt] = useState<string>(
    initial.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const [qa, setQa] = useState<any | null>(null);
  const [linkSuggest, setLinkSuggest] = useState<any[] | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const seo = useMemo(
    () => scoreSeo({ title, metaTitle, metaDescription: metaDesc, bodyMarkdown: body, slug, keywords, heroImageUrl: initial.heroImageUrl }),
    [title, metaTitle, metaDesc, body, slug, keywords, initial.heroImageUrl]
  );

  function save() {
    start(async () => {
      try {
        await updateContent(initial.id, {
          title, slug, excerpt, bodyMarkdown: body, metaTitle, metaDescription: metaDesc,
          keywords, noindex, scheduledAt: scheduledAt || null,
        });
        toast.success("Saved");
      } catch (e: any) { toast.error(e.message); }
    });
  }

  function changeStatus(s: WorkflowStatus, msg?: string) {
    start(async () => {
      try { await transitionStatus(initial.id, s, msg); toast.success(`Moved to ${s.toLowerCase().replace("_"," ")}`); router.refresh(); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  async function genMeta() {
    const t = toast.loading("Generating meta…");
    try {
      const res = await generateMeta({ title, body, keyword: keywords[0] });
      setMetaTitle(res.metaTitle ?? "");
      setMetaDesc(res.metaDescription ?? "");
      if (res.keywords?.length) setKeywords(res.keywords);
      toast.success("Meta generated", { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
  }
  async function rewrite(tone: string) {
    const t = toast.loading(`Rewriting in ${tone} tone…`);
    try {
      const text = await rewriteContent({ text: body, tone: tone as any });
      setBody(text); toast.success("Rewritten", { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
  }
  async function runQa() {
    const t = toast.loading("Running AI QA…");
    try { const r = await aiQaCheck({ body, keyword: keywords[0] }); setQa(r); toast.success("QA complete", { id: t }); }
    catch (e: any) { toast.error(e.message, { id: t }); }
  }
  async function suggestLinks() {
    const t = toast.loading("Finding internal links…");
    try { const r = await suggestInternalLinks({ body }); setLinkSuggest(r.suggestions ?? []); toast.success("Done", { id: t }); }
    catch (e: any) { toast.error(e.message, { id: t }); }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" asChild size="sm"><Link href="/dashboard/content"><ArrowLeft /> Back</Link></Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={initial.status === "PUBLISHED" ? "success" : "secondary"}>{initial.status.replace("_"," ").toLowerCase()}</Badge>
            {initial.aiGenerated && <Badge variant="brand"><Sparkles className="h-3 w-3 mr-1" />AI</Badge>}
            <Button size="sm" variant="outline" onClick={() => window.open(`/preview/${initial.id}`, "_blank")}><Eye /> Preview</Button>
            <Button size="sm" variant="gradient" disabled={pending} onClick={save}><Save /> Save</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Input className="!text-2xl !h-12 font-semibold border-none focus-visible:ring-0 px-0" placeholder="Untitled" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>/</span>
              <Input className="h-7 font-mono text-xs" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <Textarea placeholder="Short excerpt…" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
          </CardContent>
        </Card>

        <Tabs defaultValue="write" className="space-y-3">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="split">Split view</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="ai">AI tools</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="write">
            <Card><CardContent className="p-0">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your content in markdown…" className="min-h-[520px] border-0 rounded-md font-mono text-sm focus-visible:ring-0" />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="split">
            <Card><CardContent className="p-0">
              <div className="grid md:grid-cols-2 min-h-[520px] divide-y md:divide-y-0 md:divide-x">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your content in markdown…"
                  className="min-h-[520px] border-0 rounded-none font-mono text-sm focus-visible:ring-0 resize-none"
                />
                <div className="p-6 overflow-auto max-h-[700px]">
                  <h1 className="text-2xl font-semibold mb-4">{title || "Untitled"}</h1>
                  <MdPreview source={body} />
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card><CardContent className="p-8 max-w-none">
              <h1 className="text-3xl font-semibold mb-4">{title}</h1>
              <MdPreview source={body} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="seo">
            <Card><CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta title <span className="text-xs text-muted-foreground">({metaTitle.length}/60)</span></Label>
                  <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Keywords (comma separated)</Label>
                  <Input value={keywords.join(", ")} onChange={(e) => setKeywords(e.target.value.split(",").map((k) => k.trim()).filter(Boolean))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Meta description <span className="text-xs text-muted-foreground">({metaDesc.length}/160)</span></Label>
                  <Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2"><Switch checked={noindex} onCheckedChange={setNoindex} /><Label>No-index this page</Label></div>
                <Button onClick={genMeta} variant="outline" size="sm"><Sparkles /> AI generate</Button>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card><CardContent className="p-6 space-y-6">
              <div>
                <div className="text-sm font-semibold mb-2">Tone rewrites</div>
                <div className="flex flex-wrap gap-2">
                  {["professional","friendly","luxury","energetic","trustworthy","authoritative"].map((t) => (
                    <Button key={t} size="sm" variant="outline" onClick={() => rewrite(t)}>{t}</Button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Quality + compliance check</div>
                <Button onClick={runQa} variant="outline" size="sm"><Sparkles /> Run AI QA</Button>
                {qa && (
                  <div className="mt-4 space-y-2 text-sm">
                    <Badge variant={qa.qaScore >= 80 ? "success" : qa.qaScore >= 60 ? "warning" : "danger"}>QA score: {qa.qaScore}</Badge>
                    {qa.hallucinationFlags?.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Possible hallucinations</div>
                        {qa.hallucinationFlags.map((h: any, i: number) => (
                          <div key={i} className="text-xs text-muted-foreground"><span className="italic">"{h.excerpt}"</span> — {h.reason}</div>
                        ))}
                      </div>
                    )}
                    {qa.oemComplianceIssues?.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold">OEM compliance issues</div>
                        {qa.oemComplianceIssues.map((s: string, i: number) => <div key={i} className="text-xs text-muted-foreground">• {s}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Internal links</div>
                <Button onClick={suggestLinks} variant="outline" size="sm"><Sparkles /> Suggest internal links</Button>
                {linkSuggest && (
                  <div className="mt-3 space-y-2">
                    {linkSuggest.map((s, i) => (
                      <div key={i} className="text-sm border rounded-md p-3">
                        <div className="font-medium">{s.anchor} → <code className="text-xs">{s.href}</code></div>
                        <div className="text-xs text-muted-foreground">{s.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="history">
            <Card><CardContent className="p-6 space-y-2">
              {initial.revisions.length === 0 && <p className="text-sm text-muted-foreground">No revisions yet.</p>}
              {initial.revisions.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
                  <div className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /><span>{r.message || "snapshot"}</span><span className="text-xs text-muted-foreground">{relativeTime(r.createdAt)}</span></div>
                  <Button size="sm" variant="outline" onClick={() => rollbackToRevision(initial.id, r.id).then(() => { toast.success("Rolled back"); router.refresh(); })}>Rollback</Button>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="comments">
            <CommentsPanel contentId={initial.id} comments={initial.comments} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <WorkflowActions role={role} status={initial.status} onChange={changeStatus} />
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {initial.publishedAt ? `Published ${relativeTime(initial.publishedAt)}` : "Not yet published"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">SEO score</CardTitle><CardDescription>Live evaluation</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div className={`text-3xl font-semibold ${seo.score >= 80 ? "text-emerald-500" : seo.score >= 60 ? "text-amber-500" : "text-red-500"}`}>{seo.score}</div>
              <div>
                <div className="text-sm font-medium">Grade {seo.grade}</div>
                <div className="text-xs text-muted-foreground">{seo.checks.filter(c => c.ok).length}/{seo.checks.length} checks pass</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs">
              {seo.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />}
                  <span className={c.ok ? "text-muted-foreground" : ""}>{c.label}{c.hint ? <span className="text-muted-foreground"> · {c.hint}</span> : null}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label className="text-xs">Publish at</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <Button size="sm" variant="outline" disabled={!scheduledAt} onClick={save}>Save schedule</Button>
          </CardContent>
        </Card>

        {can(role, "content.delete") && (
          <Button variant="ghost" className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => {
            if (!confirm("Delete this content? This cannot be undone.")) return;
            deleteContent(initial.id).then(() => { toast.success("Deleted"); router.push("/dashboard/content"); });
          }}>
            <Trash2 /> Delete content
          </Button>
        )}
      </div>
    </div>
  );
}

function WorkflowActions({ role, status, onChange }: { role: Role; status: WorkflowStatus; onChange: (s: WorkflowStatus, msg?: string) => void }) {
  if (status === "DRAFT") return (
    <>
      <Button className="w-full" variant="outline" onClick={() => onChange("IN_REVIEW")}>Submit for review</Button>
      {can(role, "content.publish") && <Button className="w-full" variant="gradient" onClick={() => onChange("PUBLISHED")}>Publish now</Button>}
    </>
  );
  if (status === "IN_REVIEW") return (
    <>
      {can(role, "content.approve") && <Button className="w-full" variant="gradient" onClick={() => onChange("APPROVED")}>Approve</Button>}
      <Button className="w-full" variant="outline" onClick={() => onChange("NEEDS_REVISION", prompt("Notes for the author?") ?? undefined)}>Request changes</Button>
    </>
  );
  if (status === "APPROVED" || status === "NEEDS_REVISION" || status === "SCHEDULED") return (
    <>
      {can(role, "content.publish") && <Button className="w-full" variant="gradient" onClick={() => onChange("PUBLISHED")}>Publish</Button>}
      <Button className="w-full" variant="outline" onClick={() => onChange("DRAFT")}>Move to draft</Button>
    </>
  );
  if (status === "PUBLISHED") return (
    <>
      <Button className="w-full" variant="outline" onClick={() => onChange("DRAFT")}>Unpublish</Button>
      <Button className="w-full" variant="ghost" onClick={() => onChange("ARCHIVED")}>Archive</Button>
    </>
  );
  return <Button className="w-full" variant="outline" onClick={() => onChange("DRAFT")}>Restore to draft</Button>;
}

function CommentsPanel({ contentId, comments }: { contentId: string; comments: any[] }) {
  const [body, setBody] = useState("");
  const router = useRouter();
  return (
    <Card><CardContent className="p-6 space-y-4">
      <div className="space-y-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet — start the conversation.</p>}
        {comments.map((c) => (
          <div key={c.id} className="text-sm border-l-2 border-brand-500 pl-3">
            <div className="font-medium">{c.user?.name || "Anon"} <span className="text-xs text-muted-foreground ml-2">{relativeTime(c.createdAt)}</span></div>
            <div className="text-muted-foreground">{c.body}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Leave a comment…" />
        <Button onClick={async () => { if (!body.trim()) return; await addComment(contentId, body); setBody(""); router.refresh(); }}><MessageSquare /></Button>
      </div>
    </CardContent></Card>
  );
}

