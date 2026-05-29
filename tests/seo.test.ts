import { describe, it, expect } from "vitest";
import { scoreSeo } from "@/lib/seo";

describe("scoreSeo", () => {
  it("returns a 0–100 score and a grade", () => {
    const r = scoreSeo({ title: "x" });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(r.grade);
  });

  it("scores a fully-polished page highly", () => {
    const body = `## Section\n\n${"word ".repeat(700)}\n\nSee our [service page](/service) for more.\n\n## More\n\nWord.`;
    const r = scoreSeo({
      title: "How to choose the right tire for your SUV — a 2026 guide",
      metaTitle: "How to choose the right tire for your SUV — 2026",
      metaDescription: "A practical 800-word guide to choosing tires for your SUV in 2026 — covers tread, pressure, season, and budget.",
      slug: "how-to-choose-suv-tires",
      keywords: ["suv tires", "winter tires", "tire pressure"],
      bodyMarkdown: body,
      heroImageUrl: "/hero.svg",
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(["A", "B"]).toContain(r.grade);
  });

  it("fails empty inputs gracefully (no crash, low score)", () => {
    const r = scoreSeo({ title: "" });
    expect(r.score).toBeLessThan(60);
    expect(r.grade).toBe("F");
  });

  it("flags missing primary keyword in title", () => {
    const r = scoreSeo({
      title: "Generic title",
      keywords: ["specific keyword phrase"],
      bodyMarkdown: "body",
    });
    const check = r.checks.find((c) => c.id === "primary-kw-title");
    expect(check?.ok).toBe(false);
  });

  it("recognizes the primary keyword when present in title", () => {
    const r = scoreSeo({
      title: "All About BMW Brakes",
      keywords: ["bmw brakes"],
      bodyMarkdown: "BMW brakes are great.",
    });
    const check = r.checks.find((c) => c.id === "primary-kw-title");
    expect(check?.ok).toBe(true);
  });
});
