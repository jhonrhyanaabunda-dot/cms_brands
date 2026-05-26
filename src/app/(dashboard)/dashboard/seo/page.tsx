import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RedirectsManager } from "./redirects-manager";
import { Search, Globe2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "SEO" };

export default async function SeoIndex() {
  const tenant = await requireTenant();
  const [redirects, contents] = await Promise.all([
    prisma.redirect.findMany({ where: { dealershipId: tenant.dealershipId }, orderBy: { from: "asc" } }),
    prisma.content.findMany({
      where: { dealershipId: tenant.dealershipId, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, seoScore: true, metaTitle: true, metaDescription: true, type: true },
      take: 200,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Search}
        title="SEO"
        description={`${contents.length} published page${contents.length === 1 ? "" : "s"} · ${redirects.length} redirect${redirects.length === 1 ? "" : "s"} · sitemap, schema, and on-page audits.`}
      />

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Sitemap</CardTitle><CardDescription>Auto-generated XML</CardDescription></CardHeader>
          <CardContent className="text-sm">
            <Link className="text-brand-500 font-mono inline-flex items-center gap-1" href={`/sitemap/${tenant.dealershipSlug}`} target="_blank">
              /sitemap/{tenant.dealershipSlug} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Robots.txt</CardTitle><CardDescription>Editable per workspace</CardDescription></CardHeader>
          <CardContent className="text-sm">
            <Link className="text-brand-500 font-mono inline-flex items-center gap-1" href="/robots.txt" target="_blank">/robots.txt <ArrowRight className="h-3 w-3" /></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Live microsite</CardTitle><CardDescription>SEO-first static rendering</CardDescription></CardHeader>
          <CardContent className="text-sm">
            <Link className="text-brand-500 font-mono inline-flex items-center gap-1" href={`/site/${tenant.dealershipSlug}`} target="_blank">/site/{tenant.dealershipSlug} <ArrowRight className="h-3 w-3" /></Link>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="onpage">
        <TabsList>
          <TabsTrigger value="onpage">On-page audit</TabsTrigger>
          <TabsTrigger value="redirects">Redirects</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="onpage">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase text-muted-foreground border-b">
                <div className="col-span-5">Page</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Meta description</div>
                <div className="col-span-2 text-right">Score</div>
              </div>
              <div className="divide-y">
                {contents.map((c) => (
                  <Link key={c.id} href={`/dashboard/content/${c.id}`} className="grid grid-cols-12 items-center px-4 py-2 hover:bg-accent/40">
                    <div className="col-span-5 truncate">
                      <div className="font-medium text-sm">{c.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">/{c.slug}</div>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">{c.type.replace("_"," ").toLowerCase()}</div>
                    <div className="col-span-3 text-xs text-muted-foreground truncate">{c.metaDescription || <span className="text-amber-500">missing</span>}</div>
                    <div className="col-span-2 text-right">
                      <Badge variant={c.seoScore >= 80 ? "success" : c.seoScore >= 60 ? "warning" : "danger"}>{c.seoScore || 0}</Badge>
                    </div>
                  </Link>
                ))}
                {contents.length === 0 && <p className="p-8 text-sm text-muted-foreground text-center">No published pages yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redirects">
          <RedirectsManager initial={redirects} />
        </TabsContent>

        <TabsContent value="schema">
          <Card><CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">JSON-LD is automatically injected on every published page:</p>
            <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto"><code>{`{
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  "name": "Your Dealership",
  "address": { ... },
  "openingHours": ["Mo-Fr 09:00-19:00"],
  "telephone": "+1-555-555-5555"
}`}</code></pre>
            <p className="text-xs text-muted-foreground">FAQ blocks add FAQPage schema; offers add Product/Offer; landing pages add Article.</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
