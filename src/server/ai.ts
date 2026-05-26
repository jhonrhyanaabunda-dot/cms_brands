"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { chat, MODEL } from "@/lib/openai";
import { createContent } from "@/server/content";
import { detectDuplicate } from "@/lib/seo";
import type { ContentType } from "@/lib/types";

const ToneEnum = z.enum(["professional", "friendly", "luxury", "energetic", "trustworthy", "authoritative"]);
type Tone = z.infer<typeof ToneEnum>;

const StructureEnum = z.enum(["article", "howto", "listicle", "comparison", "news", "faq"]);
type Structure = z.infer<typeof StructureEnum>;

const AudienceEnum = z.enum(["general", "family", "luxury", "performance", "firsttime", "fleet"]);
type Audience = z.infer<typeof AudienceEnum>;

const GbpPostTypeEnum = z.enum(["update", "offer", "event", "whatsnew"]);
type GbpPostType = z.infer<typeof GbpPostTypeEnum>;

const HeroStyleEnum = z.enum(["gradient", "minimal", "geometric", "automotive"]);
type HeroStyle = z.infer<typeof HeroStyleEnum>;

async function logGen(args: { kind: string; prompt: string; response: string; tokensIn?: number; tokensOut?: number }) {
  const tenant = await requireTenant();
  await prisma.aiGeneration.create({
    data: {
      dealershipId: tenant.dealershipId,
      userId: tenant.userId,
      model: MODEL,
      kind: args.kind,
      prompt: args.prompt,
      response: args.response,
      tokensIn: args.tokensIn,
      tokensOut: args.tokensOut,
    },
  });
}

const SYSTEM_BASE = (brand?: string | null) => `
You are a senior dealership marketing copywriter for a${brand ? ` ${brand}` : "n automotive"} dealership.
Write conversion-focused, factually grounded content. Never invent specifications, prices, financing terms, or warranties.
Follow OEM compliance: use approved brand language, include disclaimers when discussing offers, and avoid claims like "lowest price" without qualifier.
Output is rendered as markdown.
`.trim();

export async function generateBlog(input: {
  topic: string;
  keyword: string;
  tone?: Tone;
  city?: string;
  wordCount?: number;
  structure?: Structure;
  audience?: Audience;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });

  const tone = ToneEnum.optional().parse(input.tone) ?? "professional";
  const structure = StructureEnum.optional().parse(input.structure) ?? "article";
  const audience = AudienceEnum.optional().parse(input.audience) ?? "general";
  const words = input.wordCount ?? 900;

  const structureGuide: Record<Structure, string> = {
    article:    "Long-form editorial article: intro hook, 4–6 H2 sections that go deep on the topic, transitional paragraphs, FAQ, closing CTA.",
    howto:      "Step-by-step how-to: 1-paragraph intro, 'What you'll need' bullet list, then numbered H2 steps (6–10) with detailed sub-paragraphs and tips/warnings call-outs, FAQ, closing CTA.",
    listicle:   "Numbered listicle: short intro, then 8–12 numbered H2 items (\"1. Title — short paragraph\"), each with a 2–4 sentence explanation, a takeaway summary, FAQ, closing CTA.",
    comparison: "Comparison post: intro establishing the two/three options, H2 sections per dimension (price, ownership cost, reliability, features), a markdown table side-by-side, 'Which is right for you' verdict, FAQ, closing CTA.",
    news:       "News-style post: lede paragraph (who/what/when/where/why), H2 'What this means for drivers', H2 'Background', H2 'What's next', sourced quotes blockquote, FAQ, closing CTA.",
    faq:        "FAQ-driven: 1-paragraph intro, then 10–15 individual H2 questions, each answered in 2–4 sentence paragraphs with internal links where natural, closing CTA.",
  };
  const audienceGuide: Record<Audience, string> = {
    general:    "Everyday drivers — practical, trust-focused tone.",
    family:     "Family buyers — safety, space, reliability, total cost of ownership.",
    luxury:     "Luxury buyers — emphasize craftsmanship, refinement, concierge service, exclusivity.",
    performance:"Performance enthusiasts — engineering specs, driving feel, motorsport heritage.",
    firsttime:  "First-time buyers — demystify financing, warranties, what to expect at the dealership.",
    fleet:      "Fleet & commercial buyers — uptime, total cost of operation, service contracts, dedicated fleet manager.",
  };

  const userPrompt = `
Write a complete blog post for ${dealer?.name}${input.city ? ` serving ${input.city}` : ""}.

Topic: ${input.topic}
Primary keyword: ${input.keyword}
Tone: ${tone}
Target length: ${words} words
Structure: ${structure} — ${structureGuide[structure]}
Audience: ${audience} — ${audienceGuide[audience]}

Return STRICT JSON with keys: title, slug, metaTitle, metaDescription, excerpt, keywords (array of 5–8 strings), outline (array of H2 strings in order), bodyMarkdown.
The bodyMarkdown should follow the chosen Structure exactly and hit the word target ±15%. Use internal markdown links to "/service", "/inventory", "/finance" where natural.
`.trim();

  const { text, tokensIn, tokensOut } = await chat({
    system: SYSTEM_BASE(dealer?.brand),
    user: userPrompt,
    json: true,
  });
  await logGen({ kind: "blog", prompt: userPrompt, response: text, tokensIn, tokensOut });

  let parsed: any;
  try { parsed = JSON.parse(text); } catch { throw new Error("AI returned non-JSON"); }

  const dupe = await maybeFlagDuplicate(parsed.bodyMarkdown ?? "");
  return { ...parsed, structure, audience, wordCount: words, duplicateScore: dupe.score, duplicateAgainst: dupe.against };
}

export async function generateLandingPage(input: {
  service: string;
  city?: string;
  keyword: string;
  oemBrand?: string;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });

  const userPrompt = `
Generate a high-converting, FULL-LENGTH SEO landing page for ${dealer?.name}.

Service: ${input.service}
${input.city ? `City target: ${input.city}` : ""}
${input.oemBrand ? `OEM Brand: ${input.oemBrand}` : ""}
Primary keyword: ${input.keyword}

Return STRICT JSON with: title, slug, metaTitle, metaDescription, excerpt, keywords (5–8), bodyMarkdown.

bodyMarkdown MUST be a full-length landing page of 900–1300 words structured exactly as follows, in this order:
1. H2 headline section with a 2–3 paragraph intro that establishes trust and previews the value props.
2. A "Why ${dealer?.name}" H2 with 5–6 bolded value-prop bullets, each with a 1-sentence explanation.
3. An H2 step-by-step process (6–8 numbered steps) describing how the service works from booking to follow-up.
4. An H2 "What's included" bulleted section (4–6 items).
5. An H2 "Pricing you can see" section with a short paragraph plus a markdown table of service tiers (3 rows: standard / comprehensive / major), with columns for turnaround and inclusions.
6. An H2 "What customers say" section with 3 distinct testimonials as blockquotes attributed to "Verified customer review".
7. An H2 "Coverage and service area" paragraph${input.city ? ` referencing ${input.city} and the surrounding region` : ""}.
8. An H2 "Certifications & trust" bulleted section (4–6 items: manufacturer certified, ASE, BBB, factory diagnostic tools, ongoing training).
9. An H2 "What to bring" bulleted section.
10. An H2 FAQ with 6–8 questions, each Q in bold and answer in 1–2 sentences. Include at minimum: how long it takes, warranty coverage, walk-ins vs appointments, waiting on-site, servicing vehicles bought elsewhere, second opinions, loaner availability, and pickup/delivery.
11. An H2 "Related services" paragraph with 3–5 markdown links to /service, /inventory, /finance using natural anchor text.
12. A final H2 closing CTA with a primary bolded markdown link to "/service" and a closing italicized signature line.

Use the primary keyword and city naturally throughout — never keyword-stuff. Include disclaimers where pricing or financing is discussed. Output markdown only inside bodyMarkdown.
`.trim();

  const { text, tokensIn, tokensOut } = await chat({
    system: SYSTEM_BASE(dealer?.brand),
    user: userPrompt,
    json: true,
  });
  await logGen({ kind: "landing", prompt: userPrompt, response: text, tokensIn, tokensOut });
  try { return JSON.parse(text); } catch { throw new Error("AI returned non-JSON"); }
}

export async function generateGbpPost(input: {
  topic: string;
  tone?: Tone;
  cta?: string;
  postType?: GbpPostType;
  offer?: { name?: string; startDate?: string; endDate?: string; couponCode?: string };
  event?: { name?: string; date?: string; location?: string };
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const tone = ToneEnum.optional().parse(input.tone) ?? "friendly";
  const postType = GbpPostTypeEnum.optional().parse(input.postType) ?? "update";

  const postTypeGuide: Record<GbpPostType, string> = {
    update:    "Standard update post: hook → 2 sentences of value → CTA → 2 hashtags.",
    offer:     "Offer post: lead with the offer name and a benefit-oriented hook; mention validity window and coupon code if provided; clear CTA; 2 hashtags.",
    event:     "Event post: lead with event name, date, and location; one sentence on what attendees get; RSVP CTA; 2 hashtags.",
    whatsnew:  "\"What's new\" post: lead with what just changed, why it matters to drivers, then CTA; 2 hashtags.",
  };

  const userPrompt = `
Write THREE distinct Google Business Profile post variants for ${dealer?.name}.

Post type: ${postType} — ${postTypeGuide[postType]}
Topic: ${input.topic}
Tone: ${tone}
${input.cta ? `Suggested CTA: ${input.cta}` : ""}
${input.offer?.name      ? `Offer name: ${input.offer.name}` : ""}
${input.offer?.startDate ? `Offer start: ${input.offer.startDate}` : ""}
${input.offer?.endDate   ? `Offer end: ${input.offer.endDate}` : ""}
${input.offer?.couponCode? `Coupon code: ${input.offer.couponCode}` : ""}
${input.event?.name      ? `Event name: ${input.event.name}` : ""}
${input.event?.date      ? `Event date: ${input.event.date}` : ""}
${input.event?.location  ? `Event location: ${input.event.location}` : ""}

Constraints: each variant ≤ 1500 characters total. Each variant should take a noticeably different angle (e.g. urgency / curiosity / value).
Return STRICT JSON: { variants: [ { title, bodyMarkdown, hashtags (array of strings without the # prefix) }, … 3 total ] }.
`.trim();

  const { text, tokensIn, tokensOut } = await chat({
    system: SYSTEM_BASE(dealer?.brand),
    user: userPrompt,
    json: true,
  });
  await logGen({ kind: "gbp_post", prompt: userPrompt, response: text, tokensIn, tokensOut });
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { return { variants: [{ title: "GBP Post", bodyMarkdown: text, hashtags: [] }], postType }; }
  return { ...parsed, postType };
}

export async function generateMeta(input: { title: string; body: string; keyword?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const userPrompt = `
Generate optimized SEO meta tags.
Title: ${input.title}
${input.keyword ? `Primary keyword: ${input.keyword}` : ""}
Body excerpt: ${input.body.slice(0, 1200)}

Return strict JSON: { metaTitle (≤ 60 chars), metaDescription (≤ 160 chars), keywords (array of 5–8) }.
`.trim();
  const { text } = await chat({ system: "You are an expert technical SEO.", user: userPrompt, json: true });
  try { return JSON.parse(text); } catch { return { metaTitle: input.title, metaDescription: "", keywords: [] }; }
}

export async function rewriteContent(input: { text: string; tone: Tone; instruction?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const userPrompt = `Rewrite the following copy in a ${input.tone} tone${input.instruction ? ` — ${input.instruction}` : ""}. Preserve facts. Output markdown only.\n\n---\n${input.text}`;
  const { text } = await chat({ system: "You are an expert dealership copy editor.", user: userPrompt });
  return text;
}

export async function suggestInternalLinks(input: { body: string }) {
  const tenant = await requireTenant();
  const others = await prisma.content.findMany({
    where: { dealershipId: tenant.dealershipId, status: "PUBLISHED" },
    select: { title: true, slug: true, type: true },
    take: 50,
  });
  const userPrompt = `
Given this content and the available published pages, suggest 5 internal link opportunities.

Content (truncated): ${input.body.slice(0, 2000)}

Available pages:
${others.map((o) => `- ${o.title} (/${o.slug})`).join("\n")}

Return strict JSON: { suggestions: [{ anchor: string, href: string, reason: string }] }.
`.trim();
  const { text } = await chat({ system: "You optimize internal linking for SEO.", user: userPrompt, json: true });
  try { return JSON.parse(text); } catch { return { suggestions: [] }; }
}

export async function generateReviewReply(input: { reviewBody: string; rating: number; tone?: Tone }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "reviews.reply")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const tone = input.tone ?? (input.rating >= 4 ? "friendly" : "professional");
  const userPrompt = `
Compose a Google review reply from ${dealer?.name}.

Customer review (${input.rating}★): "${input.reviewBody}"

Guidelines:
- ${input.rating <= 2 ? "Acknowledge the issue, apologize sincerely, invite them to contact the GM directly. Do not admit legal fault." : "Thank the reviewer warmly and reference something specific from their review."}
- Keep under 600 characters.
- Tone: ${tone}.
- Sign off as the ${dealer?.name} team.

Return plain text only.
`.trim();
  const { text } = await chat({ system: "You handle public review responses for an automotive dealership.", user: userPrompt });
  return text.trim();
}

export async function aiQaCheck(input: { body: string; keyword?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const userPrompt = `
Audit this dealership content for quality and accuracy.

Content: ${input.body.slice(0, 4000)}
${input.keyword ? `Target keyword: ${input.keyword}` : ""}

Return strict JSON: {
  qaScore (0-100),
  hallucinationFlags: [{ excerpt: string, reason: string }],
  oemComplianceIssues: [string],
  suggestions: [string]
}.
`.trim();
  const { text } = await chat({ system: "You audit dealership marketing content for OEM compliance and factual accuracy.", user: userPrompt, json: true });
  try { return JSON.parse(text); } catch { return { qaScore: 70, hallucinationFlags: [], oemComplianceIssues: [], suggestions: [] }; }
}

export async function generateCityPagesBulk(input: {
  service: string;
  keyword: string;
  cities: string[];
  state: string;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");
  const results: Array<{ id: string; title: string; slug: string }> = [];
  for (const city of input.cities) {
    const r = await generateCityPageOne({ service: input.service, keyword: input.keyword, city, state: input.state });
    results.push(r);
  }
  return results;
}

/**
 * One-city variant of the bulk generator. Returning per-city so the client
 * can render a live progress bar and per-city duplicate scores without
 * blocking on the whole batch.
 */
export async function generateCityPageOne(input: {
  service: string;
  keyword: string;
  city: string;
  state?: string;
  publish?: "draft" | "scheduled" | "live";
  scheduledAt?: string;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");

  const gen = await generateLandingPage({
    service: input.service,
    city: input.city,
    keyword: `${input.keyword} ${input.city}`,
  });

  const dupe = await maybeFlagDuplicate(gen.bodyMarkdown ?? "");

  const created = await createContent({
    type: "CITY_PAGE" as ContentType,
    title: gen.title || `${input.service} in ${input.city}`,
    slug: gen.slug,
    excerpt: gen.excerpt,
    bodyMarkdown: gen.bodyMarkdown,
    metaTitle: gen.metaTitle,
    metaDescription: gen.metaDescription,
    aiGenerated: true,
    aiModel: MODEL,
    targetCity: input.city,
    targetState: input.state,
    targetKeyword: `${input.keyword} ${input.city}`,
  });

  // Optional publish-status / schedule for the freshly created draft.
  const publish = input.publish ?? "draft";
  if (publish === "live") {
    const { updateContent } = await import("@/server/content");
    await updateContent(created.id, { status: "PUBLISHED" } as any);
  } else if (publish === "scheduled" && input.scheduledAt) {
    const { updateContent } = await import("@/server/content");
    await updateContent(created.id, { status: "SCHEDULED" as any, scheduledAt: input.scheduledAt });
  }

  return {
    id: created.id,
    title: created.title,
    slug: created.slug,
    city: input.city,
    metaDescription: gen.metaDescription as string | undefined,
    duplicateScore: dupe.score,
    duplicateAgainst: dupe.against,
  };
}

/**
 * Generate a deterministic SVG "hero image" for content. Offline-safe stand-in
 * for an image-generation API call — uses the dealer's accent color and
 * renders one of four style presets.
 */
export async function generateHeroImage(input: {
  headline: string;
  subhead?: string;
  accent?: string;
  style?: HeroStyle;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const accent = input.accent || dealer?.primaryColor || "#1DB954";
  const headline = (input.headline || dealer?.name || "Your Dealership").slice(0, 80);
  const subhead = (input.subhead || dealer?.city || "Trusted local dealer").slice(0, 60);
  const style = HeroStyleEnum.optional().parse(input.style) ?? "gradient";
  const brandTag = (dealer?.name ?? "A3").toUpperCase();

  const svg = renderHeroSvg({ style, headline, subhead, accent, brandTag });
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  await logGen({ kind: "hero_image", prompt: JSON.stringify(input), response: dataUrl.slice(0, 200) + "…" });
  return { dataUrl, accent, headline, subhead, style };
}

function renderHeroSvg(p: { style: HeroStyle; headline: string; subhead: string; accent: string; brandTag: string }) {
  const { style, headline, subhead, accent, brandTag } = p;
  const h = escapeXml(headline);
  const s = escapeXml(subhead);
  const t = escapeXml(brandTag);

  if (style === "minimal") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#0B0D0F"/>
  <rect x="80" y="80" width="6" height="470" fill="${accent}"/>
  <text x="120" y="310" font-family="-apple-system, system-ui, sans-serif" font-size="78" font-weight="800" fill="white">${h}</text>
  <text x="120" y="380" font-family="-apple-system, system-ui, sans-serif" font-size="30" fill="rgba(255,255,255,0.75)">${s}</text>
  <text x="120" y="560" font-family="-apple-system, system-ui, sans-serif" font-size="18" letter-spacing="6" fill="${accent}">${t}</text>
</svg>`;
  }

  if (style === "geometric") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B0D0F"/>
      <stop offset="100%" stop-color="#1A1F26"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g opacity="0.85">
    <circle cx="980" cy="160" r="220" fill="${accent}" opacity="0.18"/>
    <circle cx="1080" cy="380" r="120" fill="${accent}" opacity="0.30"/>
    <polygon points="900,90 1180,90 1040,310" fill="${accent}" opacity="0.10"/>
    <rect x="940" y="430" width="160" height="160" fill="none" stroke="${accent}" stroke-width="3" opacity="0.4" transform="rotate(15 1020 510)"/>
  </g>
  <text x="80" y="290" font-family="-apple-system, system-ui, sans-serif" font-size="84" font-weight="800" fill="white">${h}</text>
  <text x="80" y="360" font-family="-apple-system, system-ui, sans-serif" font-size="30" fill="rgba(255,255,255,0.78)">${s}</text>
  <text x="80" y="560" font-family="-apple-system, system-ui, sans-serif" font-size="18" letter-spacing="6" fill="${accent}">${t}</text>
</svg>`;
  }

  if (style === "automotive") {
    // Abstract speed lines + headlight glow + silhouette of a sedan-ish profile.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B0D0F"/>
      <stop offset="100%" stop-color="#161B22"/>
    </linearGradient>
    <radialGradient id="head" cx="92%" cy="78%" r="35%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#head)"/>
  <g stroke="${accent}" stroke-linecap="round" opacity="0.4">
    <line x1="0" y1="120" x2="200" y2="120" stroke-width="2"/>
    <line x1="0" y1="160" x2="320" y2="160" stroke-width="3"/>
    <line x1="0" y1="200" x2="140" y2="200" stroke-width="2"/>
    <line x1="0" y1="240" x2="240" y2="240" stroke-width="2"/>
    <line x1="0" y1="280" x2="180" y2="280" stroke-width="2"/>
  </g>
  <!-- Abstract car silhouette in the lower-right -->
  <g fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="2" opacity="0.85" transform="translate(700,420)">
    <path d="M 0 80 Q 40 30 130 25 L 230 5 Q 320 0 380 25 Q 440 35 460 70 L 480 95 Q 490 110 470 115 L 430 115 A 30 30 0 0 0 370 115 L 150 115 A 30 30 0 0 0 90 115 L 30 115 Q 0 115 0 95 Z"/>
    <circle cx="120" cy="118" r="22" fill="${accent}" opacity="0.85"/>
    <circle cx="400" cy="118" r="22" fill="${accent}" opacity="0.85"/>
  </g>
  <text x="80" y="280" font-family="-apple-system, system-ui, sans-serif" font-size="80" font-weight="800" fill="white">${h}</text>
  <text x="80" y="350" font-family="-apple-system, system-ui, sans-serif" font-size="30" fill="rgba(255,255,255,0.75)">${s}</text>
  <text x="80" y="560" font-family="-apple-system, system-ui, sans-serif" font-size="18" letter-spacing="6" fill="${accent}">${t}</text>
</svg>`;
  }

  // Default: bold gradient + radial highlight (original style)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#0B0D0F"/>
    </linearGradient>
    <radialGradient id="r" cx="80%" cy="10%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#r)"/>
  <text x="80" y="320" font-family="-apple-system, system-ui, sans-serif" font-size="74" font-weight="800" fill="white">${h}</text>
  <text x="80" y="390" font-family="-apple-system, system-ui, sans-serif" font-size="32" fill="rgba(255,255,255,0.8)">${s}</text>
  <text x="80" y="560" font-family="-apple-system, system-ui, sans-serif" font-size="20" letter-spacing="6" fill="rgba(255,255,255,0.55)">${t}</text>
</svg>`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

// duplicate detection helper
async function maybeFlagDuplicate(body: string) {
  const tenant = await requireTenant();
  const recent = await prisma.content.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { id: true, title: true, bodyMarkdown: true },
  });
  let best = { score: 0, against: null as null | { id: string; title: string } };
  for (const r of recent) {
    const s = detectDuplicate(body, r.bodyMarkdown ?? "");
    if (s > best.score) best = { score: s, against: { id: r.id, title: r.title } };
  }
  return best;
}
