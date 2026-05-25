import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight, FileText, Sparkles, Star, Eye, MessageSquare } from "lucide-react";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { ContentMixChart } from "@/components/dashboard/content-mix-chart";
import { formatNumber, relativeTime } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function Overview() {
  const tenant = await requireTenant();
  const [dealership, counts, recent, activities] = await Promise.all([
    prisma.dealership.findUnique({ where: { id: tenant.dealershipId } }),
    prisma.$transaction([
      prisma.content.count({ where: { dealershipId: tenant.dealershipId, status: "PUBLISHED" } }),
      prisma.content.count({ where: { dealershipId: tenant.dealershipId, status: "DRAFT" } }),
      prisma.content.count({ where: { dealershipId: tenant.dealershipId, status: "IN_REVIEW" } }),
      prisma.review.count({ where: { dealershipId: tenant.dealershipId } }),
      prisma.mediaAsset.count({ where: { dealershipId: tenant.dealershipId } }),
    ]),
    prisma.content.findMany({
      where: { dealershipId: tenant.dealershipId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { author: true },
    }),
    prisma.activity.findMany({
      where: { dealershipId: tenant.dealershipId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: true },
    }),
  ]);

  const [published, drafts, inReview, reviewCount, mediaCount] = counts;

  const stats = [
    { label: "Published", value: formatNumber(published), change: "+12%", icon: FileText, tone: "success" as const },
    { label: "In review", value: formatNumber(inReview), change: "4 today", icon: MessageSquare, tone: "info" as const },
    { label: "AI generated", value: formatNumber(drafts), change: "this week", icon: Sparkles, tone: "brand" as const },
    { label: "Reviews", value: formatNumber(reviewCount), change: `${mediaCount} media`, icon: Star, tone: "warning" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="a3-label text-muted-foreground">{dealership?.city}, {dealership?.state}</div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">{dealership?.name}</h1>
          <p className="text-sm text-muted-foreground">Welcome back — here's what's moving the needle.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/content">View content</Link></Button>
          <Button asChild variant="gradient"><Link href="/dashboard/ai">Open AI Studio <Sparkles /></Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardDescription>{s.label}</CardDescription>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{s.value}</div>
              <Badge variant={s.tone} className="mt-2">{s.change}</Badge>
            </CardContent>
            <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-brand-500/5" />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organic traffic</CardTitle>
                <CardDescription>Last 30 days · GSC + GA4</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/analytics" className="text-xs">
                  View report <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <TrafficChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content mix</CardTitle>
            <CardDescription>by type, last 90 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ContentMixChart />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent content</CardTitle>
              <CardDescription>Latest edits across the workspace</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard/content">All <ArrowUpRight className="h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent className="divide-y">
            {recent.length === 0 && <p className="text-sm text-muted-foreground py-4">No content yet — head to AI Studio to generate your first piece.</p>}
            {recent.map((c) => (
              <Link key={c.id} href={`/dashboard/content/${c.id}`} className="flex items-center justify-between py-3 -mx-2 px-2 rounded-md hover:bg-accent">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.type.replace("_", " ").toLowerCase()} · {relativeTime(c.updatedAt)}
                    {c.aiGenerated && " · AI"}
                  </div>
                </div>
                <Badge variant={c.status === "PUBLISHED" ? "success" : c.status === "IN_REVIEW" ? "info" : "secondary"}>
                  {c.status.replace("_", " ").toLowerCase()}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Activity</CardTitle><CardDescription>Audit feed</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            {activities.map((a) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-brand-500/60" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{a.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.user?.name || "system"} · {relativeTime(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
