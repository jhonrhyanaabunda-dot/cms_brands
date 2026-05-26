import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewPageDialog } from "./new-page-dialog";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Page builder" };

export default async function PagesIndex() {
  const tenant = await requireTenant();
  const pages = await prisma.pageNode.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title="Page builder"
        description={`${pages.length} page${pages.length === 1 ? "" : "s"} · drag-drop blocks, autosave, live device preview.`}
        actions={<NewPageDialog />}
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No pages yet"
          description="Click “New page” to start a layout with blocks like Hero, CTA, Inventory, FAQ, and more."
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((p) => {
            const blockCount = (() => { try { return (JSON.parse(p.blocks ?? "[]") as any[]).length; } catch { return 0; }})();
            return (
              <Link key={p.id} href={`/dashboard/pages/${p.id}`}>
                <Card className="hover:shadow-md hover:border-brand-500/40 transition-all">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{p.title}</div>
                      <Badge variant={p.published ? "success" : "secondary"}>{p.published ? "live" : "draft"}</Badge>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{p.path}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{blockCount} block{blockCount === 1 ? "" : "s"}</span>
                      <span title={new Date(p.updatedAt).toLocaleString()}>updated {relativeTime(p.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
