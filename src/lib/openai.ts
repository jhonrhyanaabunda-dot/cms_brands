import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Provider selection ───────────────────────────────────────────────────
// Preference order: Gemini (free tier) → OpenAI (paid) → deterministic mocks.
// First key found wins, so users can flip providers by setting one env var.

const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o-mini";

const gemini = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

// Active provider — drives both the integration-status display and the
// `model` column we log against each AiGeneration row.
export const PROVIDER: "gemini" | "openai" | "mock" =
  gemini ? "gemini" : openai ? "openai" : "mock";

// Public model identifier — used by server actions when writing
// AiGeneration.model so cost/usage reports show which model produced what.
export const MODEL =
  PROVIDER === "gemini" ? GEMINI_MODEL :
  PROVIDER === "openai" ? OPENAI_MODEL_NAME :
  "mock";

export const hasGemini = PROVIDER === "gemini";
export const hasOpenAi = PROVIDER === "openai";
export const hasRealAi = PROVIDER !== "mock";

/**
 * Provider-agnostic chat wrapper. Routes to whichever real API is
 * configured, falling back to input-aware deterministic mocks when neither
 * is — lets the app run end-to-end in demo mode without any AI keys.
 *
 * `json: true` requests strict JSON output. Both Gemini and OpenAI support
 * this natively; the mock checks the same flag.
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
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: system,
        generationConfig: {
          temperature,
          responseMimeType: json ? "application/json" : "text/plain",
        },
      });
      const res = await model.generateContent(user);
      const text = res.response.text() ?? "";
      const usage = res.response.usageMetadata;
      return {
        text,
        tokensIn:  usage?.promptTokenCount,
        tokensOut: usage?.candidatesTokenCount,
      };
    } catch (e) {
      // Hard-fail surfaces in the caller's toast / activity log; falling
      // through to mocks would silently mask broken keys / quota errors.
      throw e;
    }
  }

  if (openai) {
    const res = await openai.chat.completions.create({
      model: OPENAI_MODEL_NAME,
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

  return { text: mockResponse({ system, user, json }) };
}

// --- Input-aware deterministic mocks --------------------------------------
// Demos run end-to-end without an OpenAI key. The mock parses the prompt the
// server modules send, so generated content reflects the user's actual topic,
// keyword, city, service, tone, etc.

// Re-exported for the workflow engine, which builds Ctx explicitly from a
// dealershipId rather than parsing a prompt.
export type MockCtx = Ctx;
export {
  gbpJson as mockGbpJson,
  landingJson as mockLandingJson,
  reviewReplyText as mockReviewReplyText,
  blogJson as mockBlogJson,
  metaJson as mockMetaJson,
};

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
  structure?: string;
  audience?: string;
  postType?: string;
  offerName?: string;
  offerStart?: string;
  offerEnd?: string;
  offerCode?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
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
    structure: grab(/Structure: ([a-z]+)/i),
    audience: grab(/Audience: ([a-z]+)/i),
    postType: grab(/Post type: ([a-z]+)/i),
    offerName: grab(/Offer name: ([^\n]+)/i),
    offerStart: grab(/Offer start: ([^\n]+)/i),
    offerEnd: grab(/Offer end: ([^\n]+)/i),
    offerCode: grab(/Coupon code: ([^\n]+)/i),
    eventName: grab(/Event name: ([^\n]+)/i),
    eventDate: grab(/Event date: ([^\n]+)/i),
    eventLocation: grab(/Event location: ([^\n]+)/i),
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

function audienceFlavor(audience?: string) {
  switch (audience) {
    case "family":      return { hook: "Family drivers", focus: "safety, space, and total cost of ownership" };
    case "luxury":      return { hook: "Luxury buyers", focus: "refinement, concierge service, and curated craftsmanship" };
    case "performance": return { hook: "Performance enthusiasts", focus: "engineering specs, driving feel, and motorsport heritage" };
    case "firsttime":   return { hook: "First-time buyers", focus: "financing, warranties, and what to expect from start to finish" };
    case "fleet":       return { hook: "Fleet & commercial buyers", focus: "uptime, cost of operation, and dedicated fleet support" };
    default:            return { hook: "Drivers", focus: "trust, transparency, and practical guidance" };
  }
}

function blogBody(ctx: Ctx) {
  const topic = ctx.topic || "your next service visit";
  const Topic = titleCase(topic);
  const keyword = ctx.keyword || topic;
  const Keyword = titleCase(keyword);
  const city = ctx.city ? ` in ${ctx.city}` : "";
  const cityOnly = ctx.city ?? "";
  const dealer = ctx.dealerName;
  const brand = ctx.brand ?? "OEM";
  const tone = ctx.tone || "professional";
  const aud = audienceFlavor(ctx.audience);
  const structure = (ctx.structure ?? "article").toLowerCase();

  // Common closing block reused by every structure.
  const closing = `## The Bottom Line

Whether you're here for ${keyword}${city} or just sizing up your options, ${dealer} is built around making the process easy and honest. Browse [our current inventory](/inventory), explore [financing options](/finance), or [book a service appointment](/service) — whichever fits where you are today.

_Have a question we didn't cover? [Get in touch](/contact) and a real human on our team will get back to you._`;

  if (structure === "howto") {
    return `## ${Topic}: A Practical Guide${city}

${aud.hook}${city} keep asking us the same question: how do I actually do this right the first time? This guide walks through everything our ${tone}, factory-trained ${dealer} team teaches new owners about ${keyword} — without the jargon, without the upsell.

### What you'll need

- Your owner's manual (or your VIN — we can pull spec data for you)
- A clean, well-lit space to work
- Manufacturer-approved parts and fluids — never generic substitutes on ${brand} vehicles
- About 30–45 minutes of focused time

## Step 1 — Prep the Vehicle

Before you start anything, park on level ground, set the parking brake, and let the vehicle cool if it's been driven recently. Skipping this step is the #1 cause of preventable injury during DIY work.

## Step 2 — Verify the Spec

Cross-check the procedure against your owner's manual. ${brand} updates service intervals and torque specs between model years, and the printed dashboard sticker is not always current.

## Step 3 — Inspect Before You Replace

Most ${keyword} jobs are really diagnosis jobs in disguise. Inspect the surrounding components for wear, corrosion, or contamination first. A 15-minute inspection saves a 3-hour rework.

## Step 4 — Use the Right Tools

Torque wrenches matter. Hand-tight isn't a spec. If you don't own one, our [service center](/service) will torque-verify your work for free.

## Step 5 — Document As You Go

Phone photos before, during, and after. Future you (and your resale value) will thank you.

## Step 6 — Final Check

Start the vehicle, listen for anomalies, scan for new dashboard lights, and take a slow shakedown drive. Anything off? Stop and reassess before logging more miles.

> **Pro tip:** Save your work in a simple maintenance log — we keep one for every customer who services with us, and it lifts resale by a measurable amount.

## When to Call ${dealer} Instead

DIY is great until it isn't. If you hit any of these, it's time to let a certified tech finish the job:

- Stripped or seized fasteners
- Warning lights that don't clear
- Anything involving high-voltage systems on hybrids/EVs
- Procedures that require ${brand}-specific diagnostic software

## Frequently Asked Questions

**How long should ${keyword} actually take a first-timer?**
Plan 1.5× the time a shop would quote. Speed comes with reps; accuracy is what matters early on.

**Will doing this myself void my warranty?**
No — federal law protects your right to self-service. Document your work and use OEM-approved parts.

**Can ${dealer} just check my work?**
Yes. We offer post-DIY inspections — bring it in and we'll torque-verify and scan for codes.

${closing}
`;
  }

  if (structure === "listicle") {
    return `## ${Topic}${city}: ${10} Things ${aud.hook} Should Know

${aud.hook}${city} come to ${dealer} because we don't waste their time. So instead of a long preamble, here's the short list of what actually matters with ${keyword} — written in a ${tone} voice and grounded in ${aud.focus}.

### 1. Start With Your Owner's Manual
It's the single source of truth for your specific trim, engine, and model year. Anything that contradicts it loses by default.

### 2. Service Intervals Are Maximums, Not Recommendations
Severe-use schedules — short trips, hot climates, towing — cut intervals roughly in half. Most drivers fall into "severe" without realizing.

### 3. OEM Parts Pay for Themselves
Aftermarket parts often save 15–20% upfront and cost 40% more in failures down the road. On ${brand} platforms, fitment tolerances are tight.

### 4. Diagnostic Codes Aren't a Diagnosis
A code is a clue, not a verdict. Anyone replacing parts based on the code alone is gambling with your wallet.

### 5. Brakes Are a System
Pads, rotors, calipers, fluid, and hardware all wear together. Replacing one piece in isolation almost always rebounds within 12 months.

### 6. Tires Are Your Most Important Safety System
Tread depth, pressure, and rotation matter more than airbags in 95% of incidents. Check monthly. Always.

### 7. Battery Health Predicts Electrical Surprises
A weak battery causes phantom faults that look expensive but cost $200 to fix at the source. Test annually.

### 8. Fluids Have Life Cycles
Brake fluid absorbs moisture. Coolant degrades. Transmission fluid breaks down. "Lifetime" rarely means lifetime.

### 9. Resale Value Lives in Records
Document every service. Vehicles with complete service records sell for noticeably more than identical vehicles without.

### 10. Your Dealer Should Earn Your Loyalty Every Visit
That's our standard at ${dealer}. If we don't, tell us and we'll make it right.

## Quick Takeaway

If you remember just three things from this list: **read the manual, fix systems not symptoms, and document everything.** That's how ${aud.hook.toLowerCase()} keep ${brand} vehicles running at full capability for the long haul.

## Frequently Asked Questions

**Which of these matters most?**
Honestly? #2 and #4. Most preventable damage and most preventable cost come from missing those two.

**What if I've been ignoring some of these?**
Most issues are reversible. Bring your vehicle to [our service team](/service) for a multi-point inspection — we'll tell you what's urgent and what can wait.

${closing}
`;
  }

  if (structure === "comparison") {
    return `## ${Topic}${city}: A Side-by-Side Comparison

${aud.hook}${city} ask us this comparison constantly, so we put it in writing — with the same ${tone} honesty we'd give a friend. No fluff, no upsell.

## The Two Options At a Glance

| Dimension              | Option A                                 | Option B                                 |
| ---------------------- | ---------------------------------------- | ---------------------------------------- |
| Upfront cost           | Lower                                    | Higher                                   |
| 5-year cost to own     | Often higher (more service)              | Often lower (warranty + reliability)     |
| Reliability            | Mixed by model year                      | Consistently strong                      |
| Resale value           | Average                                  | Above average                            |
| Service network${city ? ` ${cityOnly}` : ""}        | Limited                                  | ${dealer} + ${brand} national network   |
| Recommended for        | Short-term ownership                     | 5+ year ownership horizon                |

## Where Option A Wins

Option A is the right call when the priority is **getting in the door**. If cash flow today matters more than total cost over five years, the lower upfront price tag is hard to argue with — provided you go in eyes open about service costs.

## Where Option B Wins

For ${aud.focus}, Option B almost always wins on the math that matters: total cost of ownership, time spent waiting on repairs, and what you'll get back at trade-in. When we run the numbers honestly, the gap is usually larger than buyers expect.

## What Most Comparisons Get Wrong

They compare sticker price instead of 5-year cost. They ignore service network density. They don't account for resale. We'd rather lose a sale than sell you the wrong vehicle, so we lay out all three.

## Our Verdict

If you're staying under three years, Option A is defensible. For anyone else — especially ${aud.hook.toLowerCase()} — Option B is the better long-term decision. The math holds up in 9 out of 10 scenarios we run.

## Frequently Asked Questions

**How do you arrive at the 5-year cost number?**
Manufacturer service schedules + average parts/labor in our region + projected depreciation curves from third-party data. We'll happily walk through the spreadsheet.

**Can I test drive both back-to-back?**
Yes. Book a [side-by-side test drive](/inventory) and we'll have both ready.

**What about a third option?**
Glad you asked. Email our team and we'll run any comparison you want, no obligation.

${closing}
`;
  }

  if (structure === "news") {
    return `## ${Topic}: What ${aud.hook}${city} Need to Know

**${cityOnly || "Local"} — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.** ${dealer} is breaking down what just changed in the world of ${keyword} and what it means for the drivers we serve.

## What This Means for Drivers

For ${aud.hook.toLowerCase()}${city}, the practical impact lands in three places: **what you pay**, **what's covered**, and **how quickly you can get serviced**. We've outlined each below in plain English.

## Background

The ${keyword} landscape has shifted noticeably in the last 12 months. Supply, regulation, and OEM strategy have all moved together — which is why our team has been preparing for this update since earlier this year.

> "We've been planning for this exact moment with our service department," a ${dealer} representative said. "${aud.hook} should see a smoother experience than they would at a less-prepared dealer."

## What's Next

Over the next quarter, expect a handful of additional updates — including refreshed pricing on common service items and an expanded loaner fleet${city ? ` to better serve ${cityOnly}` : ""}. We'll publish details as they're confirmed.

## Action Steps

1. Check whether your vehicle is affected — [book a free inspection](/service).
2. Review your service records — bring them in or let us pull them.
3. Sign up for our email list to get future updates before they're public.

## Frequently Asked Questions

**Does this affect my warranty?**
In most cases, no — and where it does, our team will handle the paperwork on your behalf.

**Will service prices change?**
A few items will adjust. The bigger change is what's *included* — typically more value for the same money.

**Where can I read the official source?**
We're happy to share the primary documents. Email our team and we'll send them over.

${closing}
`;
  }

  if (structure === "faq") {
    const ask = (q: string, a: string) => `## ${q}\n\n${a}\n`;
    return `**${Topic}${city}** — answered fast and honestly. ${aud.hook}${city} keep asking variations of these questions, so we've gathered the most useful ones below. Save this page for later, or scroll to the question that brought you here.

${ask(`What exactly is ${keyword}, and why does it matter?`,
       `${Keyword} is the difference between a vehicle that lasts and one that doesn't. For ${aud.focus}, it's where the practical value of ownership shows up.`)}
${ask(`How often should I think about ${keyword}?`,
       `For most modern ${brand} vehicles, it's a routine consideration — but the right cadence depends on your driving conditions. Our [service team](/service) tunes the schedule to your usage.`)}
${ask(`Will my warranty cover this?`,
       `Often, yes. We submit warranty claims on your behalf, so you typically don't need to be on the phone.`)}
${ask(`How long should it take?`,
       `Most jobs we handle are same-day. Complex work gets a complimentary loaner so your week doesn't grind to a halt.`)}
${ask(`How do I know I'm not being upsold?`,
       `Every line item is documented with photos and an explanation. You approve before we begin. If something's optional, we'll say so — out loud.`)}
${ask(`What if I service somewhere else and want a second opinion?`,
       `Bring it in. We'll inspect, give you our findings in writing, and you can decide where to have the work done.`)}
${ask(`Can ${dealer} service vehicles I didn't buy here?`,
       `Absolutely. Factory-trained ${brand} service is the same regardless of where you purchased.`)}
${ask(`What does ${keyword} typically cost?`,
       `It depends on your vehicle and trim. We publish typical ranges and quote you exactly before work begins — never an estimate that turns into a surprise.`)}
${ask(`Do I need an appointment?`,
       `We strongly recommend one${city ? ` — ${cityOnly} slots fill quickly` : ""}. Walk-ins are welcome but may need to leave the vehicle.`)}
${ask(`What's the best way to get started?`,
       `[Book online](/service) in under a minute, or call during business hours and a service advisor will walk you through it.`)}

${closing}`;
  }

  // Default "article" structure (long-form editorial).
  return `## Why ${Topic} Matters${city}

At ${dealer}, ${aud.hook.toLowerCase()} come to us because ${keyword} is more than a checkbox — it's the difference between a vehicle that lasts and one that lets you down at the worst possible moment. Our ${tone}, factory-trained team treats every appointment like it's our own car on the lift, with a particular focus on ${aud.focus}.

This article walks through what most drivers wish someone had told them about ${keyword} — the things you only learn after a few visits to a shop that's actually honest with you.

## The Real Cost of Getting ${Topic} Wrong

Here's what we see week after week: ${aud.hook.toLowerCase()} put off ${keyword} because they think they're saving money. The truth is the opposite. The small, preventable maintenance items are what keep the big, expensive failures from happening — and the gap between "small fix today" and "engine job in 18 months" is genuinely that wide.

## What Sets ${dealer} Apart

- **Manufacturer-certified technicians** with continuous ${brand} training — minimum 40 hours per technician per year.
- **Genuine ${brand} parts and approved fluids** — no aftermarket substitutes on critical systems.
- **Transparent quoting** before any work begins. You approve every line item.
- **Complimentary multi-point inspection** on every visit, with photos and short videos sent to your phone.
- **Comfortable customer lounge** with fast Wi-Fi, espresso, charging stations, and a quiet workspace.
- **Loaner vehicles** for overnight and multi-day work.

## A Local Approach to ${Keyword}${city}

${aud.hook}${city} expect more than a quick turnaround — they expect honest answers. When you bring your vehicle in, you'll get a walkthrough of exactly what we found, what's urgent, and what can wait. That trust is why so many of our customers come back for [service](/service), [their next vehicle](/inventory), and [financing](/finance).

We post our prices, we explain our process, and we don't pad invoices with phantom inspection fees. It's a low bar, and a surprising number of shops don't clear it.

## How Our ${Keyword} Process Works

1. **Schedule** online or by phone — most appointments available within 48 hours${city ? ` for ${cityOnly} drivers` : ""}.
2. **Quick walk-around** with a service advisor so nothing's missed.
3. **Multi-point inspection** — tires, brakes, fluids, suspension, lighting, battery, safety systems.
4. **Diagnostic confirmation** so we treat the cause, not the symptom.
5. **Detailed written quote** with photos. You approve line by line.
6. **Certified repair** by a ${brand}-trained tech using OEM parts.
7. **Second-set-of-eyes** quality check before your keys are returned.
8. **Follow-up** a few days later to make sure everything's running right.

## What Most Articles Won't Tell You

Most "${keyword}" articles online are written by someone who's never lifted a wrench. Ours are written by the same techs who'd be working on your vehicle. That's why ours include things like: which OEM bulletins matter for your model year, which torque specs changed mid-cycle, and which "standard" service items are actually optional for your driving conditions.

If you want a vehicle to last past its second owner, that nuance matters.

## Frequently Asked Questions

**How often should I schedule ${keyword}?**
For most modern vehicles, every 5,000–7,500 miles or every six months — whichever comes first. Your owner's manual is the authoritative source for your specific model.

**Will service at ${dealer} affect my warranty?**
No. Using OEM-certified service actually *preserves* your factory warranty and ensures the technicians know your vehicle's exact specifications.

**Can I book ${keyword} online?**
Yes — our [online scheduler](/service) takes about sixty seconds and gives you real-time availability.

**What if I'm shopping for a new vehicle, not service?**
We can help with both. Browse [our current inventory](/inventory) and we'll set up a test drive.

**What if I need financing?**
Apply online in under a minute through our [financing portal](/finance) — all credit is considered.

${closing}
`;
}

function blogOutline(ctx: Ctx): string[] {
  const Topic = titleCase(ctx.topic || "your next service visit");
  const Keyword = titleCase(ctx.keyword || ctx.topic || "service");
  const structure = (ctx.structure ?? "article").toLowerCase();
  if (structure === "howto") return [
    `${Topic}: A Practical Guide`, "Step 1 — Prep the Vehicle", "Step 2 — Verify the Spec",
    "Step 3 — Inspect Before You Replace", "Step 4 — Use the Right Tools", "Step 5 — Document As You Go",
    "Step 6 — Final Check", `When to Call ${ctx.dealerName} Instead`, "Frequently Asked Questions", "The Bottom Line",
  ];
  if (structure === "listicle") return [
    `${Topic}: 10 Things You Should Know`, "Quick Takeaway", "Frequently Asked Questions", "The Bottom Line",
  ];
  if (structure === "comparison") return [
    `${Topic}: A Side-by-Side Comparison`, "The Two Options At a Glance",
    "Where Option A Wins", "Where Option B Wins", "What Most Comparisons Get Wrong",
    "Our Verdict", "Frequently Asked Questions", "The Bottom Line",
  ];
  if (structure === "news") return [
    `${Topic}: What Drivers Need to Know`, "What This Means for Drivers", "Background",
    "What's Next", "Action Steps", "Frequently Asked Questions", "The Bottom Line",
  ];
  if (structure === "faq") return [
    `What exactly is ${Keyword}?`, "How often should I think about this?", "Will my warranty cover this?",
    "How long should it take?", "How do I know I'm not being upsold?", "Second opinion?",
    "Service vehicles bought elsewhere?", "Typical cost?", "Need an appointment?", "Best way to get started?",
    "The Bottom Line",
  ];
  return [
    `Why ${Topic} Matters`, `The Real Cost of Getting ${Topic} Wrong`,
    `What Sets ${ctx.dealerName} Apart`, `A Local Approach to ${Keyword}`,
    `How Our ${Keyword} Process Works`, "What Most Articles Won't Tell You",
    "Frequently Asked Questions", "The Bottom Line",
  ];
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
    outline: blogOutline(ctx),
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
  const Service = titleCase(service);
  const svc = service.toLowerCase();
  const city = ctx.city ? ` in ${ctx.city}` : "";
  const cityOnly = ctx.city ?? "";
  const brand = ctx.brand ?? "OEM";
  const Brand = titleCase(brand);
  const dealer = ctx.dealerName;
  const kw = ctx.keyword || svc;

  const title = `${Service}${city}${ctx.brand ? ` for ${Brand} Drivers` : ""}`;

  const body = `## ${Service} You Can Trust${city}

When you need ${svc}${city}, ${dealer} delivers manufacturer-certified work, transparent pricing, and same-week availability — without the dealership runaround that wastes a Saturday and still leaves you guessing.

We've spent years building a ${svc} program designed around one idea: drivers deserve to know exactly what's being done to their vehicle, exactly what it costs, and exactly when they'll have their keys back. Whether you're here for routine maintenance, a major repair, or a second opinion, you'll work with a team that treats your time and your vehicle with the same respect we'd want for ourselves.

> **Same-week appointments · Genuine ${Brand} parts · Upfront, written quotes**

## Why drivers${city} choose ${dealer}

- **Factory-trained experts** — our technicians complete continuous ${Brand} training and recertify every year on the latest powertrains, electronics, and safety systems.
- **Genuine ${Brand} parts only** — we never substitute aftermarket components on critical systems. Every part installed is OEM-spec or better.
- **Upfront, written quotes** — you approve every line item before we touch a tool. No surprise add-ons, ever.
- **Digital inspection** — you get photos and a plain-English breakdown of what we found, sent to your phone.
- **Loaner vehicles** — overnight and multi-day jobs come with a complimentary loaner so your week doesn't grind to a halt.
- **Lifetime workmanship warranty** — every ${svc} we perform is backed by our manufacturer-aligned workmanship guarantee.

## How our ${svc} process works

1. **Schedule online or by phone.** Most appointments are available within 48 hours${cityOnly ? ` for ${cityOnly} drivers` : ""}, and our online scheduler shows real-time availability across our service bays.
2. **Quick check-in.** A service advisor pulls your vehicle history, scans for open recalls, and walks the vehicle with you so nothing is missed.
3. **Multi-point inspection.** Every visit includes a complimentary inspection: tires, brakes, fluids, suspension, lighting, battery, and safety systems.
4. **Diagnostic confirmation.** We confirm the root cause before quoting. No "shotgun" parts replacement, no upsells based on guesses.
5. **Detailed written quote.** We send you a quote with photos and short videos so you can see exactly what we see — and approve, defer, or decline each line item.
6. **Certified repair.** Work is completed by a ${Brand}-trained technician using genuine parts and torque-to-spec procedures from the factory service manual.
7. **Quality control hand-off.** A second technician verifies the work before your vehicle leaves the bay.
8. **Follow-up.** We check in a few days after your visit to make sure everything's running exactly as it should.

## What's included with every ${svc} visit

- Complimentary multi-point inspection with digital photo report
- Free recall scan against the latest ${Brand} bulletins
- Tire pressure adjustment to manufacturer spec
- Wash and vacuum (when weather allows)
- Direct line to the service advisor handling your vehicle

## Pricing you can actually see

We post our most common ${svc} prices${city} so you can plan ahead. Here's roughly what to expect — your final quote will match exactly what's needed for your specific vehicle and trim:

| Service tier               | Typical turnaround | Includes                                |
| -------------------------- | ------------------ | --------------------------------------- |
| Standard ${svc}            | Same day           | OEM parts, inspection, road test        |
| Comprehensive ${svc}       | 1 business day     | Standard + supporting components        |
| Major / warranty work      | 1–3 business days  | Comprehensive + loaner vehicle included |

If you have an extended warranty or service contract, our team handles the claim paperwork on your behalf — you don't need to be on the phone.

## What real customers say

> "Best ${svc} experience I've ever had${city}. Honest, fast, and the price matched the quote down to the penny."
> — Verified customer review

> "I'd been quoted twice as much down the road. ${dealer} explained the problem, showed me the worn part, and had me back on the road by the afternoon."
> — Verified customer review

> "First time I've trusted a dealership service department. They sent photos, told me what could wait, and didn't push anything I didn't need."
> — Verified customer review

## Coverage and service area

${dealer} serves drivers across${city ? ` ${cityOnly} and` : ""} the surrounding region. If you're commuting in for ${svc}, we offer early-bird drop-off, late pickup, and a shuttle inside a ${cityOnly ? `short radius of ${cityOnly}` : "reasonable radius"}. Just ask at booking.

## Certifications & trust

- Manufacturer-certified ${Brand} service center
- ASE-certified technicians on staff
- BBB-accredited business
- Factory diagnostic equipment and OEM software access
- Continuous training program — minimum 40 hours per technician per year

## What to bring to your appointment

- Vehicle registration (or VIN)
- Any prior service records, if you have them handy
- Notes on the symptoms or noises you've noticed — even small details help us reproduce the issue faster

Don't have records? No problem — we'll pull your vehicle's full service history directly from the ${Brand} network.

## Frequently asked questions

**How long does ${svc} take?**
Most ${svc} visits are completed the same day. Complex jobs get a complimentary loaner so your schedule isn't disrupted.

**Is ${svc} covered by my warranty?**
We honor all in-warranty work and submit claims on your behalf. If you're inside your factory or certified pre-owned coverage window, you typically owe nothing.

**Do I need an appointment?**
We strongly recommend it — same-week slots fill quickly${city ? ` in the ${cityOnly} area` : ""}. Walk-ins are welcome but may need to leave the vehicle.

**Can I wait while ${svc} is performed?**
Yes. Our customer lounge has fast Wi-Fi, complimentary espresso, charging stations, and a quiet workspace if you'd like to keep working.

**Do you service vehicles I didn't buy from ${dealer}?**
Absolutely. We service ${Brand} vehicles regardless of where they were purchased — original ${Brand} factory-trained service is the same no matter the original dealer.

**What if I just need a second opinion?**
We're happy to provide one. We'll inspect, share our findings, and you can decide whether to have us complete the work or take the quote elsewhere.

**Are loaners free?**
Loaners are complimentary on overnight and multi-day work, subject to availability. Ask your service advisor at booking and we'll reserve one.

**Do you offer pickup and delivery?**
For qualifying ${svc} appointments${city ? ` in the ${cityOnly} area` : ""}, yes. We'll pick up your vehicle, service it, and return it the same day.

## Related services

Looking for something else? We also handle [routine maintenance](/service), [tires and alignment](/service), [collision and bodywork](/service), [recall completion](/service), and [pre-owned vehicle inspections](/service). Browse [our current inventory](/inventory) or apply for [financing](/finance) while you're here.

## Schedule ${Service} today${city}

Don't put off ${svc} — small issues get expensive when they're left to grow. ${dealer} makes it simple: pick a time, drop your keys, and get back on the road with confidence.

[**Book your ${svc} appointment online**](/service) — it takes under a minute, and our team will confirm by text within a few hours. Prefer to talk to a human? Call us during business hours and a service advisor will walk you through it.

_${dealer} · Factory-certified ${Brand} service · Honest answers, every time._
`;

  return {
    title,
    slug: slugify(title),
    metaTitle: clamp(`${Service}${city} | ${dealer}`, 60),
    metaDescription: clamp(
      `${Service}${city} at ${dealer}. Factory-certified ${Brand} technicians, genuine parts, transparent quotes, same-week appointments.`,
      160,
    ),
    excerpt: clamp(
      `${Service}${city} — manufacturer-certified work, written quotes, same-week appointments, and a multi-point inspection on every visit.`,
      220,
    ),
    keywords: keywordList(ctx),
    bodyMarkdown: body,
  };
}

function gbpHashtags(ctx: Ctx): string[] {
  const out: string[] = [];
  const push = (s?: string | null) => {
    if (!s) return;
    const clean = s.replace(/[^A-Za-z0-9]/g, "");
    if (clean && !out.includes(clean)) out.push(clean);
  };
  push(ctx.brand);
  push(ctx.city);
  if (ctx.service) push(titleCase(ctx.service).replace(/\s+/g, ""));
  if (ctx.dealerName) push(ctx.dealerName.replace(/\s+/g, ""));
  push("CertifiedService");
  push("DriveLocal");
  return out.slice(0, 4);
}

function gbpJson(ctx: Ctx) {
  const topic = ctx.topic || "this week's featured offer";
  const Topic = titleCase(topic);
  const cta = ctx.cta || "Schedule today";
  const dealer = ctx.dealerName;
  const city = ctx.city ? ` in ${ctx.city}` : "";
  const postType = (ctx.postType ?? "update").toLowerCase();
  const hashtags = gbpHashtags(ctx);
  const ht = hashtags.length ? hashtags.map((h) => `#${h}`).join(" ") : "";

  const make = (title: string, body: string) => ({
    title: clamp(title, 70),
    bodyMarkdown: clamp(body.trim() + (ht ? `\n\n${ht}` : ""), 1500),
    hashtags,
  });

  if (postType === "offer") {
    const offerName = ctx.offerName || Topic;
    const dates =
      ctx.offerStart && ctx.offerEnd ? `Valid ${ctx.offerStart} – ${ctx.offerEnd}.` :
      ctx.offerEnd                    ? `Ends ${ctx.offerEnd}.` : "Limited time.";
    const code = ctx.offerCode ? ` Mention code **${ctx.offerCode}** when you book.` : "";
    return {
      postType: "offer",
      variants: [
        make(`${offerName} at ${dealer}`,
          `**${offerName}** is here${city}. ${dates}${code}\n\nLock it in today — ${cta.toLowerCase()}. Walk-ins welcome, but appointments save you time.\n\n[Book online](/service) · [Call us](tel:+1)`),
        make(`Don't miss: ${offerName}`,
          `Quick heads-up${city} — ${offerName} is one of our best deals this season and slots are filling fast. ${dates}${code}\n\n${cta} → [Reserve your spot](/service).`),
        make(`Why ${dealer} for ${offerName}?`,
          `${offerName} is one thing. Doing it right is another. Our factory-trained team handles every step in-house with OEM parts and written quotes you approve before we start.\n\n${dates}${code}\n\n${cta} — [book online](/service) and we'll confirm by text.`),
      ],
    };
  }

  if (postType === "event") {
    const eventName = ctx.eventName || Topic;
    const when = ctx.eventDate ? ` · ${ctx.eventDate}` : "";
    const where = ctx.eventLocation ? ` · ${ctx.eventLocation}` : city ? ` ·${city}` : "";
    return {
      postType: "event",
      variants: [
        make(`${eventName}${when}`,
          `Join us for **${eventName}**${when}${where}.\n\nGreat people, great vehicles, and a chance to talk shop with our certified team. RSVPs are free and let us plan accordingly.\n\n[RSVP now](/events) — see you there!`),
        make(`You're invited: ${eventName}`,
          `${dealer} is hosting **${eventName}**${when}${where}. Refreshments, exclusive previews, and a few surprises we can't quite spoil here.\n\nSpace is limited — [secure your spot](/events) in under a minute.`),
        make(`What to expect at ${eventName}`,
          `Here's the short version: exclusive offers for attendees, hands-on demos, and time with the team behind the bays. **${eventName}**${when}${where}.\n\n[RSVP](/events) and we'll send a calendar invite + reminder.`),
      ],
    };
  }

  if (postType === "whatsnew") {
    return {
      postType: "whatsnew",
      variants: [
        make(`What's new at ${dealer}`,
          `Heads-up${city}: ${Topic} just landed at ${dealer}. Here's why it matters for the drivers we serve — faster service appointments, expanded loaner fleet, and a smoother experience start to finish.\n\nCome see for yourself — [book a visit](/service).`),
        make(`${Topic} → now live`,
          `Big update: **${Topic}** is officially live${city}. We've been preparing for months and it's now available to every customer who walks through our doors.\n\n${cta} → [learn more](/service).`),
        make(`A small thing that makes a big difference`,
          `Small change, real impact: ${Topic}. It might sound minor, but it's the kind of detail that adds up over years of ownership.\n\nStop in and we'll show you exactly what changed — [book a quick visit](/service).`),
      ],
    };
  }

  // Default "update"
  return {
    postType: "update",
    variants: [
      make(`${Topic} at ${dealer}`,
        `${Topic} at ${dealer}${city}. Our team is ready to help you with ${ctx.keyword || topic} — factory-certified, transparently priced, and built around your schedule.\n\n${cta} — call us or [book online](/service).`),
      make(`Quick update from ${dealer}`,
        `Just a quick note${city}: ${Topic} is one of the most requested things our customers ask about. Here's what you should know — written quotes, OEM parts, same-week appointments. No runaround, ever.\n\n[Schedule your visit](/service).`),
      make(`Behind the scenes: ${Topic}`,
        `A look behind the curtain: how ${dealer} approaches ${Topic}. We do it the way we'd want our own family's vehicles handled — careful, documented, and explained out loud.\n\n${cta} → [stop by](/service).`),
    ],
  };
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
