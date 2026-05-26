import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ContentListClient, type ContentRow } from "./content-list";

export const metadata = { title: "Content" };

export default async function ContentList() {
  const tenant = await requireTenant();

  const items = await prisma.content.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
    take: 500,
    include: { author: { select: { name: true, email: true } } },
  });

  const rows: ContentRow[] = items.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    type: c.type as ContentRow["type"],
    status: c.status as ContentRow["status"],
    updatedAt: c.updatedAt.toISOString(),
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
    aiGenerated: c.aiGenerated,
    authorName: c.author?.name ?? c.author?.email ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Content"
        description="All pages, blogs, and AI-generated content for this dealership."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/dashboard/ai"><Sparkles /> AI Studio</Link></Button>
            <Button asChild variant="gradient"><Link href="/dashboard/content/new"><Plus /> New content</Link></Button>
          </>
        }
      />
      <ContentListClient initialItems={rows} role={tenant.role} />
    </div>
  );
}
