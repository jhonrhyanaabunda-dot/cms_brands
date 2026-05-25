import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import Link from "next/link";
import type { Metadata } from "next";

type Params = { slug: string; path: string[] };

async function load({ slug, path }: Params) {
  const dealership = await prisma.dealership.findUnique({ where: { slug } });
  if (!dealership) return null;
  const fullPath = "/" + path.join("/");

  // Redirect check
  const redirectRow = await prisma.redirect.findFirst({
    where: { dealershipId: dealership.id, from: fullPath },
  });
  if (redirectRow) return { dealership, redirect: redirectRow };

  // Try PageNode first
  const page = await prisma.pageNode.findUnique({
    where: { dealershipId_path: { dealershipId: dealership.id, path: fullPath } },
  });
  if (page?.published) return { dealership, page };

  // Then Content slug (single-level)
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
      },
      robots: r.content.noindex ? { index: false } : undefined,
    };
  }
  if ("page" in r && r.page) {
    return { title: r.page.title };
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
    const blocks = JSON.parse((r.page.blocks as unknown as string) ?? "[]") as any[];
    return (
      <main className="max-w-6xl mx-auto">
        {blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}
      </main>
    );
  }

  const c = (r as any).content;
  return (
    <main className="max-w-3xl mx-auto p-8">
      <article className="space-y-4">
        <Link href={`/site/${p.slug}`} className="text-xs text-muted-foreground">← back</Link>
        <h1 className="text-4xl font-semibold">{c.title}</h1>
        {c.excerpt && <p className="text-lg text-muted-foreground">{c.excerpt}</p>}
        <div
          className="text-sm leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_a]:text-brand-500 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: simpleMd(c.bodyMarkdown ?? "") }}
        />
      </article>
      {c.schemaJson && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: c.schemaJson }} />
      )}
    </main>
  );
}

function simpleMd(s: string) {
  return s
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/^(?!<)/gm, "<p>");
}
