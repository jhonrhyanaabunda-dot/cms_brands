import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) return new NextResponse("Not found", { status: 404 });

  const content = await prisma.content.findMany({
    where: { dealershipId: d.id, status: "PUBLISHED", noindex: false },
    select: { slug: true, updatedAt: true, type: true },
  });
  const pages = await prisma.pageNode.findMany({
    where: { dealershipId: d.id, published: true },
    select: { path: true, updatedAt: true },
  });

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") + `/site/${d.slug}`;
  const urls = [
    `<url><loc>${base}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...pages.map((p) => `<url><loc>${base}${p.path}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`),
    ...content.map((c) => `<url><loc>${base}/${c.slug}</loc><lastmod>${c.updatedAt.toISOString()}</lastmod></url>`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
}
