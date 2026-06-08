import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { LeadForm } from "@/components/site/lead-form";
import { ChevronRight, Wrench, Clock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  return {
    title: `Service · ${d?.name ?? "Dealership"}`,
    description: `Factory-certified service at ${d?.name}. Schedule online in under a minute.`,
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) notFound();

  const services = [
    { icon: Wrench, name: "Routine maintenance",  desc: "Oil, tires, filters, fluids + a complimentary multi-point inspection on every visit." },
    { icon: ShieldCheck, name: "Brake service",   desc: "Pads, rotors, fluid — OEM parts and a written quote before we touch a tool." },
    { icon: Clock, name: "Diagnostics",           desc: "Factory tooling pinpoints the cause before we replace anything. No guesswork." },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/site/${slug}`} className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Service</span>
      </nav>

      <header className="space-y-3 text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">Service that respects your time</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Factory-trained technicians, OEM parts, written quotes before any work begins.
          {d.city ? ` Serving ${d.city}${d.state ? `, ${d.state}` : ""}.` : ""}
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.name} className="rounded-2xl border bg-card p-6 space-y-3">
            <div
              className="h-10 w-10 rounded-md grid place-items-center"
              style={{ backgroundColor: "color-mix(in srgb, var(--site-primary) 12%, transparent)", color: "var(--site-primary)" }}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div className="font-bold text-lg">{s.name}</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Schedule online</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tell us what you need and when you'd like to come in. We'll confirm by text usually within an hour, and reserve a complimentary loaner if the job needs more than a day.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>· Same-week appointments — often same-day</li>
            <li>· Free multi-point inspection on every visit</li>
            <li>· Genuine OEM parts and approved fluids</li>
            <li>· Written quote before any work begins</li>
          </ul>
        </div>
        <LeadForm dealershipId={d.id} kind="testdrive" ctaLabel="Request service appointment" showVehicle />
      </section>
    </div>
  );
}
