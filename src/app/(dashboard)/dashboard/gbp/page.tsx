import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe2, Sparkles } from "lucide-react";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "GBP posts" };

export default async function GbpPage() {
  const tenant = await requireTenant();
  const posts = await prisma.content.findMany({
    where: { dealershipId: tenant.dealershipId, type: "GBP_POST" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Globe2 className="h-5 w-5" /> Google Business Profile posts</h1>
          <p className="text-sm text-muted-foreground">Draft, schedule, and publish GBP posts across all locations.</p>
        </div>
        <Button asChild variant="gradient"><Link href="/dashboard/ai"><Sparkles /> AI generate</Link></Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {posts.length === 0 && <Card className="col-span-full"><CardContent className="p-10 text-center text-sm text-muted-foreground">No GBP posts yet.</CardContent></Card>}
        {posts.map((p) => (
          <Link key={p.id} href={`/dashboard/content/${p.id}`}>
            <Card className="hover:shadow-md transition-shadow"><CardContent className="p-5 space-y-2">
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
    </div>
  );
}
