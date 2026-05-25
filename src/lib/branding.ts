// Derive a stable accent color per dealership. Falls back to the seeded
// primaryColor, otherwise picks a recognizable brand color so each tenant
// looks distinct in the dashboard chrome without needing a re-seed.

const BRAND_COLORS: Record<string, string> = {
  BMW: "#1c69d4",
  MERCEDES_BENZ: "#00adef",
  SUBARU: "#003da5",
  NISSAN: "#c3002f",
  FORD: "#003478",
  LINCOLN: "#324158",
  TOYOTA: "#eb0a1e",
  HONDA: "#cc0000",
  OTHER: "#1DB954",
};

// Treat the legacy seeded navy as "not customized" so we still pick a brand color.
const DEFAULT_SEEDED = "#1d3187";

export function tenantAccent(input: { brand?: string | null; primaryColor?: string | null }): string {
  const p = (input.primaryColor || "").toLowerCase();
  if (p && p !== DEFAULT_SEEDED) return input.primaryColor as string;
  const b = (input.brand || "").toUpperCase();
  return BRAND_COLORS[b] || BRAND_COLORS.OTHER;
}

// Convert a hex like #1c69d4 to a hsla() ring-friendly shadow.
export function softShadow(hex: string, alpha = 0.3) {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if (!m) return "rgba(0,0,0,0.2)";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
