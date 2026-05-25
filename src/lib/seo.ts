export type SeoCheck = {
  id: string;
  label: string;
  ok: boolean;
  weight: number;
  hint?: string;
};

export type SeoEvaluation = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: SeoCheck[];
};

export function scoreSeo(input: {
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  bodyMarkdown?: string | null;
  slug?: string | null;
  keywords?: string[];
  heroImageUrl?: string | null;
}): SeoEvaluation {
  const body = input.bodyMarkdown ?? "";
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const metaTitle = input.metaTitle ?? input.title;
  const metaDesc = input.metaDescription ?? "";
  const primary = (input.keywords?.[0] || "").toLowerCase();
  const text = (input.title + " " + body + " " + (metaTitle ?? "") + " " + metaDesc).toLowerCase();

  const checks: SeoCheck[] = [
    { id: "title-len", label: "Title length 30–65 chars", ok: !!input.title && input.title.length >= 30 && input.title.length <= 65, weight: 8, hint: "Make titles descriptive and click-worthy." },
    { id: "meta-title", label: "Meta title 30–60 chars", ok: !!metaTitle && metaTitle.length >= 30 && metaTitle.length <= 60, weight: 10 },
    { id: "meta-desc", label: "Meta description 80–160 chars", ok: metaDesc.length >= 80 && metaDesc.length <= 160, weight: 10 },
    { id: "slug", label: "Slug present", ok: !!input.slug && input.slug.length > 1 && /^[a-z0-9-]+$/.test(input.slug), weight: 5 },
    { id: "body-len", label: "Body ≥ 600 words", ok: wordCount >= 600, weight: 15, hint: `${wordCount} words` },
    { id: "headings", label: "Has H2 sections", ok: /^##\s+/m.test(body), weight: 8 },
    { id: "primary-kw-title", label: "Primary keyword in title", ok: !!primary && input.title.toLowerCase().includes(primary), weight: 10 },
    { id: "primary-kw-body", label: "Primary keyword in body", ok: !!primary && text.includes(primary), weight: 8 },
    { id: "internal-links", label: "Contains internal links", ok: /\]\(\/[^\)]+\)/.test(body), weight: 6 },
    { id: "hero-image", label: "Hero image set", ok: !!input.heroImageUrl, weight: 5 },
    { id: "alt-text", label: "All images have alt text", ok: !/!\[\]\(/.test(body), weight: 5 },
    { id: "schema", label: "Structured data ready", ok: !!input.metaDescription, weight: 5 },
    { id: "kw-set", label: "Target keywords defined", ok: (input.keywords?.length ?? 0) >= 3, weight: 5 },
  ];
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return { score, grade, checks };
}

export function buildJsonLd(input: {
  type: "Article" | "LocalBusiness" | "Product" | "FAQPage";
  data: Record<string, any>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": input.type,
    ...input.data,
  };
}

export function detectDuplicate(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3));
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersect = 0;
  ta.forEach((t) => tb.has(t) && intersect++);
  const union = new Set([...ta, ...tb]).size;
  return Math.round((intersect / union) * 100);
}
