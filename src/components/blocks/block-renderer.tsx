import type { Block } from "@/lib/blocks";

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "hero": {
      const p = block.props;
      return (
        <section className={`relative overflow-hidden py-20 px-6 ${p.align === "left" ? "text-left" : "text-center"}`}>
          {p.imageUrl && <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
          <div className="relative max-w-3xl mx-auto space-y-4">
            {p.eyebrow && <div className="text-xs uppercase tracking-widest text-brand-500 font-semibold">{p.eyebrow}</div>}
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">{p.headline}</h1>
            {p.subheadline && <p className="text-lg text-muted-foreground">{p.subheadline}</p>}
            {p.ctaLabel && p.ctaHref && (
              <a className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white" href={p.ctaHref}>{p.ctaLabel}</a>
            )}
          </div>
        </section>
      );
    }
    case "cta": {
      const p = block.props;
      return (
        <section className="my-10 rounded-2xl border bg-gradient-to-br from-brand-50 to-white p-10 text-center dark:from-brand-900/40 dark:to-background">
          <h2 className="text-2xl md:text-3xl font-semibold">{p.headline}</h2>
          {p.subheadline && <p className="mt-2 text-muted-foreground">{p.subheadline}</p>}
          <a href={p.ctaHref} className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white">{p.ctaLabel}</a>
        </section>
      );
    }
    case "inventory": {
      const p = block.props;
      return (
        <section className="py-12">
          <h2 className="text-2xl font-semibold mb-6">{p.headline}</h2>
          {p.subheadline && <p className="text-muted-foreground mb-4">{p.subheadline}</p>}
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: p.limit ?? 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="h-32 rounded bg-muted mb-3 grid place-items-center text-xs text-muted-foreground">vehicle image</div>
                <div className="font-medium">2025 {p.brand ?? "Model"} Trim</div>
                <div className="text-xs text-muted-foreground">$0,000 · 0 mi</div>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "financing": {
      const p = block.props;
      return (
        <section className="py-10">
          <h2 className="text-2xl font-semibold mb-4">{p.headline}</h2>
          <ul className="grid md:grid-cols-3 gap-3">
            {p.bullets.map((b, i) => (
              <li key={i} className="rounded-lg border p-4 text-sm">✓ {b}</li>
            ))}
          </ul>
          {p.ctaLabel && p.ctaHref && (
            <a href={p.ctaHref} className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white">{p.ctaLabel}</a>
          )}
        </section>
      );
    }
    case "service": {
      const p = block.props;
      return (
        <section className="py-10">
          <h2 className="text-2xl font-semibold mb-4">{p.headline}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {p.services.map((s, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.description}</div>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "faq": {
      const p = block.props;
      return (
        <section className="py-10">
          <h2 className="text-2xl font-semibold mb-4">{p.headline}</h2>
          <div className="space-y-2">
            {p.items.map((it, i) => (
              <details key={i} className="group rounded-lg border p-4 open:bg-accent/40">
                <summary className="cursor-pointer font-medium">{it.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{it.a}</p>
              </details>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: p.items.map((it) => ({
                  "@type": "Question",
                  name: it.q,
                  acceptedAnswer: { "@type": "Answer", text: it.a },
                })),
              }),
            }}
          />
        </section>
      );
    }
    case "richText":
      return <section className="py-6 max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: simpleMd(block.props.markdown) }} />;
    case "offers":
      return (
        <section className="py-10">
          <h2 className="text-2xl font-semibold mb-4">{block.props.headline}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: block.props.limit ?? 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="text-xs text-brand-500 font-semibold">LIMITED TIME</div>
                <div className="font-semibold mt-1">$0/mo Lease Special</div>
                <div className="text-xs text-muted-foreground">36 months / 7,500 miles</div>
              </div>
            ))}
          </div>
        </section>
      );
    case "testimonials":
      return (
        <section className="py-10">
          <h2 className="text-2xl font-semibold mb-4">{block.props.headline}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {block.props.items.map((t, i) => (
              <blockquote key={i} className="rounded-lg border p-5">
                <div className="text-amber-500">{"★".repeat(t.rating ?? 5)}</div>
                <p className="mt-2 italic">"{t.quote}"</p>
                <footer className="mt-2 text-sm text-muted-foreground">— {t.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      );
    case "stats":
      return (
        <section className="py-10 grid md:grid-cols-3 gap-4">
          {block.props.items.map((s, i) => (
            <div key={i} className="rounded-lg border p-6 text-center">
              <div className="text-3xl font-semibold gradient-text">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </section>
      );
    case "imageGrid":
      return (
        <section className="py-10 grid md:grid-cols-3 gap-3">
          {block.props.images.length === 0 && <div className="col-span-full text-sm text-muted-foreground text-center py-10">No images yet.</div>}
          {block.props.images.map((img, i) => (
            <img key={i} src={img.url} alt={img.alt ?? ""} className="aspect-video w-full rounded-md object-cover" />
          ))}
        </section>
      );
    case "embed":
      return <section className="py-6" dangerouslySetInnerHTML={{ __html: block.props.html }} />;
    default:
      return null;
  }
}

function simpleMd(s: string) {
  return s
    .replace(/^##\s+(.+)$/gm, "<h2 class='text-xl font-semibold my-4'>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a class="text-brand-500 underline" href="$2">$1</a>')
    .replace(/\n\n+/g, "</p><p class='my-3'>")
    .replace(/^(?!<)/gm, "<p>");
}
