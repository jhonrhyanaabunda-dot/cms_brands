import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

type SP = { make?: string; body?: string; max?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) return {};
  return {
    title: `Inventory · ${d.name}`,
    description: `Browse new and pre-owned vehicles available at ${d.name}.`,
  };
}

export default async function InventoryListing({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SP>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) notFound();

  // Filter clauses driven by query string. SQLite is case-insensitive on
  // LIKE by default but Prisma's `contains` defaults to case-sensitive;
  // we lowercase both sides via a where clause that uses contains+mode=insensitive
  // on Postgres and a plain contains on SQLite. For the demo SQLite db that's fine.
  const where: any = { dealershipId: d.id, status: "AVAILABLE" };
  if (sp.make) where.make = { contains: sp.make };
  if (sp.body) where.bodyStyle = { contains: sp.body };
  if (sp.max)  where.price = { lte: Number(sp.max) || undefined };

  const [items, makeRows, bodyRows] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
    prisma.inventoryItem.findMany({
      where: { dealershipId: d.id, status: "AVAILABLE" },
      distinct: ["make"],
      select: { make: true },
      orderBy: { make: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { dealershipId: d.id, status: "AVAILABLE", bodyStyle: { not: null } },
      distinct: ["bodyStyle"],
      select: { bodyStyle: true },
      orderBy: { bodyStyle: "asc" },
    }),
  ]);

  const makes = Array.from(new Set(makeRows.map((r) => r.make).filter(Boolean) as string[]));
  const bodies = Array.from(new Set(bodyRows.map((r) => r.bodyStyle).filter(Boolean) as string[]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/site/${slug}`} className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Inventory</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          {items.length} vehicle{items.length === 1 ? "" : "s"} available at {d.name}{d.city ? ` in ${d.city}` : ""}.
        </p>
      </header>

      <FilterBar slug={slug} makes={makes} bodies={bodies} active={sp} />

      {items.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center space-y-2">
          <div className="text-sm font-medium">No matches</div>
          <div className="text-xs text-muted-foreground">Try clearing filters or browsing all inventory.</div>
          <Link href={`/site/${slug}/inventory`} className="inline-flex items-center gap-1 text-sm font-medium underline pt-2" style={{ color: "var(--site-primary)" }}>
            View all inventory <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((v) => (
            <Link
              key={v.id}
              href={`/site/${slug}/inventory/${v.id}`}
              className="group rounded-2xl border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="aspect-[16/10] bg-muted relative">
                {v.imageUrl ? (
                  <Image
                    src={v.imageUrl}
                    alt={`${v.year} ${v.make} ${v.model}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground px-4 text-center">
                    {v.year} {v.make} {v.model}
                  </div>
                )}
                <span
                  className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
                >
                  Available
                </span>
              </div>
              <div className="p-4 space-y-1">
                <div className="font-semibold truncate">
                  {v.year} {v.make} {v.model}
                  {v.trim && <span className="text-muted-foreground font-normal"> {v.trim}</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  VIN {v.vin} · {v.mileage?.toLocaleString() ?? 0} mi{v.bodyStyle && ` · ${v.bodyStyle}`}
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <div className="font-bold text-lg">{formatCurrency(v.price as any)}</div>
                  <span
                    className="text-xs font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                    style={{ color: "var(--site-primary)" }}
                  >
                    Details <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({
  slug, makes, bodies, active,
}: { slug: string; makes: string[]; bodies: string[]; active: SP }) {
  const hasFilter = !!(active.make || active.body || active.max);
  const Chip = ({ label, qs, isActive }: { label: string; qs: string; isActive: boolean }) => (
    <Link
      href={`/site/${slug}/inventory${qs ? `?${qs}` : ""}`}
      prefetch={false}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        isActive
          ? "border-[color:var(--site-primary)] bg-[color:var(--site-primary)]/10 font-semibold"
          : "hover:border-foreground/30 text-muted-foreground hover:text-foreground"
      }`}
      style={isActive ? { color: "var(--site-primary)" } : undefined}
    >
      {label}
    </Link>
  );
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      {makes.length > 0 && (
        <FilterRow label="Make">
          <Chip label="All" qs="" isActive={!active.make} />
          {makes.slice(0, 8).map((m) => (
            <Chip key={m} label={m} qs={`make=${encodeURIComponent(m)}${active.body ? `&body=${active.body}` : ""}${active.max ? `&max=${active.max}` : ""}`} isActive={active.make === m} />
          ))}
        </FilterRow>
      )}
      {bodies.length > 0 && (
        <FilterRow label="Body">
          <Chip label="All" qs={active.make ? `make=${active.make}` : ""} isActive={!active.body} />
          {bodies.slice(0, 8).map((b) => (
            <Chip key={b} label={b} qs={`${active.make ? `make=${active.make}&` : ""}body=${encodeURIComponent(b)}${active.max ? `&max=${active.max}` : ""}`} isActive={active.body === b} />
          ))}
        </FilterRow>
      )}
      <FilterRow label="Max price">
        {["25000", "40000", "60000", "100000"].map((p) => (
          <Chip
            key={p}
            label={`Under $${(Number(p) / 1000).toFixed(0)}k`}
            qs={`${active.make ? `make=${active.make}&` : ""}${active.body ? `body=${active.body}&` : ""}max=${p}`}
            isActive={active.max === p}
          />
        ))}
      </FilterRow>
      {hasFilter && (
        <div className="pt-1">
          <Link href={`/site/${slug}/inventory`} className="text-xs underline text-muted-foreground hover:text-foreground">Clear all filters</Link>
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-20">{label}</span>
      {children}
    </div>
  );
}
