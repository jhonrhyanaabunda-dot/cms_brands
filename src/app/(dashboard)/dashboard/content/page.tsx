import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Sparkles } from "lucide-react";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Content" };

const STATUS_VARIANT: Record<string, "secondary" | "success" | "info" | "warning" | "danger"> = {
  DRAFT: "secondary",
  IN_REVIEW: "info",
  NEEDS_REVISION: "warning",
  APPROVED: "info",
  SCHEDULED: "info",
  PUBLISHED: "success",
  ARCHIVED: "secondary",
};

export default async function ContentList({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; q?: string }> }) {
  const tenant = await requireTenant();
  const sp = await searchParams;

  const where: any = { dealershipId: tenant.dealershipId };
  if (sp.type) where.type = sp.type;
  if (sp.status) where.status = sp.status;
  if (sp.q) where.title = { contains: sp.q, mode: "insensitive" };

  const items = await prisma.content.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { author: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground">All pages, blogs, and AI-generated content for this dealership.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/ai"><Sparkles /> AI Studio</Link></Button>
          <Button asChild variant="gradient"><Link href="/dashboard/content/new"><Plus /> New content</Link></Button>
        </div>
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input name="q" defaultValue={sp.q} placeholder="Search by title…" className="h-9 pl-8" />
          </div>
          <select name="type" defaultValue={sp.type ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">All types</option>
            {["BLOG","LANDING_PAGE","CITY_PAGE","DEALER_PAGE","OEM_PAGE","GBP_POST","FAQ","SERVICE_PAGE","MODEL_RESEARCH","COMPARE_PAGE","TRADE_IN_PAGE","FINANCE_PAGE","OFFER"].map((t) => (
              <option key={t} value={t}>{t.replace("_"," ").toLowerCase()}</option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="">All statuses</option>
            {Object.keys(STATUS_VARIANT).map((s) => (
              <option key={s} value={s}>{s.replace("_"," ").toLowerCase()}</option>
            ))}
          </select>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
      </Card>

      <Card>
        <div className="grid grid-cols-12 px-4 py-2 text-xs text-muted-foreground border-b uppercase tracking-wider">
          <div className="col-span-6">Title</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Updated</div>
        </div>
        <div className="divide-y">
          {items.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No content yet. <Link href="/dashboard/ai" className="text-brand-500 hover:underline">Generate one with AI →</Link>
            </div>
          )}
          {items.map((c) => (
            <Link href={`/dashboard/content/${c.id}`} key={c.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/40 transition-colors">
              <div className="col-span-6 min-w-0">
                <div className="font-medium truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  /{c.slug} {c.aiGenerated && "· AI"} {c.author?.name && `· ${c.author.name}`}
                </div>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">{c.type.replace("_"," ").toLowerCase()}</div>
              <div className="col-span-2"><Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>{c.status.replace("_"," ").toLowerCase()}</Badge></div>
              <div className="col-span-2 text-right text-xs text-muted-foreground">{relativeTime(c.updatedAt)}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
