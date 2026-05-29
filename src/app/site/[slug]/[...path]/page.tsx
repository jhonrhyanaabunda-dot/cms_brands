import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { BlockRenderer, type BlockCtx, renderMarkdown } from "@/components/blocks/block-renderer";
import type { Block } from "@/lib/blocks";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";

type Params = { slug: string; path: string[] };

async function load({ slug, path }: Params) {
  const dealership = await prisma.dealership.findUnique({ where: { slug } });
  if (!dealership) return null;
  const fullPath = "/" + path.join("/");

  const redirectRow = await prisma.redirect.findFirst({
    where: { dealershipId: dealership.id, from: fullPath },
  });
  if (redirectRow) return { dealership, redirect: redirectRow };

  const page = await prisma.pageNode.findUnique({
    where: { dealershipId_path: { dealershipId: dealership.id, path: fullPath } },
  });
  if (page?.published) return { dealership, page };

  if (path.length === 1) {
    const content = await prisma.content.findUnique({
      where: { dealershipId_slug: { dealershipId: dealership.id, slug: path[0] } },
    });
    if (content?.status === "PUBLISHED") return { dealership, content };
  }
  return { dealership, notFound: true };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const r = await load(p);
  if (!r) return {};
  if ("content" in r && r.content) {
    return {
      title: r.content.metaTitle || r.content.title,
      description: r.content.metaDescription ?? undefined,
      openGraph: {
        title: r.content.metaTitle || r.content.title,
        description: r.content.metaDescription ?? undefined,
        images: r.content.ogImageUrl ? [r.content.ogImageUrl] : undefined,
        type: "article",
        publishedTime: r.content.publishedAt?.toISOString(),
      },
      twitter: { card: "summary_large_image" },
      robots: r.content.noindex ? { index: false } : undefined,
      alternates: { canonical: `/site/${p.slug}/${p.path.join("/")}` },
    };
  }
  if ("page" in r && r.page) {
    return { title: r.page.title, alternates: { canonical: `/site/${p.slug}${r.page.path}` } };
  }
  return {};
}

export default async function SitePage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const r = await load(p);
  if (!r) notFound();
  if ("redirect" in r && r.redirect) redirect(r.redirect.to);
  if ("notFound" in r) notFound();

  if ("page" in r && r.page) {
    // Render a builder page — pre-fetch inventory + offers so blocks display real data.
    const blocks: Block[] = (() => {
      try { return JSON.parse((r.page.blocks as unknown as string) ?? "[]") as Block[]; }
      catch { return []; }
    })();
    const [inventory, offers] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { dealershipId: r.dealership.id, status: "AVAILABLE" },
        orderBy: { updatedAt: "desc" }, take: 12,
        select: { id: true, year: true, make: true, model: true, trim: true, vin: true, mileage: true, price: true, imageUrl: true, status: true },
      }),
      prisma.offer.findMany({
        where: { dealershipId: r.dealership.id, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" }, take: 8,
        select: { id: true, headline: true, subheadline: true, oemBrand: true, monthlyPayment: true, apr: true, termMonths: true, disclaimer: true },
      }),
    ]);
    const ctx: BlockCtx = {
      dealershipId: r.dealership.id,
      dealershipSlug: r.dealership.slug,
      inventory: inventory.map((i) => ({ ...i, price: i.price as any })),
      offers: offers.map((o) => ({ ...o, monthlyPayment: o.monthlyPayment as any, apr: o.apr as any })),
    };
    return <>{blocks.map((b) => <BlockRenderer key={b.id} block={b} ctx={ctx} />)}</>;
  }

  const c = (r as any).content;
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/site/${p.slug}`} className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{c.title}</span>
      </nav>
      <header className="space-y-3 border-b pb-6">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">{c.title}</h1>
        {c.excerpt && <p className="text-lg text-muted-foreground leading-relaxed">{c.excerpt}</p>}
        {c.publishedAt && (
          <div className="text-xs text-muted-foreground">
            Published {new Date(c.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        )}
      </header>
      <div
        className="text-base leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_a]:underline [&_a]:font-medium [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4"
        style={{ ["--tw-prose-links" as any]: "var(--site-primary)" }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(c.bodyMarkdown ?? "") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: c.title,
            description: c.excerpt ?? c.metaDescription ?? undefined,
            datePublished: c.publishedAt?.toISOString?.() ?? undefined,
            dateModified: c.updatedAt?.toISOString?.() ?? undefined,
            author: { "@type": "Organization", name: r.dealership.name },
            publisher: { "@type": "Organization", name: r.dealership.name },
          }),
        }}
      />
    </article>
  );
}
