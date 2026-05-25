import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";

// JSON helpers (SQLite stores arrays/objects as encoded strings).
export function parseJson<T>(s: unknown, fallback: T): T {
  if (s == null) return fallback;
  if (typeof s !== "string") return s as T;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
export const stringifyJson = (v: unknown) => JSON.stringify(v ?? null);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSlug(input: string) {
  return slugify(input, { lower: true, strict: true, trim: true });
}

export function formatCurrency(n: number | string | null | undefined) {
  if (n === null || n === undefined) return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function relativeTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: Array<[number, string]> = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let value = seconds;
  let unit = "s";
  for (const [div, u] of intervals) {
    if (Math.abs(value) < div) {
      unit = u;
      break;
    }
    value = value / div;
    unit = u;
  }
  return `${Math.floor(value)}${unit} ago`;
}

export function readingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
