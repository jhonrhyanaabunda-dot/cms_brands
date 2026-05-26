import Link from "next/link";
import {
  ArrowRight, Sparkles, Zap, Globe2, Bot, BarChart3, Image as ImageIcon,
  TrendingUp, ShieldCheck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATS = [
  { value: "47%", label: "Avg organic lift" },
  { value: "12k+", label: "Pages shipped" },
  { value: "98", label: "PageSpeed score" },
  { value: "4.9★", label: "Client rating" },
];

const FEATURES = [
  { icon: Bot, title: "AI Content Engine", desc: "Blogs, landing pages, GBP posts, and review replies — generated in seconds, OEM-compliant by default." },
  { icon: Globe2, title: "Programmatic SEO", desc: "Spin up city, model, and service pages with one click. Hundreds of indexable landings, on brand." },
  { icon: BarChart3, title: "Unified Analytics", desc: "GSC + GA4 + GBP + PageSpeed — every signal that matters, in one operator-grade view." },
  { icon: Zap, title: "Visual Builder", desc: "Drag-and-drop blocks. Mobile, tablet, desktop preview. OEM-approved templates, every time." },
  { icon: ImageIcon, title: "Smart Media", desc: "AI alt-text + tagging, WebP conversion, CDN-optimized delivery — built for Core Web Vitals." },
  { icon: ShieldCheck, title: "Workflow & Audit", desc: "Draft, review, approve, schedule, publish. Full version history. Tenant isolation by default." },
];

const BRANDS = ["BMW", "MERCEDES", "TOYOTA", "FORD", "LINCOLN", "NISSAN", "HONDA"];

export default function Marketing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass">
        <div className="container grid h-[68px] grid-cols-3 items-center">
          <Link href="/" className="inline-flex items-center justify-self-start">
            <img src="/logo.png" alt="A3 Brands" className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex justify-self-center gap-2 text-[16px] text-white/85">
            <Button variant="nav" asChild><a href="#features">WHAT WE DO</a></Button>
            <Button variant="nav" asChild><a href="#stack">STACK</a></Button>
            <Button variant="nav" asChild><a href="#brands">BRANDS</a></Button>
          </nav>
          <div className="flex items-center justify-self-end gap-3">
            <Link href="/login" className="text-sm font-medium text-white/85 hover:text-brand-400">Sign in</Link>
            <Button asChild size="default" className="!h-10"><Link href="/login">BOOK A DEMO <ArrowRight /></Link></Button>
          </div>
        </div>
      </header>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-charcoal-800 text-white">
        {/* dotted radial backdrop */}
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        {/* emerald glow */}
        <div className="absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center space-y-7">
            <Badge variant="brand" className="mx-auto">
              <Sparkles className="h-3 w-3 mr-1.5" /> AI-powered dealership platform
            </Badge>
            <h1 className="a3-display max-w-3xl mx-auto">
              Your WordPress is leaking leads.
              <br />
              <span className="gradient-text">We Fix That.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
              The operating system for dealership marketing. Multi-tenant, OEM-compliant, AI-native, built for SEO at scale.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild size="lg"><Link href="/login">BOOK A STRATEGY CALL <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline" className="!border-white/20 !text-white hover:!border-brand-500 hover:!text-brand-400"><a href="#features">See platform</a></Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur">
                <div className="text-3xl md:text-4xl font-black tracking-tight text-brand-400">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-label text-white/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BRAND STRIP ─────────────────────────────────────── */}
      <section id="brands" className="border-y bg-secondary">
        <div className="container py-10">
          <div className="text-center mb-6">
            <div className="a3-label text-muted-foreground">Trusted across OEMs</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {BRANDS.map((b) => (
              <Badge key={b} variant="brand">{b}</Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────────── */}
      <section id="features" className="container py-24">
        <div className="max-w-2xl mb-12">
          <Badge variant="brand"><TrendingUp className="h-3 w-3 mr-1.5" /> The numbers don't lie</Badge>
          <h2 className="a3-h2 mt-4">A complete dealership marketing OS — built to replace WordPress.</h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            Every surface a marketing director needs, in one tenant-isolated platform. Multi-rooftop ready. OEM compliant. Vercel-fast.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <article key={f.title} className="group rounded-lg border bg-card p-7 transition-all hover:shadow-subtle hover:border-brand-500">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-500/15 text-brand-600 group-hover:bg-brand-500 group-hover:text-charcoal-500 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="bg-charcoal-800 text-white">
        <div className="container py-20 md:py-28 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-5 w-5 fill-brand-500 text-brand-500" />)}
            </div>
            <h2 className="a3-h2">Ship dealership pages at startup speed.</h2>
            <p className="text-white/70 text-lg">
              Open the dashboard, generate a city page in 30 seconds, publish to your microsite in one click.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild size="lg"><Link href="/login">OPEN DASHBOARD <ArrowRight /></Link></Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-background">
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center">
            <img src="/logo.png" alt="A3 Brands" className="h-6 w-auto" />
          </div>
          <div>© {new Date().getFullYear()} A3 Brands · Built without WordPress.</div>
        </div>
      </footer>
    </div>
  );
}
