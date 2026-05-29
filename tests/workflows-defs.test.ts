import { describe, it, expect } from "vitest";
import {
  WORKFLOW_TEMPLATES,
  computeNextRunAt,
  computeIdempotencyKey,
} from "@/lib/workflows-defs";

describe("WORKFLOW_TEMPLATES", () => {
  it("declares 9 templates", () => {
    expect(Object.keys(WORKFLOW_TEMPLATES)).toHaveLength(9);
  });
  it("classifies each template as schedule or event", () => {
    for (const t of Object.values(WORKFLOW_TEMPLATES)) {
      expect(["schedule", "event"]).toContain(t.triggerKind);
    }
  });
});

describe("computeNextRunAt", () => {
  it("returns null when no cadence is given", () => {
    expect(computeNextRunAt({})).toBeNull();
    expect(computeNextRunAt(null as any)).toBeNull();
  });

  it("hourly fires at the configured minute of the next hour", () => {
    const after = new Date("2026-01-15T10:32:00.000Z");
    const next = computeNextRunAt({ cadence: "hourly", minute: 0 }, after);
    expect(next?.getUTCHours()).toBe(11);
    expect(next?.getUTCMinutes()).toBe(0);
  });

  it("daily skips today when the time has already passed", () => {
    const after = new Date("2026-01-15T15:00:00.000Z");
    const next = computeNextRunAt({ cadence: "daily", hour: 9, minute: 0 }, after);
    // Should be the next day at 9:00 local time. We assert in local (because
    // computeNextRunAt uses local setHours), not UTC.
    expect(next).toBeTruthy();
    expect(next!.getTime()).toBeGreaterThan(after.getTime());
  });

  it("weekly lands on the configured day-of-week", () => {
    const after = new Date("2026-01-15T15:00:00.000Z"); // Thursday
    const next = computeNextRunAt({ cadence: "weekly", dayOfWeek: 1, hour: 9, minute: 0 }, after);
    expect(next?.getDay()).toBe(1); // Monday
    expect(next!.getTime()).toBeGreaterThan(after.getTime());
  });

  it("monthly lands on the configured day-of-month", () => {
    const after = new Date("2026-01-15T15:00:00.000Z");
    const next = computeNextRunAt({ cadence: "monthly", dayOfMonth: 1, hour: 6, minute: 0 }, after);
    expect(next?.getDate()).toBe(1);
    expect(next!.getTime()).toBeGreaterThan(after.getTime());
  });

  it("clamps out-of-range values rather than crashing", () => {
    expect(() => computeNextRunAt({ cadence: "hourly", minute: 99 })).not.toThrow();
    expect(() => computeNextRunAt({ cadence: "weekly", dayOfWeek: 8 })).not.toThrow();
    expect(() => computeNextRunAt({ cadence: "monthly", dayOfMonth: 99 })).not.toThrow();
  });
});

describe("computeIdempotencyKey", () => {
  it("returns ISO-week key for weekly templates", () => {
    const k1 = computeIdempotencyKey("weekly_gbp", new Date("2026-01-15T15:00:00.000Z"));
    const k2 = computeIdempotencyKey("weekly_gbp", new Date("2026-01-16T15:00:00.000Z"));
    // Same ISO week → same key (defends against double-run on cron retry).
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^week-\d{4}-W\d{2}$/);
  });

  it("returns different keys across weeks", () => {
    const k1 = computeIdempotencyKey("weekly_blog", new Date("2026-01-15T15:00:00.000Z"));
    const k2 = computeIdempotencyKey("weekly_blog", new Date("2026-01-22T15:00:00.000Z"));
    expect(k1).not.toBe(k2);
  });

  it("returns year-month key for monthly templates", () => {
    const k = computeIdempotencyKey("monthly_city_pages", new Date("2026-01-15T15:00:00.000Z"));
    expect(k).toBe("month-2026-01");
  });

  it("returns null for event-triggered templates", () => {
    expect(computeIdempotencyKey("review_autoreply")).toBeNull();
    expect(computeIdempotencyKey("review_autoescalate")).toBeNull();
  });

  it("returns hour-precision key for hourly auto-publish", () => {
    const k = computeIdempotencyKey("hourly_autopublish", new Date("2026-01-15T15:00:00.000Z"));
    expect(k).toMatch(/^hour-2026-01-15T15$/);
  });
});
