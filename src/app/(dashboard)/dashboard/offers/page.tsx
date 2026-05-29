import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Tag } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { OffersClient, type OfferRow } from "./offers-client";

export const metadata = { title: "Offers" };

export default async function OffersPage() {
  const tenant = await requireTenant();
  const offers = await prisma.offer.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
  });
  const rows: OfferRow[] = offers.map((o) => ({
    id: o.id,
    headline: o.headline, subheadline: o.subheadline, detail: o.detail,
    ctaLabel: o.ctaLabel, ctaUrl: o.ctaUrl, imageUrl: o.imageUrl,
    startsAt:  o.startsAt  ? o.startsAt.toISOString()  : null,
    expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
    oemBrand: o.oemBrand, model: o.model,
    monthlyPayment: o.monthlyPayment, apr: o.apr, termMonths: o.termMonths,
    disclaimer: o.disclaimer, status: (o as any).status ?? "ACTIVE",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Tag}
        title="Lease & finance offers"
        description={`${rows.length} offer${rows.length === 1 ? "" : "s"} · create, edit, and archive in place.`}
      />
      <OffersClient initial={rows} role={tenant.role} />
    </div>
  );
}
