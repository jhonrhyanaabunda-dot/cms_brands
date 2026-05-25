import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewPageDialog } from "./new-page-dialog";
import { Layers } from "lucide-react";

export const metadata = { title: "Page builder" };

export default async function PagesIndex() {
  const tenant = await requireTenant();
  const pages = await prisma.pageNode.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Layers className="h-5 w-5" /> Page builder</h1>
          <p className="text-sm text-muted-foreground">Build full dealership pages with reusable blocks.</p>
        </div>
        <NewPageDialog />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No pages yet. Click "New page" to start building.
            </CardContent>
          </Card>
        )}
        {pages.map((p) => (
          <Link key={p.id} href={`/dashboard/pages/${p.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{p.title}</div>
                  <Badge variant={p.published ? "success" : "secondary"}>{p.published ? "live" : "draft"}</Badge>
                </div>
                <div className="text-xs font-mono text-muted-foreground">{p.path}</div>
                <div className="text-xs text-muted-foreground">{(() => { try { return (JSON.parse(p.blocks ?? "[]") as any[]).length; } catch { return 0; }})()} blocks</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
