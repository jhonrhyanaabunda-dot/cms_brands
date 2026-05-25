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
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });

  const tone = ToneEnum.optional().parse(input.tone) ?? "professional";
  const words = input.wordCount ?? 900;

  const userPrompt = `
Write a complete blog post for ${dealer?.name}${input.city ? ` serving ${input.city}` : ""}.

Topic: ${input.topic}
Primary keyword: ${input.keyword}
Tone: ${tone}
Target length: ${words} words

Return STRICT JSON with keys: title, slug, metaTitle, metaDescription, excerpt, keywords (array of 5–8 strings), bodyMarkdown (full blog with H2 sections, bullet lists, internal links to "/service", "/inventory", "/finance" where natural).
The bodyMarkdown must include at minimum: an intro paragraph, 3–5 H2 sections, a FAQ section with 3 questions, and a closing CTA.
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
  return { ...parsed, duplicateScore: dupe.score, duplicateAgainst: dupe.against };
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
Generate a high-converting SEO landing page for ${dealer?.name}.

Service: ${input.service}
${input.city ? `City target: ${input.city}` : ""}
${input.oemBrand ? `OEM Brand: ${input.oemBrand}` : ""}
Primary keyword: ${input.keyword}

Return STRICT JSON with: title, slug, metaTitle, metaDescription, excerpt, keywords (5–8), bodyMarkdown.
The bodyMarkdown must include: hero headline, value props (3 bullets), social proof, services overview, FAQ (3 Qs), strong closing CTA.
`.trim();

  const { text, tokensIn, tokensOut } = await chat({
    system: SYSTEM_BASE(dealer?.brand),
    user: userPrompt,
    json: true,
  });
  await logGen({ kind: "landing", prompt: userPrompt, response: text, tokensIn, tokensOut });
  try { return JSON.parse(text); } catch { throw new Error("AI returned non-JSON"); }
}

export async function generateGbpPost(input: { topic: string; tone?: Tone; cta?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const tone = ToneEnum.optional().parse(input.tone) ?? "friendly";

  const userPrompt = `
Write a Google Business Profile post for ${dealer?.name}.

Topic: ${input.topic}
Tone: ${tone}
${input.cta ? `Suggested CTA: ${input.cta}` : ""}

Constraints: ≤ 1500 characters total. Compelling opening, 2–3 sentences of value, clear CTA, 1–2 relevant hashtags. Return strict JSON: { title, bodyMarkdown }.
`.trim();

  const { text, tokensIn, tokensOut } = await chat({
    system: SYSTEM_BASE(dealer?.brand),
    user: userPrompt,
    json: true,
  });
  await logGen({ kind: "gbp_post", prompt: userPrompt, response: text, tokensIn, tokensOut });
  try { return JSON.parse(text); } catch { return { title: "GBP Post", bodyMarkdown: text }; }
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
    const gen = await generateLandingPage({ service: input.service, city, keyword: `${input.keyword} ${city}` });
    const created = await createContent({
      type: "CITY_PAGE" as ContentType,
      title: gen.title || `${input.service} in ${city}`,
      slug: gen.slug,
      excerpt: gen.excerpt,
      bodyMarkdown: gen.bodyMarkdown,
      metaTitle: gen.metaTitle,
      metaDescription: gen.metaDescription,
      aiGenerated: true,
      aiModel: MODEL,
      targetCity: city,
      targetState: input.state,
      targetKeyword: `${input.keyword} ${city}`,
    });
    results.push({ id: created.id, title: created.title, slug: created.slug });
  }
  return results;
}

/**
 * Generate a deterministic SVG "hero image" for content. Offline-safe stand-in
 * for an image-generation API call — uses the dealer's accent color, a tasteful
 * gradient, and the headline text.
 */
export async function generateHeroImage(input: { headline: string; subhead?: string; accent?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "ai.use")) throw new Error("FORBIDDEN");
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const accent = input.accent || dealer?.primaryColor || "#1DB954";
  const headline = (input.headline || dealer?.name || "Your Dealership").slice(0, 80);
  const subhead = (input.subhead || dealer?.city || "Trusted local dealer").slice(0, 60);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
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
  <text x="80" y="320" font-family="-apple-system, system-ui, sans-serif" font-size="74" font-weight="800" fill="white">${escapeXml(headline)}</text>
  <text x="80" y="390" font-family="-apple-system, system-ui, sans-serif" font-size="32" fill="rgba(255,255,255,0.8)">${escapeXml(subhead)}</text>
  <text x="80" y="560" font-family="-apple-system, system-ui, sans-serif" font-size="20" letter-spacing="6" fill="rgba(255,255,255,0.55)">${escapeXml((dealer?.name ?? "A3").toUpperCase())}</text>
</svg>`;
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  await logGen({ kind: "hero_image", prompt: JSON.stringify(input), response: dataUrl.slice(0, 200) + "…" });
  return { dataUrl, accent, headline, subhead };
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
