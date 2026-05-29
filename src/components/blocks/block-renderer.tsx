import type { Block } from "@/lib/blocks";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";

export type BlockCtx = {
  dealershipId?: string;
  dealershipSlug?: string;
  // Pre-fetched data the site page passes in for blocks that render real
  // records (inventory + offers). Stays optional so the page builder's
  // client canvas can still render with placeholder content.
  inventory?: Array<{
    id: string;
    year: number; make: string; model: string; trim: string | null;
    vin: string; mileage: number | null; price: any;
    imageUrl: string | null; status: string;
  }>;
  offers?: Array<{
    id: string; headline: string; subheadline: string | null;
    oemBrand: string | null; monthlyPayment: any; apr: any; termMonths: number | null;
    disclaimer: string | null;
  }>;
};

/**
 * Renders a single Block. Sync on purpose so this can be used inside the
 * Page Builder's client canvas as well as the public microsite. The public
 * site pre-fetches inventory + offers and passes them in via ctx; the
 * builder leaves ctx undefined and gets demo placeholders.
 */
export function BlockRenderer({ block, ctx }: { block: Block; ctx?: BlockCtx }) {
  switch (block.type) {
    case "hero":          return <HeroBlock p={block.props} />;
    case "cta":           return <CtaBlock p={block.props} />;
    case "inventory":     return <InventoryBlock p={block.props} ctx={ctx} />;
    case "financing":     return <FinancingBlock p={block.props} />;
    case "service":       return <ServiceBlock p={block.props} />;
    case "faq":           return <FaqBlock p={block.props} />;
    case "richText":      return <RichTextBlock p={block.props} />;
    case "offers":        return <OffersBlock p={block.props} ctx={ctx} />;
    case "testimonials":  return <TestimonialsBlock p={block.props} />;
    case "stats":         return <StatsBlock p={block.props} />;
    case "imageGrid":     return <ImageGridBlock p={block.props} />;
    case "embed":         return <EmbedBlock p={block.props} />;
    default:              return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────

function HeroBlock({ p }: { p: any }) {
  const align = p.align === "left" ? "text-left items-start" : "text-center items-center";
  return (
    <section className="relative isolate overflow-hidden py-24 md:py-32 px-4">
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(135deg, var(--site-primary), #0B0D0F)" }} />
      <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
      {p.imageUrl && (
        <Image src={p.imageUrl} alt="" fill priority sizes="100vw" className="absolute inset-0 -z-10 object-cover opacity-25 mix-blend-luminosity" />
      )}
      <div className={`relative max-w-4xl mx-auto flex flex-col gap-6 ${align}`}>
        {p.eyebrow && (
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 backdrop-blur px-3 py-1 text-[11px] uppercase tracking-widest font-semibold text-white/90">
            {p.eyebrow}
          </div>
        )}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05]">{p.headline}</h1>
        {p.subheadline && <p className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">{p.subheadline}</p>}
        {p.ctaLabel && p.ctaHref && (
          <div className="pt-2 flex flex-wrap gap-3" style={{ justifyContent: p.align === "left" ? "flex-start" : "center" }}>
            <Link
              href={p.ctaHref}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
            >
              {p.ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────────────────────────────────

function CtaBlock({ p }: { p: any }) {
  return (
    <section className="px-4 py-16">
      <div className="max-w-5xl mx-auto rounded-3xl border bg-card p-10 md:p-14 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-10" style={{ backgroundColor: "var(--site-primary)" }} />
        <div className="relative space-y-4">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight">{p.headline}</h2>
          {p.subheadline && <p className="text-muted-foreground max-w-2xl mx-auto">{p.subheadline}</p>}
          {p.ctaLabel && p.ctaHref && (
            <div className="pt-3">
              <Link
                href={p.ctaHref}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}
              >
                {p.ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Inventory — uses ctx.inventory when on the public site, demo placeholders
// when in the page builder canvas.
// ─────────────────────────────────────────────────────────────────────────

function InventoryBlock({ p, ctx }: { p: any; ctx?: BlockCtx }) {
  const vehicles = ctx?.inventory ?? [];
  const cards: any[] = vehicles.length ? vehicles : Array.from({ length: p.limit ?? 6 });
  return (
    <section className="px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">{p.headline ?? "Featured inventory"}</h2>
            {p.subheadline && <p className="mt-2 text-muted-foreground">{p.subheadline}</p>}
          </div>
          {ctx?.dealershipSlug && (
            <Link href={`/site/${ctx.dealershipSlug}/inventory`} className="text-sm font-medium inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((v: any, i: number) => (
            <article key={v?.id ?? i} className="group rounded-2xl border bg-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="aspect-[16/10] bg-muted relative">
                {v?.imageUrl ? (
                  <Image
                    src={v.imageUrl}
                    alt={`${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim()}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                    {v?.year ?? "2025"} {v?.make ?? p.brand ?? "Model"} {v?.model ?? ""}
                  </div>
                )}
                {v?.status === "AVAILABLE" && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5"
                        style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}>
                    Available
                  </span>
                )}
              </div>
              <div className="p-4 space-y-1">
                <div className="font-semibold truncate">
                  {v ? `${v.year} ${v.make} ${v.model}` : "2025 Model Trim"} {v?.trim && <span className="text-muted-foreground font-normal">{v.trim}</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {v ? `VIN ${v.vin} · ${v.mileage?.toLocaleString() ?? 0} mi` : "VIN ABC · 0 mi"}
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <div className="font-bold">{v?.price ? formatCurrency(v.price as any) : "$—"}</div>
                  {ctx?.dealershipSlug && v && (
                    <Link
                      href={`/site/${ctx.dealershipSlug}/inventory/${v.id}`}
                      className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
                      style={{ color: "var(--site-primary)" }}
                    >
                      Details <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Offers — uses ctx.offers when available
// ─────────────────────────────────────────────────────────────────────────

function OffersBlock({ p, ctx }: { p: any; ctx?: BlockCtx }) {
  const offers = ctx?.offers ?? [];
  const cards: any[] = offers.length ? offers : Array.from({ length: p.limit ?? 4 });
  return (
    <section className="px-4 py-16 bg-muted/40">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8">{p.headline ?? "Current offers"}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((o: any, i: number) => (
            <div key={o?.id ?? i} className="rounded-2xl border bg-background p-5 flex flex-col gap-2 hover:shadow-md transition-shadow">
              <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--site-primary)" }}>
                {o?.oemBrand ?? "Limited time"}
              </div>
              <div className="font-bold text-base leading-tight">{o?.headline ?? "$0/mo Lease Special"}</div>
              {o?.subheadline && <div className="text-sm text-muted-foreground">{o.subheadline}</div>}
              <div className="mt-auto pt-3 flex items-end justify-between text-sm">
                {o?.monthlyPayment ? (
                  <div>
                    <div className="text-2xl font-black">{formatCurrency(o.monthlyPayment as any)}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                    {o?.termMonths && <div className="text-[11px] text-muted-foreground">{o.termMonths} mo · {o.apr ?? 0}% APR</div>}
                  </div>
                ) : (
                  <div className="text-2xl font-black">$0<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                )}
              </div>
              {o?.disclaimer && <p className="text-[10px] text-muted-foreground border-t pt-2 mt-1 line-clamp-3">{o.disclaimer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Financing
// ─────────────────────────────────────────────────────────────────────────

function FinancingBlock({ p }: { p: any }) {
  return (
    <section className="px-4 py-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">{p.headline}</h2>
          <ul className="mt-6 space-y-3">
            {p.bullets.map((b: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 h-5 w-5 rounded-full shrink-0 grid place-items-center" style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0z" clipRule="evenodd" /></svg>
                </span>
                <span className="text-base">{b}</span>
              </li>
            ))}
          </ul>
          {p.ctaLabel && p.ctaHref && (
            <Link href={p.ctaHref} className="mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "var(--site-primary)", color: "var(--site-on-primary)" }}>
              {p.ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="rounded-3xl border bg-gradient-to-br from-muted/40 to-background p-10 aspect-square grid place-items-center text-center">
          <div>
            <div className="text-6xl font-black" style={{ color: "var(--site-primary)" }}>60s</div>
            <div className="mt-2 text-sm text-muted-foreground">to pre-qualify online</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────

function ServiceBlock({ p }: { p: any }) {
  return (
    <section className="px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8">{p.headline}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {p.services.map((s: any, i: number) => (
            <div key={i} className="rounded-2xl border p-6 hover:shadow-md hover:border-[color:var(--site-primary)] transition-all">
              <div className="font-bold text-lg">{s.name}</div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────

function FaqBlock({ p }: { p: any }) {
  return (
    <section className="px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8">{p.headline}</h2>
        <div className="divide-y border-y">
          {p.items.map((it: any, i: number) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer font-semibold flex items-center justify-between gap-3 list-none">
                {it.q}
                <span className="text-2xl text-muted-foreground group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: p.items.map((it: any) => ({
                "@type": "Question",
                name: it.q,
                acceptedAnswer: { "@type": "Answer", text: it.a },
              })),
            }),
          }}
        />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Rich text
// ─────────────────────────────────────────────────────────────────────────

function RichTextBlock({ p }: { p: any }) {
  return (
    <section className="px-4 py-12">
      <article
        className="max-w-3xl mx-auto text-base leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_a]:underline [&_a]:font-medium"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(p.markdown) }}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Testimonials
// ─────────────────────────────────────────────────────────────────────────

function TestimonialsBlock({ p }: { p: any }) {
  return (
    <section className="px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8 text-center">{p.headline}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {p.items.map((t: any, i: number) => (
            <blockquote key={i} className="rounded-2xl border bg-card p-6 flex flex-col">
              <div className="flex" aria-label={`${t.rating ?? 5} of 5 stars`}>
                {Array.from({ length: t.rating ?? 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-3 text-base leading-relaxed italic">"{t.quote}"</p>
              <footer className="mt-4 text-sm text-muted-foreground">— {t.author}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────

function StatsBlock({ p }: { p: any }) {
  return (
    <section className="px-4 py-16">
      <div className="max-w-6xl mx-auto rounded-3xl border bg-gradient-to-br from-muted/40 to-background p-10 grid sm:grid-cols-3 gap-6 text-center">
        {p.items.map((s: any, i: number) => (
          <div key={i}>
            <div className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: "var(--site-primary)" }}>{s.value}</div>
            <div className="mt-2 text-sm uppercase tracking-wider font-semibold text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Image grid
// ─────────────────────────────────────────────────────────────────────────

function ImageGridBlock({ p }: { p: any }) {
  if (p.images.length === 0) {
    return (
      <section className="px-4 py-16 text-center text-sm text-muted-foreground">No images yet.</section>
    );
  }
  return (
    <section className="px-4 py-16">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {p.images.map((img: any, i: number) => (
          <div key={i} className="relative aspect-video w-full rounded-2xl overflow-hidden bg-muted">
            <Image src={img.url} alt={img.alt ?? ""} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Embed
// ─────────────────────────────────────────────────────────────────────────

function EmbedBlock({ p }: { p: any }) {
  return <section className="px-4 py-6 max-w-6xl mx-auto" dangerouslySetInnerHTML={{ __html: p.html }} />;
}

// ─────────────────────────────────────────────────────────────────────────
// Markdown — small inline renderer (kept on purpose to avoid a heavy dep).
// Used by RichText block + content page articles.
// ─────────────────────────────────────────────────────────────────────────

export function renderMarkdown(s: string): string {
  if (!s) return "";
  return s
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*?<\/li>)(\n<li>.*?<\/li>)*/gs, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n+/g, "</p><p>")
    .replace(/^(?!<(?:h|ul|li|blockquote|p))/gm, "<p>");
}
