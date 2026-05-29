import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Sparkles, Coins, Zap, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, relativeTime } from "@/lib/utils";
import { UsageCharts } from "./usage-charts";

export const metadata = { title: "AI usage" };

// Rough $/token cost so the dashboard shows meaningful dollars even before
// a real OPENAI_API_KEY is configured. Adjust to taste; these are 2025
// flash/cheap tier numbers, in USD per token.
const COST_PER_TOKEN: Record<string, { in: number; out: number }> = {
  "gemini-flash-latest":    { in: 0.000_000_075, out: 0.000_000_300 },
  "gemini-2.0-flash":       { in: 0.000_000_075, out: 0.000_000_300 },
  "gpt-4o-mini":            { in: 0.000_000_150, out: 0.000_000_600 },
};
function estimateCost(model: string, tokensIn: number, tokensOut: number) {
  const c = COST_PER_TOKEN[model] ?? { in: 0.000_000_150, out: 0.000_000_600 };
  return tokensIn * c.in + tokensOut * c.out;
}

export default async function AiUsagePage() {
  const tenant = await requireTenant();
  const since = new Date(Date.now() - 30 * 86_400_000);

  const generations = await prisma.aiGeneration.findMany({
    where: { dealershipId: tenant.dealershipId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  if (generations.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Sparkles}
          title="AI usage"
          description="Token usage and estimated cost across all AI-powered features."
        />
        <EmptyState
          icon={Sparkles}
          title="No AI activity in the last 30 days"
          description="Generate a blog, run a workflow, or draft a review reply — usage will show up here."
        />
      </div>
    );
  }

  // Totals.
  const totalRuns = generations.length;
  const totalIn  = generations.reduce((s, g) => s + (g.tokensIn  ?? 0), 0);
  const totalOut = generations.reduce((s, g) => s + (g.tokensOut ?? 0), 0);
  const totalCost = generations.reduce(
    (s, g) => s + estimateCost(g.model, g.tokensIn ?? 0, g.tokensOut ?? 0),
    0
  );

  // Daily series (last 30 days).
  const byDay = new Map<string, { day: string; tokens: number; runs: number; cost: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { day: key.slice(5), tokens: 0, runs: 0, cost: 0 });
  }
  for (const g of generations) {
    const key = g.createdAt.toISOString().slice(0, 10);
    const row = byDay.get(key);
    if (!row) continue;
    row.tokens += (g.tokensIn ?? 0) + (g.tokensOut ?? 0);
    row.runs += 1;
    row.cost += estimateCost(g.model, g.tokensIn ?? 0, g.tokensOut ?? 0);
  }
  const daily = Array.from(byDay.values());

  // By kind.
  const kindMap = new Map<string, { kind: string; tokens: number; runs: number; cost: number }>();
  for (const g of generations) {
    const row = kindMap.get(g.kind) ?? { kind: g.kind, tokens: 0, runs: 0, cost: 0 };
    row.tokens += (g.tokensIn ?? 0) + (g.tokensOut ?? 0);
    row.runs += 1;
    row.cost += estimateCost(g.model, g.tokensIn ?? 0, g.tokensOut ?? 0);
    kindMap.set(g.kind, row);
  }
  const byKind = Array.from(kindMap.values()).sort((a, b) => b.tokens - a.tokens);

  // By model.
  const modelMap = new Map<string, { model: string; tokens: number; runs: number; cost: number }>();
  for (const g of generations) {
    const row = modelMap.get(g.model) ?? { model: g.model, tokens: 0, runs: 0, cost: 0 };
    row.tokens += (g.tokensIn ?? 0) + (g.tokensOut ?? 0);
    row.runs += 1;
    row.cost += estimateCost(g.model, g.tokensIn ?? 0, g.tokensOut ?? 0);
    modelMap.set(g.model, row);
  }
  const byModel = Array.from(modelMap.values()).sort((a, b) => b.tokens - a.tokens);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="AI usage"
        description={`${formatNumber(totalRuns)} generations · last 30 days · token + cost breakdowns from the AiGeneration audit log.`}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Runs"          value={formatNumber(totalRuns)} icon={Zap}        tone="info" />
        <Stat label="Input tokens"  value={formatNumber(totalIn)}   icon={TrendingUp} tone="brand" />
        <Stat label="Output tokens" value={formatNumber(totalOut)}  icon={TrendingUp} tone="success" />
        <Stat label="Est. cost"     value={`$${totalCost.toFixed(4)}`} icon={Coins}    tone="warning" />
      </div>

      <UsageCharts daily={daily} byKind={byKind} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">By kind</CardTitle><CardDescription>What's burning the most tokens.</CardDescription></CardHeader>
          <CardContent className="divide-y">
            {byKind.map((k) => (
              <div key={k.kind} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{k.kind}</Badge>
                  <span className="text-muted-foreground">{k.runs} run{k.runs === 1 ? "" : "s"}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium tabular-nums">{formatNumber(k.tokens)} tok</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">${k.cost.toFixed(4)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By model</CardTitle><CardDescription>Which provider/model handled the work.</CardDescription></CardHeader>
          <CardContent className="divide-y">
            {byModel.map((m) => (
              <div key={m.model} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{m.model}</Badge>
                  <span className="text-muted-foreground">{m.runs} run{m.runs === 1 ? "" : "s"}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium tabular-nums">{formatNumber(m.tokens)} tok</div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">${m.cost.toFixed(4)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent runs</CardTitle><CardDescription>Last 30 generations.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {generations.slice(0, 30).map((g) => (
              <div key={g.id} className="px-4 py-2.5 grid grid-cols-12 gap-2 text-sm items-center">
                <div className="col-span-2"><Badge variant="secondary">{g.kind}</Badge></div>
                <div className="col-span-3 text-xs text-muted-foreground truncate font-mono">{g.model}</div>
                <div className="col-span-3 text-xs text-muted-foreground truncate">{g.prompt.slice(0, 80)}…</div>
                <div className="col-span-2 text-right text-xs text-muted-foreground tabular-nums">
                  {g.tokensIn ?? 0} → {g.tokensOut ?? 0}
                </div>
                <div className="col-span-2 text-right text-xs text-muted-foreground" title={g.createdAt.toLocaleString()}>
                  {relativeTime(g.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: "info" | "brand" | "success" | "warning" }) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardDescription>{label}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <Badge variant={tone} className="mt-2">last 30d</Badge>
      </CardContent>
      <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-brand-500/5" />
    </Card>
  );
}
