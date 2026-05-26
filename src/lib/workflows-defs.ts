// Pure data + helpers for the workflow engine.
// Kept out of server/workflows.ts because that file has "use server" — and
// Next.js requires *every* export in a server-actions module to be an async
// function. Sync helpers and const objects live here.

export type WorkflowTemplate =
  | "weekly_gbp"
  | "weekly_blog"
  | "monthly_city_pages"
  | "stale_audit"
  | "hourly_autopublish"
  | "fill_meta"
  | "archive_expired_offers"
  | "review_autoreply"
  | "review_autoescalate";

export const WORKFLOW_TEMPLATES: Record<WorkflowTemplate, {
  label: string;
  description: string;
  triggerKind: "schedule" | "event";
  eventType?: string;
  defaultConfig: any;
  defaultTrigger: any;
}> = {
  weekly_gbp: {
    label: "Weekly GBP post",
    description: "Auto-generate a Google Business Profile post on a weekly cadence.",
    triggerKind: "schedule",
    defaultTrigger: { cadence: "weekly", dayOfWeek: 1, hour: 9, minute: 0 },
    defaultConfig: {
      topicRotation: [
        "This week's featured service offer",
        "Why families choose us for trade-ins",
        "Behind the scenes in our service bay",
        "What's new in our showroom this week",
      ],
      tone: "friendly",
      cta: "Schedule today",
      autoPublish: false,
    },
  },
  monthly_city_pages: {
    label: "Monthly city-page batch",
    description: "Generate N city-targeted landing pages once per month.",
    triggerKind: "schedule",
    defaultTrigger: { cadence: "monthly", dayOfMonth: 1, hour: 6, minute: 0 },
    defaultConfig: {
      service: "Brake service",
      keyword: "brake service",
      cities: ["Atlanta", "Marietta", "Decatur"],
      state: "GA",
      publish: "draft" as "draft" | "live",
    },
  },
  weekly_blog: {
    label: "Weekly blog post",
    description: "Auto-generate a blog draft from a rotating topic list, on a weekly cadence.",
    triggerKind: "schedule",
    defaultTrigger: { cadence: "weekly", dayOfWeek: 3, hour: 9, minute: 0 },
    defaultConfig: {
      topicRotation: [
        "What to check before a long road trip",
        "How to choose the right tire for your model",
        "Decoding your dashboard warning lights",
        "When to lease vs. finance — a practical guide",
      ],
      keyword: "automotive service",
      tone: "professional",
      structure: "article",
      audience: "general",
      wordCount: 1000,
      autoPublish: false,
    },
  },
  stale_audit: {
    label: "Stale content audit",
    description: "Flag published content older than N days as NEEDS_REVISION so the team can refresh it.",
    triggerKind: "schedule",
    defaultTrigger: { cadence: "weekly", dayOfWeek: 1, hour: 7, minute: 0 },
    defaultConfig: { ageDays: 180, max: 20 },
  },
  fill_meta: {
    label: "Auto-fill missing meta tags",
    description: "Scan content with empty meta title/description and generate them via AI.",
    triggerKind: "schedule",
    defaultTrigger: { cadence: "daily", hour: 4, minute: 0 },
    defaultConfig: { max: 25 },
  },
  archive_expired_offers: {
    label: "Auto-archive expired offers",
    description: "Flip lease/finance offers to ARCHIVED status once their expiresAt date passes.",
    triggerKind: "schedule",
    defaultTrigger: { cadence: "daily", hour: 2, minute: 0 },
    defaultConfig: {},
  },
  hourly_autopublish: {
    label: "Hourly auto-publish",
    description: "Push any SCHEDULED or APPROVED content past its scheduled time into PUBLISHED.",
    triggerKind: "schedule",
    defaultTrigger: { cadence: "hourly", minute: 0 },
    defaultConfig: {},
  },
  review_autoreply: {
    label: "Auto-reply to 4–5★ reviews",
    description: "When a positive review is synced, draft a friendly reply and auto-post it.",
    triggerKind: "event",
    eventType: "review.synced",
    defaultTrigger: { eventType: "review.synced", filter: { minRating: 4 } },
    defaultConfig: { tone: "friendly", autoPost: true },
  },
  review_autoescalate: {
    label: "Auto-escalate 1–2★ reviews",
    description: "When a low-star review is synced, draft a professional reply and flag for the GM (no auto-post).",
    triggerKind: "event",
    eventType: "review.synced",
    defaultTrigger: { eventType: "review.synced", filter: { maxRating: 2 } },
    defaultConfig: { tone: "professional", autoPost: false, escalate: true },
  },
};

/**
 * Compute the next time a schedule-triggered workflow should run.
 * Pure function — testable in isolation.
 */
export function computeNextRunAt(trigger: any, after: Date = new Date()): Date | null {
  const cadence: string = trigger?.cadence;
  if (!cadence) return null;
  const next = new Date(after);
  // Snap to the start of the next minute to avoid double-fires.
  next.setSeconds(0, 0);

  if (cadence === "hourly") {
    const minute = clamp(Number(trigger.minute ?? 0), 0, 59);
    next.setMinutes(minute);
    if (next <= after) next.setHours(next.getHours() + 1);
    return next;
  }
  if (cadence === "daily") {
    const hour = clamp(Number(trigger.hour ?? 9), 0, 23);
    const minute = clamp(Number(trigger.minute ?? 0), 0, 59);
    next.setHours(hour, minute, 0, 0);
    if (next <= after) next.setDate(next.getDate() + 1);
    return next;
  }
  if (cadence === "weekly") {
    const dow = clamp(Number(trigger.dayOfWeek ?? 1), 0, 6);
    const hour = clamp(Number(trigger.hour ?? 9), 0, 23);
    const minute = clamp(Number(trigger.minute ?? 0), 0, 59);
    next.setHours(hour, minute, 0, 0);
    const diff = (dow - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + diff);
    if (next <= after) next.setDate(next.getDate() + 7);
    return next;
  }
  if (cadence === "monthly") {
    const dom = clamp(Number(trigger.dayOfMonth ?? 1), 1, 28);
    const hour = clamp(Number(trigger.hour ?? 9), 0, 23);
    const minute = clamp(Number(trigger.minute ?? 0), 0, 59);
    next.setDate(dom);
    next.setHours(hour, minute, 0, 0);
    if (next <= after) next.setMonth(next.getMonth() + 1);
    return next;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

/**
 * Idempotency key per template — workflows whose key matches the previous
 * run's key are skipped (e.g. a weekly workflow shouldn't run twice in the
 * same ISO week even if cron fires it twice). Returning null means the
 * template is cheap/idempotent on its own and dedupe isn't needed.
 */
export function computeIdempotencyKey(template: WorkflowTemplate, when: Date = new Date()): string | null {
  switch (template) {
    case "weekly_gbp":
    case "weekly_blog":
    case "stale_audit":
      return `week-${isoWeek(when)}`;
    case "monthly_city_pages":
      return `month-${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}`;
    // Cheap idempotent ones: re-running is a no-op, dedupe by day only so
    // the cron doesn't repeat the same activity log entries every 15 min.
    case "fill_meta":
    case "archive_expired_offers":
      return `day-${when.toISOString().slice(0, 10)}`;
    case "hourly_autopublish":
      return `hour-${when.toISOString().slice(0, 13)}`;
    default:
      return null;
  }
}

/**
 * ISO 8601 week number — needed so weekly idempotency keys line up with
 * how dealerships think about "this week" rather than calendar buckets.
 */
function isoWeek(d: Date): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
