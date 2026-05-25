import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  return {
    title: d?.name ?? "Dealership",
    description: `${d?.name} — official dealership website.`,
  };
}

export default async function Microsite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dealership = await prisma.dealership.findUnique({ where: { slug } });
  if (!dealership) notFound();

  const home = await prisma.pageNode.findUnique({
    where: { dealershipId_path: { dealershipId: dealership.id, path: "/" } },
  });

  const blocks = JSON.parse((home?.blocks as unknown as string) ?? "[]") as any[];

  return (
    <div>
      <Header dealership={dealership} />
      <main className="max-w-6xl mx-auto">
        {blocks.length === 0 ? (
          <section className="py-32 text-center">
            <h1 className="text-4xl font-semibold">{dealership.name}</h1>
            <p className="mt-2 text-muted-foreground">{dealership.city}, {dealership.state}</p>
            <p className="mt-6 text-sm text-muted-foreground">Home page not yet built. Open the page builder to create one.</p>
          </section>
        ) : (
          blocks.map((b: any) => <BlockRenderer key={b.id} block={b} />)
        )}
      </main>
      <Footer dealership={dealership} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AutoDealer",
            name: dealership.name,
            address: { "@type": "PostalAddress", addressLocality: dealership.city, addressRegion: dealership.state, postalCode: dealership.zip },
            telephone: dealership.phone,
            email: dealership.email,
          }),
        }}
      />
    </div>
  );
}

function Header({ dealership }: { dealership: any }) {
  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <Link href={`/site/${dealership.slug}`} className="font-semibold">{dealership.name}</Link>
        <nav className="hidden md:flex gap-6 text-sm">
          <Link href={`/site/${dealership.slug}/inventory`}>Inventory</Link>
          <Link href={`/site/${dealership.slug}/service`}>Service</Link>
          <Link href={`/site/${dealership.slug}/finance`}>Finance</Link>
          <Link href={`/site/${dealership.slug}/about`}>About</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer({ dealership }: { dealership: any }) {
  return (
    <footer className="mt-12 border-t bg-muted/30">
      <div className="max-w-6xl mx-auto p-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} {dealership.name} · {dealership.city}, {dealership.state} · {dealership.phone}
      </div>
    </footer>
  );
}
