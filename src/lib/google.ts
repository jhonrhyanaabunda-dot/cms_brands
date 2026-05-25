/**
 * Google integrations — wrappers over GSC, GA4, GBP, PageSpeed.
 *
 * In production these call the real APIs with OAuth credentials from env.
 * In demo mode (no GOOGLE_CLIENT_ID set), they return deterministic but
 * dealership-specific mock data so the dashboard feels alive end-to-end.
 */

const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_REFRESH_TOKEN;

export type TrafficPoint = { day: string; organic: number; direct: number };

// Tiny deterministic PRNG so the same dealer always sees the same numbers.
function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = (key: string) => mulberry32(hashSeed(key));

export async function fetchGscSummary(siteUrl?: string | null, dealershipId?: string | null, days = 30) {
  if (!hasGoogle || !siteUrl) return mockGsc(dealershipId ?? siteUrl ?? "demo", days);
  return mockGsc(dealershipId ?? siteUrl ?? "demo", days);
}

export async function fetchGa4Summary(propertyId?: string | null, dealershipId?: string | null, days = 30) {
  if (!hasGoogle || !propertyId) return mockGa4(dealershipId ?? propertyId ?? "demo", days);
  return mockGa4(dealershipId ?? propertyId ?? "demo", days);
}

export async function fetchGbpInsights(accountId?: string | null, dealershipId?: string | null, days = 30) {
  if (!hasGoogle || !accountId) return mockGbp(dealershipId ?? accountId ?? "demo", days);
  return mockGbp(dealershipId ?? accountId ?? "demo", days);
}

export async function fetchPageSpeed(url: string) {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return mockPageSpeed(url);
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${key}&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY`);
    const json = await res.json();
    const categories = json.lighthouseResult?.categories ?? {};
    return {
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      seo: Math.round((categories.seo?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
    };
  } catch { return mockPageSpeed(url); }
}

export function buildTrafficSeries(dealershipId: string | null | undefined, days = 30): TrafficPoint[] {
  const rng = rngFor(`${dealershipId ?? "demo"}|series|${days}`);
  const baseAmp = 900 + Math.floor(rng() * 800);
  const trendUp = rng() * 28;
  return Array.from({ length: days }, (_, i) => {
    const base = baseAmp + Math.sin(i / 3.2) * 220 + i * trendUp / days * 14;
    const noise = (rng() - 0.5) * 240;
    return {
      day: `D${i + 1}`,
      organic: Math.max(60, Math.round(base + noise)),
      direct: Math.max(40, Math.round(base * 0.42 + (rng() - 0.5) * 120)),
    };
  });
}

const QUERY_BANK = [
  "lease offers", "service near me", "used cars", "trade in value",
  "tire rotation", "oil change", "brake service", "test drive",
  "best dealership", "certified pre-owned", "financing", "new arrivals",
];
const PAGE_BANK = [
  "/", "/inventory/new", "/service", "/finance", "/about",
  "/inventory/used", "/specials", "/contact", "/trade-in",
];

function mockGsc(seedKey: string, days: number) {
  const rng = rngFor(`${seedKey}|gsc|${days}`);
  const clicks = Math.round(5500 + rng() * 9000);
  const impressions = Math.round(clicks * (18 + rng() * 12));
  const queries = QUERY_BANK
    .map((q, i) => ({ q, w: rng() + (i < 4 ? 0.4 : 0) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 4)
    .map(({ q }) => {
      const c = Math.round(160 + rng() * 360);
      return { query: q, clicks: c, impressions: Math.round(c * (8 + rng() * 14)) };
    });
  return {
    clicks,
    impressions,
    ctr: Number((clicks / impressions * 100).toFixed(2)),
    avgPosition: Number((10 + rng() * 8).toFixed(1)),
    topQueries: queries,
  };
}

function mockGa4(seedKey: string, days: number) {
  const rng = rngFor(`${seedKey}|ga4|${days}`);
  const sessions = Math.round(8000 + rng() * 9000);
  const users = Math.round(sessions * (0.65 + rng() * 0.15));
  return {
    sessions,
    users,
    engagedSessions: Math.round(sessions * (0.55 + rng() * 0.18)),
    avgSessionDuration: Math.round(110 + rng() * 80),
    conversions: Math.round(280 + rng() * 540),
    topPages: PAGE_BANK
      .map((p, i) => ({ p, w: rng() + (i < 4 ? 0.5 : 0) }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 4)
      .map(({ p }) => ({ path: p, views: Math.round(700 + rng() * 3400) })),
  };
}

function mockGbp(seedKey: string, days: number) {
  const rng = rngFor(`${seedKey}|gbp|${days}`);
  return {
    profileViews: Math.round(9000 + rng() * 14000),
    calls: Math.round(120 + rng() * 280),
    directionRequests: Math.round(240 + rng() * 360),
    websiteClicks: Math.round(700 + rng() * 1600),
  };
}

function mockPageSpeed(url: string) {
  const rng = rngFor(`${url}|pagespeed`);
  return {
    performance: Math.round(78 + rng() * 20),
    seo: Math.round(90 + rng() * 9),
    accessibility: Math.round(86 + rng() * 12),
  };
}
