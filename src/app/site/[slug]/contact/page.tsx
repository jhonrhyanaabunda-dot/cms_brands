import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { LeadForm } from "@/components/site/lead-form";
import { ChevronRight, MapPin, Phone, Mail } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  return {
    title: `Contact · ${d?.name ?? "Dealership"}`,
    description: `Get in touch with ${d?.name}. We respond within one business day.`,
  };
}

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/site/${slug}`} className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Contact</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">Get in touch</h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          Questions, comments, or just want to chat about a specific vehicle? Drop us a note — a team member usually replies within an hour during business hours.
        </p>
      </header>

      <section className="grid lg:grid-cols-[1fr_1.3fr] gap-8 items-start">
        <div className="space-y-4">
          {(d.city || d.state || d.zip) && (
            <ContactRow icon={MapPin} label="Visit us">
              {[d.city, d.state, d.zip].filter(Boolean).join(", ")}
            </ContactRow>
          )}
          {d.phone && (
            <ContactRow icon={Phone} label="Call">
              <a href={`tel:${d.phone}`} className="hover:underline">{d.phone}</a>
            </ContactRow>
          )}
          {d.email && (
            <ContactRow icon={Mail} label="Email">
              <a href={`mailto:${d.email}`} className="hover:underline">{d.email}</a>
            </ContactRow>
          )}
          <div className="rounded-2xl border bg-card p-4 text-xs text-muted-foreground leading-relaxed">
            By submitting a form you agree to be contacted by {d.name} via phone, email, or text about your inquiry. Standard messaging rates may apply. We never share your contact info.
          </div>
        </div>

        <LeadForm dealershipId={d.id} kind="contact" ctaLabel="Send message" />
      </section>
    </div>
  );
}

function ContactRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 flex items-start gap-3">
      <div
        className="h-10 w-10 rounded-md grid place-items-center shrink-0"
        style={{ backgroundColor: "color-mix(in srgb, var(--site-primary) 12%, transparent)", color: "var(--site-primary)" }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className="text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}
