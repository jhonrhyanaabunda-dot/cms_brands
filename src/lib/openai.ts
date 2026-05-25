import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
export const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const openai = apiKey ? new OpenAI({ apiKey }) : null;

export const hasOpenAi = !!apiKey;

/**
 * Wrapper around chat.completions with sensible defaults.
 * Falls back to an input-aware deterministic mock when no API key is configured —
 * lets the app run end-to-end in demo mode without an OpenAI key.
 */
export async function chat({
  system,
  user,
  json = false,
  temperature = 0.7,
}: {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
}): Promise<{ text: string; tokensIn?: number; tokensOut?: number }> {
  if (!openai) {
    return { text: mockResponse({ system, user, json }) };
  }
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: json ? { type: "json_object" } : undefined,
  });
  const text = res.choices[0]?.message?.content ?? "";
  return {
    text,
    tokensIn: res.usage?.prompt_tokens,
    tokensOut: res.usage?.completion_tokens,
  };
}

// --- Input-aware deterministic mocks --------------------------------------
// Demos run end-to-end without an OpenAI key. The mock parses the prompt the
// server modules send, so generated content reflects the user's actual topic,
// keyword, city, service, tone, etc.

function mockResponse({ system, user, json }: { system: string; user: string; json?: boolean }) {
  const ctx = parsePrompt(user);

  if (json) {
    if (/google review reply/i.test(user)) return reviewReplyText(ctx);
    if (/internal link/i.test(user) || /internal linking/i.test(system)) return JSON.stringify(internalLinksJson(ctx, user));
    if (/audit this dealership content/i.test(user)) return JSON.stringify(qaJson(ctx));
    if (/optimized seo meta tags/i.test(user) || /meta tags/i.test(user)) return JSON.stringify(metaJson(ctx));
    if (/google business profile post/i.test(user)) return JSON.stringify(gbpJson(ctx));
    if (/landing page/i.test(user)) return JSON.stringify(landingJson(ctx));
    // default JSON shape → blog
    return JSON.stringify(blogJson(ctx));
  }

  // plain text replies
  if (/google review reply/i.test(user)) return reviewReplyText(ctx);
  if (/rewrite the following copy/i.test(user)) return rewriteText(ctx, user);
  return blogBody(ctx);
}

type Ctx = {
  dealerName: string;
  brand?: string;
  topic?: string;
  service?: string;
  keyword?: string;
  tone?: string;
  city?: string;
  state?: string;
  cta?: string;
  wordCount?: number;
  reviewBody?: string;
  rating?: number;
};

function parsePrompt(p: string): Ctx {
  const grab = (re: RegExp) => p.match(re)?.[1]?.trim();
  // dealership name appears as "for {Name}" or "from {Name}." in our prompts
  const dealerName =
    grab(/^Write a complete blog post for ([^\n.]+?)(?: serving |\.|\n|$)/i) ||
    grab(/landing page for ([^\n.]+?)\./i) ||
    grab(/post for ([^\n.]+?)\./i) ||
    grab(/reply from ([^\n.]+?)\./i) ||
    "your dealership";
  const brand = grab(/OEM Brand: ([^\n]+)/i) || grab(/for a ([^\n]+?) dealership/i);
  return {
    dealerName,
    brand,
    topic: grab(/Topic: ([^\n]+)/i),
    service: grab(/Service(?: \/ offer)?: ([^\n]+)/i),
    keyword: grab(/Primary keyword: ([^\n]+)/i) || grab(/Target keyword: ([^\n]+)/i),
    tone: grab(/Tone: ([^\n]+)/i),
    city: grab(/(?:serving |City target: |City: )([A-Za-z .'-]+?)(?:\.|\n|$)/i),
    state: grab(/State: ([^\n]+)/i),
    cta: grab(/Suggested CTA: ([^\n]+)/i),
    wordCount: Number(grab(/Target length: (\d+)/i)) || undefined,
    reviewBody: grab(/Customer review \(\d+★\): "([^"]+)"/i),
    rating: Number(grab(/Customer review \((\d+)★\)/i)) || undefined,
  };
}

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}
function clamp(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function blogTitle(ctx: Ctx) {
  const base = ctx.topic || ctx.keyword || "Your Next Visit to the Dealership";
  const cityPart = ctx.city ? ` in ${ctx.city}` : "";
  return titleCase(base) + cityPart;
}

function keywordList(ctx: Ctx): string[] {
  const seeds = [ctx.keyword, ctx.topic, ctx.service, ctx.city && `${ctx.service ?? "service"} ${ctx.city}`, ctx.brand && `${ctx.brand} dealer`]
    .filter(Boolean) as string[];
  const generic = ["dealership", "trusted local dealer", "certified technicians", "OEM parts", "schedule online"];
  const out: string[] = [];
  for (const s of [...seeds, ...generic]) {
    const v = s.toLowerCase().trim();
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= 7) break;
  }
  return out;
}

function blogBody(ctx: Ctx) {
  const topic = ctx.topic || "your next service visit";
  const keyword = ctx.keyword || topic;
  const city = ctx.city ? ` in ${ctx.city}` : "";
  const dealer = ctx.dealerName;
  const tone = ctx.tone || "professional";

  return `## Why ${titleCase(topic)} Matters${city}

At ${dealer}, drivers come to us because ${keyword} is more than a checkbox — it's the difference between a vehicle that lasts and one that lets you down at the worst possible moment. Our ${tone}, factory-trained team treats every appointment like it's our own car on the lift.

## What Sets ${dealer} Apart

- Manufacturer-certified technicians with continuous OEM training
- Genuine ${ctx.brand ?? "OEM"} parts and approved fluids — no aftermarket guesswork
- Transparent quoting before any work begins
- Complimentary multi-point inspection on every visit
- Comfortable customer lounge and loaner vehicles available

## A Local Approach to ${titleCase(keyword)}

Drivers${city} expect more than a quick turnaround — they expect honest answers. When you bring your vehicle in, you'll get a walkthrough of exactly what we found, what's urgent, and what can wait. That trust is why so many of our customers come back for [service](/service), [their next vehicle](/inventory), and [financing](/finance).

## Frequently Asked Questions

**How often should I schedule ${keyword}?**
For most modern vehicles, every 5,000–7,500 miles or every six months — whichever comes first. Your owner's manual is the authoritative source for your specific model.

**Will service at ${dealer} affect my warranty?**
No. Using OEM-certified service actually preserves your factory warranty and ensures the technicians know your vehicle's exact specifications.

**Can I book ${keyword} online?**
Yes — our [online scheduler](/service) takes about sixty seconds and gives you real-time availability.

## Ready When You Are

Whether it's routine maintenance or something more urgent, ${dealer}${city} is built around making service easy. [Reserve your appointment](/service) today and let our team take care of the rest.
`;
}

function blogJson(ctx: Ctx) {
  const title = blogTitle(ctx);
  const body = blogBody(ctx);
  const metaTitle = clamp(title + (ctx.dealerName ? ` | ${ctx.dealerName}` : ""), 60);
  const excerpt = clamp(
    `Everything ${ctx.city ? `${ctx.city} ` : ""}drivers need to know about ${ctx.keyword || ctx.topic || "service"} — from what's included to what to expect at your next visit.`,
    180,
  );
  const metaDescription = clamp(
    `${ctx.dealerName} offers ${ctx.keyword || ctx.topic || "expert service"}${ctx.city ? ` in ${ctx.city}` : ""}. Factory-certified technicians, transparent pricing, online booking. Schedule today.`,
    160,
  );
  return {
    title,
    slug: slugify(title),
    metaTitle,
    metaDescription,
    excerpt,
    keywords: keywordList(ctx),
    bodyMarkdown: body,
    schema: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      author: { "@type": "Organization", name: ctx.dealerName },
    },
  };
}

function landingJson(ctx: Ctx) {
  const service = ctx.service || ctx.topic || "Service";
  const city = ctx.city ? ` in ${ctx.city}` : "";
  const title = `${titleCase(service)}${city}${ctx.brand ? ` for ${ctx.brand} Drivers` : ""}`;
  const body = `## ${titleCase(service)} You Can Trust${city}

When you need ${service.toLowerCase()}${city}, ${ctx.dealerName} delivers manufacturer-certified work, transparent pricing, and same-week availability — without the dealership runaround.

## Why ${ctx.dealerName}

- **Factory-trained experts** — our technicians complete continuous ${ctx.brand ?? "OEM"} training
- **Genuine parts only** — we never substitute aftermarket components on ${ctx.brand ?? "your vehicle"}
- **Upfront quotes** — you approve every line item before we start

## What Customers Say

> "Best ${service.toLowerCase()} experience I've ever had${city}. Honest, fast, and the price matched the quote exactly."
> — Recent customer review

## Our ${titleCase(service)} Process

1. Schedule online or by phone — most appointments available within 48 hours
2. Multi-point inspection on arrival
3. Detailed quote with photos, sent to your phone
4. Work completed with OEM parts and a manufacturer-backed warranty

## Frequently Asked Questions

**How long does ${service.toLowerCase()} take?**
Most visits are completed within the same day. Complex jobs receive a complimentary loaner vehicle.

**Is ${service.toLowerCase()} covered by my warranty?**
We honor all in-warranty work and can submit claims on your behalf.

**Do I need an appointment?**
We recommend it — same-week slots fill quickly${city ? ` in the ${ctx.city} area` : ""}.

## Schedule ${titleCase(service)} Today

[Book your appointment](/service) — it takes under a minute, and our team will confirm by text.
`;
  return {
    title,
    slug: slugify(title),
    metaTitle: clamp(`${titleCase(service)}${city} | ${ctx.dealerName}`, 60),
    metaDescription: clamp(
      `${titleCase(service)}${city} at ${ctx.dealerName}. Factory-certified technicians, genuine parts, transparent quotes. Book online in under a minute.`,
      160,
    ),
    excerpt: clamp(`${titleCase(service)}${city} — certified, transparent, and same-week availability.`, 180),
    keywords: keywordList(ctx),
    bodyMarkdown: body,
  };
}

function gbpJson(ctx: Ctx) {
  const topic = ctx.topic || "this week's featured offer";
  const cta = ctx.cta || "Schedule today";
  const title = clamp(titleCase(topic), 70);
  const bodyMarkdown =
    `${titleCase(topic)} at ${ctx.dealerName}${ctx.city ? ` in ${ctx.city}` : ""}.\n\n` +
    `Our team is ready to help you with ${ctx.keyword || topic}. Factory-certified, transparently priced, and built around your schedule.\n\n` +
    `${cta} — call us or [book online](/service).\n\n` +
    `#${(ctx.brand ?? "Dealership").replace(/\s+/g, "")} #${(ctx.city ?? "LocalService").replace(/\s+/g, "")}`;
  return { title, bodyMarkdown: clamp(bodyMarkdown, 1500) };
}

function metaJson(ctx: Ctx) {
  const t = ctx.topic || ctx.keyword || "Trusted Local Dealership";
  return {
    metaTitle: clamp(`${titleCase(t)} | ${ctx.dealerName}`, 60),
    metaDescription: clamp(
      `${titleCase(t)} at ${ctx.dealerName}${ctx.city ? ` in ${ctx.city}` : ""}. Certified technicians, OEM parts, transparent pricing. Book online today.`,
      160,
    ),
    keywords: keywordList(ctx),
  };
}

function internalLinksJson(_ctx: Ctx, prompt: string) {
  // Extract any "- Title (/slug)" lines from the prompt's available pages list.
  const pages = Array.from(prompt.matchAll(/^- (.+?) \((\/[^\s)]+)\)/gm)).map((m) => ({ title: m[1], href: m[2] }));
  const fallback = [
    { title: "Service Center", href: "/service" },
    { title: "New Inventory", href: "/inventory/new" },
    { title: "Financing", href: "/finance" },
    { title: "Trade-In Value", href: "/trade-in" },
    { title: "About Us", href: "/about" },
  ];
  const pool = pages.length ? pages : fallback;
  const suggestions = pool.slice(0, 5).map((p) => ({
    anchor: p.title.toLowerCase(),
    href: p.href,
    reason: `Anchors related intent on "${p.title}" and reinforces topical authority for the linked page.`,
  }));
  return { suggestions };
}

function qaJson(_ctx: Ctx) {
  return {
    qaScore: 86,
    hallucinationFlags: [],
    oemComplianceIssues: [],
    suggestions: [
      "Add a disclaimer near any pricing or financing claims.",
      "Consider adding a 'last updated' date for freshness signals.",
      "Strengthen the closing CTA with a direct booking link.",
    ],
  };
}

function reviewReplyText(ctx: Ctx) {
  const positive = (ctx.rating ?? 5) >= 4;
  if (positive) {
    return `Thank you so much for the kind review! We're thrilled our team made your visit a positive one — feedback like yours means the world to everyone at ${ctx.dealerName}. We'll see you next time.\n\n— The ${ctx.dealerName} team`;
  }
  return `Thank you for taking the time to share this — we're genuinely sorry your experience didn't meet the standard we hold ourselves to. We'd like to make it right. Please reach out to our General Manager directly so we can look into this personally.\n\n— The ${ctx.dealerName} team`;
}

function rewriteText(ctx: Ctx, prompt: string) {
  const tone = ctx.tone || "professional";
  const body = prompt.split("---").pop()?.trim() ?? "";
  return `_Rewritten in a ${tone} tone:_\n\n${body
    .split(/\n+/)
    .map((line) => (line.trim() ? line.replace(/\.$/, "") + (tone === "luxury" ? ", crafted with care." : tone === "energetic" ? "!" : ".") : line))
    .join("\n\n")}`;
}
