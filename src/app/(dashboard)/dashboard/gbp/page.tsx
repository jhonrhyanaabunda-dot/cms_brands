import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe2, Sparkles } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata = { title: "GBP posts" };

export default async function GbpPage() {
  const tenant = await requireTenant();
  const posts = await prisma.content.findMany({
    where: { dealershipId: tenant.dealershipId, type: "GBP_POST" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe2}
        title="Google Business Profile posts"
        description={`${posts.length} post${posts.length === 1 ? "" : "s"} · draft, schedule, and publish across all locations.`}
        actions={<Button asChild variant="gradient"><Link href="/dashboard/ai"><Sparkles /> AI generate</Link></Button>}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No GBP posts yet"
          description="Generate one in seconds with the AI Studio — it picks tone and CTA for you."
          action={<Button asChild variant="gradient"><Link href="/dashboard/ai"><Sparkles /> Open AI Studio</Link></Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/dashboard/content/${p.id}`}>
              <Card className="hover:shadow-md hover:border-brand-500/40 transition-all"><CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={p.status === "PUBLISHED" ? "success" : "secondary"}>{p.status.toLowerCase().replace("_"," ")}</Badge>
                  <span className="text-xs text-muted-foreground">{relativeTime(p.updatedAt)}</span>
                </div>
                <div className="font-medium">{p.title}</div>
                <p className="text-sm text-muted-foreground line-clamp-3">{p.bodyMarkdown}</p>
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
