import Link from "next/link";
import Image from "next/image";
import { Phone, MapPin, Clock } from "lucide-react";

type Dealer = {
  slug: string;
  name: string;
  brand: string | null;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
};

export function SiteHeader({ dealership }: { dealership: Dealer }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      {/* Top contact strip — quick-tap phone + location on mobile, expanded info on desktop */}
      <div className="bg-[color:var(--site-primary)] text-[color:var(--site-on-primary)]">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between text-xs">
          <div className="hidden md:flex items-center gap-4">
            {dealership.city && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {dealership.city}{dealership.state ? `, ${dealership.state}` : ""}</span>
            )}
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Mon–Sat · 9am–7pm</span>
          </div>
          {dealership.phone && (
            <a href={`tel:${dealership.phone}`} className="inline-flex items-center gap-1 font-semibold tracking-tight hover:opacity-80">
              <Phone className="h-3 w-3" /> {dealership.phone}
            </a>
          )}
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href={`/site/${dealership.slug}`} className="flex items-center gap-2.5 min-w-0">
          {dealership.logoUrl ? (
            <Image src={dealership.logoUrl} alt="" width={120} height={36} className="h-9 w-auto" priority />
          ) : (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-black tracking-tight"
              style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
            >
              {dealership.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate">{dealership.name}</div>
            {dealership.brand && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{dealership.brand.replace(/_/g, " ")}</div>}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {[
            { href: `/site/${dealership.slug}/inventory`, label: "Inventory" },
            { href: `/site/${dealership.slug}/service`,   label: "Service"   },
            { href: `/site/${dealership.slug}/finance`,   label: "Finance"   },
            { href: `/site/${dealership.slug}/about`,     label: "About"     },
            { href: `/site/${dealership.slug}/contact`,   label: "Contact"   },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-md hover:bg-accent hover:text-foreground text-muted-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href={`/site/${dealership.slug}/inventory`}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
        >
          Shop now
        </Link>
      </div>
    </header>
  );
}
