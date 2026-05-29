import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BlockRenderer, type BlockCtx } from "@/components/blocks/block-renderer";
import { newBlock } from "@/lib/blocks";
import type { Block } from "@/lib/blocks";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) return {};
  const title = `${d.name}${d.city ? ` · ${d.city}, ${d.state ?? ""}` : ""}`;
  const description = `Shop inventory, schedule service, and get financing at ${d.name}. Factory-certified ${d.brand?.replace(/_/g, " ") ?? ""} experience.`.trim();
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: d.name,
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `/site/${d.slug}` },
  };
}

export default async function Microsite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dealership = await prisma.dealership.findUnique({ where: { slug } });
  if (!dealership) notFound();

  // Parallel-fetch everything the homepage might need so blocks render real
  // data instead of placeholders.
  const [home, inventory, offers] = await Promise.all([
    prisma.pageNode.findUnique({
      where: { dealershipId_path: { dealershipId: dealership.id, path: "/" } },
    }),
    prisma.inventoryItem.findMany({
      where: { dealershipId: dealership.id, status: "AVAILABLE" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true, year: true, make: true, model: true, trim: true,
        vin: true, mileage: true, price: true, imageUrl: true, status: true,
      },
    }),
    prisma.offer.findMany({
      where: { dealershipId: dealership.id, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true, headline: true, subheadline: true, oemBrand: true,
        monthlyPayment: true, apr: true, termMonths: true, disclaimer: true,
      },
    }),
  ]);

  const blocks: Block[] = (() => {
    if (home?.blocks) {
      try { return JSON.parse(home.blocks as unknown as string) as Block[]; } catch { /* fall through to default */ }
    }
    // No homepage built yet — compose a sensible default from real data.
    return defaultHomeBlocks(dealership);
  })();

  const ctx: BlockCtx = {
    dealershipId: dealership.id,
    dealershipSlug: dealership.slug,
    inventory: inventory.map((i) => ({ ...i, price: i.price as any })),
    offers: offers.map((o) => ({ ...o, monthlyPayment: o.monthlyPayment as any, apr: o.apr as any })),
  };

  return (
    <>
      {blocks.map((b) => <BlockRenderer key={b.id} block={b} ctx={ctx} />)}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildDealerSchema(dealership)),
        }}
      />
    </>
  );
}

/**
 * Default-home composition. Built from the dealership record + seeded
 * defaults. Used when no PageNode at "/" exists, so a brand-new dealership
 * already has a useable homepage on day one.
 */
function defaultHomeBlocks(d: { name: string; brand: string | null; city: string | null; state: string | null }): Block[] {
  const brandLabel = d.brand?.replace(/_/g, " ") ?? "your next vehicle";
  const where = d.city ? ` in ${d.city}${d.state ? `, ${d.state}` : ""}` : "";
  const hero = newBlock("hero");
  hero.props = {
    ...hero.props,
    eyebrow: brandLabel,
    headline: `Find your next ${brandLabel}${where}`,
    subheadline: "Hand-picked inventory, transparent pricing, and a service team that treats your vehicle like our own.",
    ctaLabel: "Shop inventory",
    ctaHref: "inventory",
    align: "center",
  };

  const inv = newBlock("inventory");
  inv.props = { ...inv.props, headline: "Featured inventory", subheadline: "Available now and ready to drive.", limit: 6 };

  const off = newBlock("offers");
  off.props = { ...off.props, headline: "This month's offers", limit: 4 };

  const fin = newBlock("financing");
  fin.props = {
    ...fin.props,
    headline: "Financing that works for you",
    bullets: ["Pre-qualify online in 60 seconds", "All credit considered", "Lock today's rate before it changes"],
    ctaLabel: "Apply now",
    ctaHref: "finance",
  };

  const svc = newBlock("service");
  svc.props = {
    ...svc.props,
    headline: "Factory-certified service",
    services: [
      { name: "Routine maintenance", description: "Oil, tires, filters, and multi-point inspection on every visit." },
      { name: "Brake service",        description: "Pads, rotors, fluid — OEM parts and a written quote before we touch a tool." },
      { name: "Diagnostics",          description: "Factory tooling pinpoints the cause before we replace anything." },
    ],
  };

  const stats = newBlock("stats");
  stats.props = {
    ...stats.props,
    items: [
      { label: "Customer rating",   value: "4.9★" },
      { label: "Years in business", value: "20+" },
      { label: "5-star reviews",    value: "2,400+" },
    ],
  };

  const test = newBlock("testimonials");
  test.props = {
    ...test.props,
    headline: "What customers say",
    items: [
      { quote: "Best dealership experience I've ever had. Honest, fast, and the price matched the quote exactly.", author: "Sarah M.", rating: 5 },
      { quote: "They explained everything, sent photos before any work, and had me back on the road by noon.", author: "James L.", rating: 5 },
      { quote: "First dealership service department I actually trust.", author: "Pat R.", rating: 5 },
    ],
  };

  const cta = newBlock("cta");
  cta.props = {
    ...cta.props,
    headline: "Ready when you are",
    subheadline: "Browse inventory, schedule service, or get pre-qualified online — all in under a minute.",
    ctaLabel: "Get started",
    ctaHref: "inventory",
  };

  return [hero, inv, off, fin, svc, stats, test, cta];
}

function buildDealerSchema(d: {
  name: string; brand: string | null; city: string | null; state: string | null; zip: string | null;
  phone: string | null; email: string | null; slug: string; domain: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: d.name,
    brand: d.brand ?? undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: d.city ?? undefined,
      addressRegion: d.state ?? undefined,
      postalCode: d.zip ?? undefined,
      addressCountry: "US",
    },
    telephone: d.phone ?? undefined,
    email: d.email ?? undefined,
    url: d.domain ? `https://${d.domain}` : undefined,
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "09:00", closes: "19:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "11:00", closes: "17:00" },
    ],
  };
}
