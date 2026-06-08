import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { LeadForm } from "@/components/site/lead-form";
import { formatCurrency } from "@/lib/utils";
import { ChevronRight, ArrowRight, Phone } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const v = await prisma.inventoryItem.findFirst({
    where: { id, dealership: { slug } },
    include: { dealership: { select: { name: true } } },
  });
  if (!v) return {};
  const title = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""} · ${v.dealership.name}`;
  return {
    title,
    description: `${v.year} ${v.make} ${v.model} available now at ${v.dealership.name}. VIN ${v.vin}.`,
  };
}

export default async function VehicleDetail({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const v = await prisma.inventoryItem.findFirst({
    where: { id, dealership: { slug } },
    include: { dealership: true },
  });
  if (!v) notFound();

  const d = v.dealership;
  const title = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`;
  const savings =
    v.msrp != null && v.price != null && Number(v.msrp) > Number(v.price)
      ? Number(v.msrp) - Number(v.price)
      : null;

  const specs: { label: string; value: string | number | null }[] = [
    { label: "VIN",            value: v.vin },
    { label: "Stock #",        value: v.stockNumber },
    { label: "Year",           value: v.year },
    { label: "Make",           value: v.make },
    { label: "Model",          value: v.model },
    { label: "Trim",           value: v.trim },
    { label: "Body style",     value: v.bodyStyle },
    { label: "Mileage",        value: v.mileage != null ? `${v.mileage.toLocaleString()} mi` : null },
    { label: "Exterior color", value: v.exteriorColor },
    { label: "Interior color", value: v.interiorColor },
    { label: "Fuel type",      value: v.fuelType },
    { label: "Transmission",   value: v.transmission },
    { label: "Drivetrain",     value: v.drivetrain },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/site/${slug}`} className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/site/${slug}/inventory`} className="hover:text-foreground">Inventory</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground truncate">{title}</span>
      </nav>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-2xl border overflow-hidden relative">
            {v.imageUrl ? (
              <Image src={v.imageUrl} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">No image yet</div>
            )}
            <span
              className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-1"
              style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
            >
              Available
            </span>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Vehicle specs</div>
            </div>
            <dl className="divide-y">
              {specs.filter((s) => s.value).map((s) => (
                <div key={s.label} className="grid grid-cols-2 gap-2 px-5 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="font-medium text-right truncate">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <h1 className="text-2xl font-black tracking-tight leading-tight">{title}</h1>
            {v.bodyStyle && <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{v.bodyStyle}</div>}
            <div className="flex items-end gap-3 pt-1">
              <div className="text-3xl font-black tabular-nums">{formatCurrency(v.price as any)}</div>
              {savings && (
                <div className="text-xs text-muted-foreground">
                  <span className="line-through">{formatCurrency(v.msrp as any)}</span>
                  <span className="ml-2 font-semibold" style={{ color: "var(--site-primary)" }}>save {formatCurrency(savings as any)}</span>
                </div>
              )}
            </div>
            {d.phone && (
              <a
                href={`tel:${d.phone}`}
                className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold w-full justify-center hover:border-[color:var(--site-primary)] transition-colors"
              >
                <Phone className="h-4 w-4" /> Call {d.phone}
              </a>
            )}
            <Link
              href={`/site/${slug}/finance`}
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold w-full hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
            >
              Get pre-qualified <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="text-sm font-semibold">Request a test drive</div>
            <LeadForm
              dealershipId={d.id}
              kind="testdrive"
              ctaLabel="Request test drive"
              showVehicle
            />
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Vehicle",
            name: title,
            vehicleIdentificationNumber: v.vin,
            modelDate: String(v.year),
            manufacturer: v.make,
            model: v.model,
            color: v.exteriorColor ?? undefined,
            mileageFromOdometer: v.mileage != null ? { "@type": "QuantitativeValue", value: v.mileage, unitCode: "SMI" } : undefined,
            fuelType: v.fuelType ?? undefined,
            offers: v.price != null ? {
              "@type": "Offer",
              priceCurrency: "USD",
              price: v.price,
              availability: "https://schema.org/InStock",
              seller: { "@type": "AutoDealer", name: d.name },
            } : undefined,
          }),
        }}
      />
    </div>
  );
}
