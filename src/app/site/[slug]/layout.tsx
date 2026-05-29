import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { siteThemeVars } from "@/lib/site-theme";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export default async function MicrositeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dealership = await prisma.dealership.findUnique({ where: { slug } });
  if (!dealership) notFound();

  // Tenant theming injected as CSS variables on the root wrapper. The header,
  // footer, and every block renderer read these via `var(--site-primary)` etc.
  return (
    <div style={siteThemeVars(dealership)} className="min-h-screen flex flex-col bg-background">
      <SiteHeader
        dealership={{
          slug: dealership.slug,
          name: dealership.name,
          brand: dealership.brand,
          logoUrl: dealership.logoUrl,
          city: dealership.city,
          state: dealership.state,
          phone: dealership.phone,
        }}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter
        dealership={{
          slug: dealership.slug,
          name: dealership.name,
          brand: dealership.brand,
          city: dealership.city,
          state: dealership.state,
          zip: dealership.zip,
          phone: dealership.phone,
          email: dealership.email,
          domain: dealership.domain,
        }}
      />
    </div>
  );
}
