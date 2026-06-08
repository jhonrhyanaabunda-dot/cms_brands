import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ChevronRight, MapPin, Phone, Mail, Clock, Award } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  return {
    title: `About · ${d?.name ?? "Dealership"}`,
    description: `Learn about ${d?.name}${d?.city ? ` in ${d.city}` : ""} — our team, our story, and why drivers trust us.`,
  };
}

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/site/${slug}`} className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">About</span>
      </nav>

      <header className="space-y-3">
        <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--site-primary)" }}>
          About us
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">{d.name}</h1>
        {(d.city || d.state) && (
          <p className="text-lg text-muted-foreground">{[d.city, d.state].filter(Boolean).join(", ")}</p>
        )}
      </header>

      <section className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-base leading-relaxed">
        <p>
          {d.name} is built around a simple idea: drivers deserve a dealership that respects their time, explains every line item, and treats every vehicle on the lift like it's our own.
        </p>
        <p>
          {d.brand && `As a factory-certified ${d.brand.replace(/_/g, " ")} dealer, we work `}with manufacturer-trained technicians and OEM parts on every job — no aftermarket guesswork, no upsells, no surprises on the invoice. The same standard applies whether you're here for a new vehicle, certified pre-owned, financing, or service.
        </p>
        <p>
          Most of our customers find us through word of mouth from other drivers in the area{d.city ? ` around ${d.city}` : ""}. That's not by accident — it's the result of a team that pays attention to small details and a process that's the same for the first visit as it is for the hundredth.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <ContactCard icon={MapPin} label="Visit us">
          {[d.city, d.state, d.zip].filter(Boolean).join(", ") || "—"}
        </ContactCard>
        {d.phone && (
          <ContactCard icon={Phone} label="Call">
            <a href={`tel:${d.phone}`} className="hover:underline">{d.phone}</a>
          </ContactCard>
        )}
        {d.email && (
          <ContactCard icon={Mail} label="Email">
            <a href={`mailto:${d.email}`} className="hover:underline">{d.email}</a>
          </ContactCard>
        )}
        <ContactCard icon={Clock} label="Hours">
          Mon–Sat 9am–7pm<br/>Sun 11am–5pm
        </ContactCard>
        <ContactCard icon={Award} label="Certifications">
          Factory-certified · ASE technicians · BBB-accredited
        </ContactCard>
      </section>
    </div>
  );
}

function ContactCard({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
