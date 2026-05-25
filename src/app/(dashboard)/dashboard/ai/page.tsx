import { AIStudio } from "./studio";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, relativeTime } from "@/lib/utils";
import { History, Sparkles } from "lucide-react";

export const metadata = { title: "AI Studio" };

const KIND_LABEL: Record<string, string> = {
  blog: "Blog",
  landing: "Landing page",
  gbp_post: "GBP post",
};

export default async function AIStudioPage() {
  const tenant = await requireTenant();
  const recent = await prisma.aiGeneration.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  const totalTokens = recent.reduce((s, r) => s + (r.tokensIn ?? 0) + (r.tokensOut ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Studio</h1>
        <p className="text-sm text-muted-foreground">Generate blogs, landing pages, GBP posts, and bulk city pages.</p>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="bg-card border">
          <TabsTrigger value="generate"><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1.5" /> History ({recent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <AIStudio />
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Generations</div>
              <div className="text-2xl font-semibold">{formatNumber(recent.length)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total tokens</div>
              <div className="text-2xl font-semibold">{formatNumber(totalTokens)}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Latest</div>
              <div className="text-2xl font-semibold">{recent[0] ? relativeTime(recent[0].createdAt) : "—"}</div>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {recent.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No AI generations yet — head to the Generate tab to create one.
                </div>
              )}
              <ul className="divide-y">
                {recent.map((r) => (
                  <li key={r.id} className="p-4 grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-2 flex flex-col gap-1">
                      <Badge variant="secondary" className="w-fit">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                      <span className="text-[11px] text-muted-foreground">{relativeTime(r.createdAt)}</span>
                    </div>
                    <div className="col-span-7 min-w-0">
                      <div className="text-xs text-muted-foreground">Prompt</div>
                      <pre className="text-xs whitespace-pre-wrap font-mono line-clamp-4 leading-snug">
                        {r.prompt}
                      </pre>
                    </div>
                    <div className="col-span-3 text-right text-[11px] text-muted-foreground space-y-0.5">
                      <div>model · {r.model}</div>
                      <div>in {formatNumber(r.tokensIn ?? 0)} · out {formatNumber(r.tokensOut ?? 0)}</div>
                      {r.costUsd != null && <div>cost · ${r.costUsd.toFixed(4)}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
