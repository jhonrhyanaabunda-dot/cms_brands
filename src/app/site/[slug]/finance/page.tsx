import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { LeadForm } from "@/components/site/lead-form";
import { ChevronRight, CreditCard, CheckCircle2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  return {
    title: `Financing · ${d?.name ?? "Dealership"}`,
    description: `Pre-qualify in 60 seconds at ${d?.name}. Soft credit pull, no impact to your score.`,
  };
}

export default async function FinancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await prisma.dealership.findUnique({ where: { slug } });
  if (!d) notFound();

  const points = [
    { icon: CheckCircle2, label: "Pre-qualify in 60 seconds", desc: "Soft credit inquiry — no impact on your score." },
    { icon: CreditCard,   label: "All credit considered",      desc: "From first-time buyers to rebuilding credit, we work with every credit profile." },
    { icon: ShieldCheck,  label: "Locked-in rates",            desc: "Today's rate, in writing, before you visit." },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/site/${slug}`} className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Financing</span>
      </nav>

      <header className="space-y-3 text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">Financing that works for you</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Start your pre-qual online — soft credit pull, no impact to your score. We'll confirm by text usually within an hour.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        {points.map((p) => (
          <div key={p.label} className="rounded-2xl border bg-card p-6 space-y-3">
            <div
              className="h-10 w-10 rounded-md grid place-items-center"
              style={{ backgroundColor: "color-mix(in srgb, var(--site-primary) 12%, transparent)", color: "var(--site-primary)" }}
            >
              <p.icon className="h-5 w-5" />
            </div>
            <div className="font-bold">{p.label}</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Start your pre-qualification</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tell us what you're shopping for and a little about you — we'll confirm rate, term, and any incentives that apply.
          </p>
          <p className="text-[11px] text-muted-foreground">
            All credit applications are subject to lender approval. Rates and terms vary by lender, credit history, term, and vehicle. Soft credit pulls do not impact your credit score.
          </p>
        </div>
        <LeadForm dealershipId={d.id} kind="finance" ctaLabel="Start pre-qual" showVehicle />
      </section>
    </div>
  );
}
