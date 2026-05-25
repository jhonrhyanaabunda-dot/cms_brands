import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchGscSummary, fetchGa4Summary, fetchGbpInsights, fetchPageSpeed, buildTrafficSeries } from "@/lib/google";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { formatNumber } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const tenant = await requireTenant();
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const [gsc, ga4, gbp, pagespeed] = await Promise.all([
    fetchGscSummary(dealer?.gscSiteUrl, dealer?.id),
    fetchGa4Summary(dealer?.ga4PropertyId, dealer?.id),
    fetchGbpInsights(dealer?.gbpAccountId, dealer?.id),
    fetchPageSpeed(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/site/${dealer?.slug}`),
  ]);
  const series = buildTrafficSeries(dealer?.id, 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Analytics</h1>
        <p className="text-sm text-muted-foreground">GSC + GA4 + GBP + PageSpeed in one view.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sessions (GA4)" value={formatNumber(ga4.sessions)} tone="info" />
        <Stat label="Organic clicks (GSC)" value={formatNumber(gsc.clicks)} tone="brand" />
        <Stat label="GBP profile views" value={formatNumber(gbp.profileViews)} tone="success" />
        <Stat label="Conversions" value={formatNumber(ga4.conversions)} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organic traffic — last 30 days</CardTitle>
          <CardDescription>GSC + GA4 unified</CardDescription>
        </CardHeader>
        <CardContent className="h-72"><TrafficChart data={series} /></CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top search queries</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {gsc.topQueries.map((q) => (
              <div key={q.query} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <span className="truncate">{q.query}</span>
                <span className="text-muted-foreground text-xs">{formatNumber(q.clicks)} clicks · {formatNumber(q.impressions)} impr.</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top pages (GA4)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {ga4.topPages.map((p) => (
              <div key={p.path} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <span className="font-mono">{p.path}</span>
                <span className="text-muted-foreground text-xs">{formatNumber(p.views)} views</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">PageSpeed</CardTitle><CardDescription>Lighthouse</CardDescription></CardHeader>
          <CardContent className="flex gap-6">
            <Gauge label="Performance" value={pagespeed.performance} />
            <Gauge label="SEO" value={pagespeed.seo} />
            <Gauge label="A11y" value={pagespeed.accessibility} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">GBP</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Calls</span><span>{formatNumber(gbp.calls)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Direction requests</span><span>{formatNumber(gbp.directionRequests)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Website clicks</span><span>{formatNumber(gbp.websiteClicks)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">GA4 engagement</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Engaged sessions</span><span>{formatNumber(ga4.engagedSessions)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg session duration</span><span>{Math.round(ga4.avgSessionDuration)}s</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Users</span><span>{formatNumber(ga4.users)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "info" | "brand" | "success" | "warning" }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <Badge variant={tone} className="mt-2">live</Badge>
      </CardContent>
    </Card>
  );
}

function Gauge({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? "text-emerald-500" : value >= 70 ? "text-amber-500" : "text-red-500";
  return (
    <div className="text-center">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
