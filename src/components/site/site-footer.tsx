import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

type Dealer = {
  slug: string;
  name: string;
  brand: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  domain: string | null;
};

export function SiteFooter({ dealership }: { dealership: Dealer }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2 space-y-3">
          <div className="font-semibold">{dealership.name}</div>
          {dealership.brand && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{dealership.brand.replace(/_/g, " ")}</div>}
          <div className="text-sm text-muted-foreground space-y-1.5">
            {(dealership.city || dealership.state) && (
              <div className="inline-flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{[dealership.city, dealership.state, dealership.zip].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {dealership.phone && (
              <div className="inline-flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                <a href={`tel:${dealership.phone}`} className="hover:underline">{dealership.phone}</a>
              </div>
            )}
            {dealership.email && (
              <div className="inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${dealership.email}`} className="hover:underline">{dealership.email}</a>
              </div>
            )}
          </div>
        </div>

        <FooterCol heading="Shop">
          <FooterLink href={`/site/${dealership.slug}/inventory`}>New & used inventory</FooterLink>
          <FooterLink href={`/site/${dealership.slug}/inventory?status=new`}>New vehicles</FooterLink>
          <FooterLink href={`/site/${dealership.slug}/inventory?status=used`}>Pre-owned</FooterLink>
          <FooterLink href={`/site/${dealership.slug}/finance`}>Finance</FooterLink>
        </FooterCol>

        <FooterCol heading="Visit us">
          <FooterLink href={`/site/${dealership.slug}/service`}>Schedule service</FooterLink>
          <FooterLink href={`/site/${dealership.slug}/about`}>About us</FooterLink>
          <FooterLink href={`/site/${dealership.slug}/contact`}>Contact</FooterLink>
          <FooterLink href={`/site/${dealership.slug}/privacy`}>Privacy</FooterLink>
        </FooterCol>
      </div>

      <div className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {year} {dealership.name}. All rights reserved.</div>
          <div>Built with care · powered by A3 CMS</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">{heading}</div>
      <ul className="space-y-1.5 text-sm">{children}</ul>
    </div>
  );
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-muted-foreground hover:text-foreground transition-colors">{children}</Link>
    </li>
  );
}
