"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { parseJson, stringifyJson } from "@/lib/utils";
import {
  WORKFLOW_TEMPLATES, computeNextRunAt, computeIdempotencyKey,
  type WorkflowTemplate,
} from "@/lib/workflows-defs";

// Stale-lock grace: if a workflow has been "running" for longer than this,
// treat the previous run as crashed and let the next attempt reclaim the lock.
const LOCK_GRACE_MS = 10 * 60_000;

// Rough cost-estimate proxy. The mock generators don't return token counts,
// so we estimate tokensUsed ≈ ceil(chars / 4) from the produced content.
// When a real OpenAI key is configured the engine will already see actual
// token counts from chat() — we'd swap this for those values then.
function approxTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────

export async function listWorkflows() {
  const tenant = await requireTenant();
  const items = await prisma.workflow.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
  });
  return items.map((w) => ({
    ...w,
    trigger: parseJson<any>(w.trigger, {}),
    config: parseJson<any>(w.config, {}),
  }));
}

export async function createWorkflow(input: {
  template: WorkflowTemplate;
  name?: string;
  trigger?: any;
  config?: any;
  enabled?: boolean;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  const tpl = WORKFLOW_TEMPLATES[input.template];
  if (!tpl) throw new Error("UNKNOWN_TEMPLATE");

  const trigger = { ...tpl.defaultTrigger, ...(input.trigger ?? {}) };
  const config = { ...tpl.defaultConfig, ...(input.config ?? {}) };
  const nextRunAt = tpl.triggerKind === "schedule" ? computeNextRunAt(trigger) : null;

  const wf = await prisma.workflow.create({
    data: {
      dealershipId: tenant.dealershipId,
      name: input.name ?? tpl.label,
      template: input.template,
      triggerKind: tpl.triggerKind,
      trigger: stringifyJson(trigger),
      config: stringifyJson(config),
      enabled: input.enabled ?? true,
      nextRunAt,
      createdById: tenant.userId,
    },
  });
  await logActivity(tenant.dealershipId, tenant.userId, `Created workflow: ${wf.name}`, wf.id);
  revalidatePath("/dashboard/workflows");
  return wf;
}

export async function updateWorkflow(id: string, patch: {
  name?: string;
  trigger?: any;
  config?: any;
  enabled?: boolean;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  const existing = await prisma.workflow.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!existing) throw new Error("NOT_FOUND");

  const data: any = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.enabled !== undefined) data.enabled = patch.enabled;
  if (patch.trigger !== undefined) {
    data.trigger = stringifyJson(patch.trigger);
    if (existing.triggerKind === "schedule") {
      data.nextRunAt = computeNextRunAt(patch.trigger);
    }
  }
  if (patch.config !== undefined) data.config = stringifyJson(patch.config);

  const wf = await prisma.workflow.update({ where: { id }, data });
  revalidatePath("/dashboard/workflows");
  return wf;
}

export async function toggleWorkflow(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  const existing = await prisma.workflow.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!existing) throw new Error("NOT_FOUND");
  const enabled = !existing.enabled;
  const data: any = { enabled };
  if (enabled && existing.triggerKind === "schedule") {
    data.nextRunAt = computeNextRunAt(parseJson<any>(existing.trigger, {}));
  }
  await prisma.workflow.update({ where: { id }, data });
  revalidatePath("/dashboard/workflows");
}

export async function deleteWorkflow(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.delete")) throw new Error("FORBIDDEN");
  await prisma.workflow.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  revalidatePath("/dashboard/workflows");
}

export async function listWorkflowRuns(workflowId: string, take = 30) {
  const tenant = await requireTenant();
  const wf = await prisma.workflow.findFirst({ where: { id: workflowId, dealershipId: tenant.dealershipId } });
  if (!wf) throw new Error("NOT_FOUND");
  return prisma.workflowRun.findMany({
    where: { workflowId },
    orderBy: { startedAt: "desc" },
    take,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Execution
// ─────────────────────────────────────────────────────────────────────────

export async function runWorkflow(
  id: string,
  triggeredBy: "manual" | "cron" | "event" | "dryrun" = "manual",
  options: { dryRun?: boolean } = {},
): Promise<{ runId: string | null; status: string; summary?: string; error?: string; output?: any; tokensUsed?: number }> {
  // For manual runs from the UI we want a tenant guard; cron/event/dryrun paths
  // pass through with no tenant check because they handle authorization upstream
  // (cron via CRON_SECRET, event via the originating server action).
  if (triggeredBy === "manual" || triggeredBy === "dryrun") {
    const tenant = await requireTenant();
    const wf = await prisma.workflow.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
    if (!wf) throw new Error("NOT_FOUND");
    if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  }
  return executeWorkflow(id, triggeredBy, { dryRun: !!options.dryRun });
}

async function executeWorkflow(
  id: string,
  triggeredBy: "manual" | "cron" | "event" | "dryrun",
  options: { dryRun?: boolean },
): Promise<{ runId: string | null; status: string; summary?: string; error?: string; output?: any; tokensUsed?: number }> {
  const dryRun = !!options.dryRun;
  const wf = await prisma.workflow.findUnique({ where: { id } });
  if (!wf) throw new Error("NOT_FOUND");

  const trigger = parseJson<any>(wf.trigger, {});
  const config = parseJson<any>(wf.config, {});

  // ─── Dry-run shortcut: don't claim the lock, don't write a WorkflowRun
  // until the end, don't mutate any real data. Templates honor `dryRun`.
  if (dryRun) {
    const t0 = Date.now();
    try {
      const result = await executeTemplate(wf.template as WorkflowTemplate, {
        dealershipId: wf.dealershipId, trigger, config, dryRun: true,
      });
      const status = result.errors?.length ? "partial" : "success";
      // Record a dry-run entry in history so users can review what would happen.
      const run = await prisma.workflowRun.create({
        data: {
          workflowId: id,
          status,
          triggeredBy: "dryrun",
          dryRun: true,
          startedAt: new Date(t0),
          finishedAt: new Date(),
          summary: `(dry) ${result.summary ?? "—"}`,
          output: result.output ? stringifyJson(result.output) : null,
          tokensUsed: result.tokensUsed ?? 0,
        },
      });
      safeRevalidate("/dashboard/workflows");
      return { runId: run.id, status, summary: result.summary, output: result.output, tokensUsed: result.tokensUsed };
    } catch (e: any) {
      return { runId: null, status: "error", error: e?.message ?? "Dry-run failed" };
    }
  }

  // ─── Idempotency: skip if the previous run already covered this period.
  const now = new Date();
  const idemKey = computeIdempotencyKey(wf.template as WorkflowTemplate, now);
  if (idemKey && wf.lastRanKey === idemKey && triggeredBy === "cron") {
    return { runId: null, status: "skipped", summary: `Already ran for ${idemKey}` };
  }

  // ─── Concurrency lock: atomic claim. Refuses to start if the workflow is
  // already running (within grace). Stale locks > 10 min are reclaimed.
  const staleCutoff = new Date(Date.now() - LOCK_GRACE_MS);
  const claim = await prisma.workflow.updateMany({
    where: {
      id,
      OR: [{ runningSince: null }, { runningSince: { lt: staleCutoff } }],
    },
    data: { runningSince: new Date() },
  });
  if (claim.count === 0) {
    return { runId: null, status: "skipped", summary: "Already running" };
  }

  const run = await prisma.workflowRun.create({
    data: { workflowId: id, status: "running", triggeredBy },
  });

  try {
    const result = await executeTemplate(wf.template as WorkflowTemplate, {
      dealershipId: wf.dealershipId, trigger, config, dryRun: false,
    });

    const status = result.errors?.length ? "partial" : "success";
    const finishedAt = new Date();
    const nextRunAt = wf.triggerKind === "schedule"
      ? computeNextRunAt(trigger, finishedAt)
      : wf.nextRunAt;
    const tokensUsed = result.tokensUsed ?? 0;

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status, finishedAt,
        summary: result.summary ?? null,
        output: result.output ? stringifyJson(result.output) : null,
        tokensUsed,
      },
    });
    await prisma.workflow.update({
      where: { id },
      data: {
        lastRunAt: finishedAt, lastStatus: status, nextRunAt,
        runningSince: null,
        lastRanKey: idemKey ?? wf.lastRanKey,
        totalRuns: { increment: 1 },
        totalTokens: { increment: tokensUsed },
      },
    });
    await logActivity(wf.dealershipId, wf.createdById, `Workflow ran: ${wf.name} — ${result.summary ?? "ok"}`, wf.id);
    safeRevalidate("/dashboard/workflows");
    return { runId: run.id, status, summary: result.summary, output: result.output, tokensUsed };
  } catch (e: any) {
    const errMsg = e?.message ?? "Unknown error";
    const finishedAt = new Date();
    const nextRunAt = wf.triggerKind === "schedule"
      ? computeNextRunAt(trigger, finishedAt)
      : wf.nextRunAt;
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "error", finishedAt, error: errMsg },
    });
    await prisma.workflow.update({
      where: { id },
      data: {
        lastRunAt: finishedAt, lastStatus: "error", nextRunAt,
        runningSince: null,
        totalRuns: { increment: 1 },
      },
    });
    safeRevalidate("/dashboard/workflows");
    return { runId: run.id, status: "error", error: errMsg };
  }
}

/**
 * Iterate every schedule-triggered, enabled workflow that's due. Used by
 * the /api/cron/workflows endpoint (Vercel cron) and the "Run due now"
 * button on the Workflows page.
 */
export async function runDueWorkflows(): Promise<{ ran: number; results: Array<{ id: string; name: string; status: string; summary?: string; error?: string }> }> {
  const now = new Date();
  const due = await prisma.workflow.findMany({
    where: {
      triggerKind: "schedule",
      enabled: true,
      OR: [
        { nextRunAt: { lte: now } },
        { nextRunAt: null },
      ],
    },
    take: 50,
  });

  const results: Array<{ id: string; name: string; status: string; summary?: string; error?: string }> = [];
  for (const wf of due) {
    const r = await executeWorkflow(wf.id, "cron", { dryRun: false });
    results.push({ id: wf.id, name: wf.name, status: r.status, summary: r.summary, error: r.error });
  }
  return { ran: results.length, results };
}

/**
 * Fire an event into the workflow system. Called from inside other server
 * actions when something interesting happens (e.g. a review is synced).
 *
 * Note: must be called from a context where dealershipId is known —
 * usually right inside another server action that has already authenticated.
 */
export async function fireWorkflowEvent(input: {
  dealershipId: string;
  eventType: string;
  payload: any;
}): Promise<{ matched: number }> {
  const workflows = await prisma.workflow.findMany({
    where: {
      dealershipId: input.dealershipId,
      triggerKind: "event",
      enabled: true,
    },
  });
  let matched = 0;
  for (const wf of workflows) {
    const trigger = parseJson<any>(wf.trigger, {});
    if (trigger?.eventType !== input.eventType) continue;
    if (!eventMatchesFilter(trigger?.filter, input.payload)) continue;
    matched++;
    // Pass the payload into config so the template can use it.
    const config = parseJson<any>(wf.config, {});
    await prisma.workflow.update({
      where: { id: wf.id },
      data: { config: stringifyJson({ ...config, _event: input.payload }) },
    });
    await executeWorkflow(wf.id, "event", { dryRun: false });
    // Restore config (drop the transient _event).
    await prisma.workflow.update({
      where: { id: wf.id },
      data: { config: stringifyJson(config) },
    });
  }
  return { matched };
}

function eventMatchesFilter(filter: any, payload: any): boolean {
  if (!filter) return true;
  if (filter.minRating != null && (payload.rating ?? 0) < filter.minRating) return false;
  if (filter.maxRating != null && (payload.rating ?? 0) > filter.maxRating) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// Template handlers
// ─────────────────────────────────────────────────────────────────────────

type TemplateCtx = { dealershipId: string; trigger: any; config: any; dryRun: boolean };
type TemplateResult = { summary: string; output?: any; errors?: string[]; tokensUsed?: number };

async function executeTemplate(template: WorkflowTemplate, ctx: TemplateCtx): Promise<TemplateResult> {
  switch (template) {
    case "weekly_gbp":             return runWeeklyGbp(ctx);
    case "weekly_blog":            return runWeeklyBlog(ctx);
    case "monthly_city_pages":     return runMonthlyCityPages(ctx);
    case "stale_audit":            return runStaleAudit(ctx);
    case "hourly_autopublish":     return runHourlyAutopublish(ctx);
    case "fill_meta":              return runFillMeta(ctx);
    case "archive_expired_offers": return runArchiveExpiredOffers(ctx);
    case "review_autoreply":       return runReviewAutoreply(ctx);
    case "review_autoescalate":    return runReviewAutoescalate(ctx);
    default: throw new Error(`Unknown workflow template: ${template}`);
  }
}

// Helpers shared by template handlers — these run *outside* a normal
// requireTenant() context (cron/event), so we go through prisma directly
// and pass dealershipId explicitly.

async function runWeeklyGbp(ctx: TemplateCtx): Promise<TemplateResult> {
  const rotation: string[] = Array.isArray(ctx.config.topicRotation) && ctx.config.topicRotation.length > 0
    ? ctx.config.topicRotation
    : ["This week's featured offer"];
  const week = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400_000));
  const topic = rotation[week % rotation.length];

  const { generateMockGbpPost } = await import("@/lib/openai-internal");
  const variants = await generateMockGbpPost({
    dealershipId: ctx.dealershipId,
    topic,
    tone: ctx.config.tone ?? "friendly",
    cta: ctx.config.cta ?? "Schedule today",
  });
  const chosen = variants[0];
  const tokensUsed = approxTokens(chosen.bodyMarkdown);

  if (ctx.dryRun) {
    return {
      summary: `Would draft "${chosen.title}" (${chosen.bodyMarkdown.length} chars)`,
      output: { topic, preview: chosen.bodyMarkdown.slice(0, 600), title: chosen.title },
      tokensUsed,
    };
  }

  const created = await prisma.content.create({
    data: {
      dealershipId: ctx.dealershipId,
      type: "GBP_POST",
      title: chosen.title,
      slug: await uniqueSlug(ctx.dealershipId, slugify(chosen.title)),
      bodyMarkdown: chosen.bodyMarkdown,
      aiGenerated: true,
      status: ctx.config.autoPublish ? "PUBLISHED" : "DRAFT",
      publishedAt: ctx.config.autoPublish ? new Date() : null,
    },
  });
  return {
    summary: `Drafted "${chosen.title}"${ctx.config.autoPublish ? " (published)" : ""}`,
    output: { contentId: created.id, topic },
    tokensUsed,
  };
}

async function runWeeklyBlog(ctx: TemplateCtx): Promise<TemplateResult> {
  const rotation: string[] = Array.isArray(ctx.config.topicRotation) && ctx.config.topicRotation.length > 0
    ? ctx.config.topicRotation
    : ["This week's automotive insights"];
  const week = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400_000));
  const topic = rotation[week % rotation.length];

  const { generateMockBlog } = await import("@/lib/openai-internal");
  const blog = await generateMockBlog({
    dealershipId: ctx.dealershipId,
    topic,
    keyword: ctx.config.keyword ?? topic,
    tone: ctx.config.tone ?? "professional",
    structure: ctx.config.structure ?? "article",
    audience: ctx.config.audience ?? "general",
    wordCount: ctx.config.wordCount ?? 1000,
  });
  const tokensUsed = approxTokens(blog.bodyMarkdown);

  if (ctx.dryRun) {
    return {
      summary: `Would draft "${blog.title}" (~${blog.bodyMarkdown.split(/\s+/).length} words)`,
      output: { topic, preview: blog.bodyMarkdown.slice(0, 800), title: blog.title, outline: blog.outline },
      tokensUsed,
    };
  }

  const slug = await uniqueSlug(ctx.dealershipId, blog.slug);
  const created = await prisma.content.create({
    data: {
      dealershipId: ctx.dealershipId,
      type: "BLOG",
      title: blog.title,
      slug,
      excerpt: blog.excerpt,
      bodyMarkdown: blog.bodyMarkdown,
      metaTitle: blog.metaTitle,
      metaDescription: blog.metaDescription,
      keywords: stringifyJson(blog.keywords ?? []),
      aiGenerated: true,
      status: ctx.config.autoPublish ? "PUBLISHED" : "DRAFT",
      publishedAt: ctx.config.autoPublish ? new Date() : null,
    },
  });
  return {
    summary: `Drafted blog: "${blog.title}"${ctx.config.autoPublish ? " (published)" : ""}`,
    output: { contentId: created.id, topic },
    tokensUsed,
  };
}

async function runMonthlyCityPages(ctx: TemplateCtx): Promise<TemplateResult> {
  const cities: string[] = Array.isArray(ctx.config.cities) ? ctx.config.cities.filter(Boolean) : [];
  if (!cities.length) return { summary: "No cities configured — skipped", errors: ["no cities"] };
  const { generateMockLandingPage } = await import("@/lib/openai-internal");
  const limited = cities.slice(0, 25);

  if (ctx.dryRun) {
    // Generate only the first to preview, count the rest.
    const sample = await generateMockLandingPage({
      dealershipId: ctx.dealershipId,
      service: ctx.config.service ?? "Service",
      city: limited[0],
      keyword: `${ctx.config.keyword ?? ctx.config.service ?? "service"} ${limited[0]}`,
    });
    return {
      summary: `Would generate ${limited.length} pages. First: "${sample.title}"`,
      output: {
        cityCount: limited.length, cities: limited,
        preview: sample.bodyMarkdown.slice(0, 600),
        title: sample.title,
      },
      tokensUsed: approxTokens(sample.bodyMarkdown) * limited.length,
    };
  }

  const created: string[] = [];
  const errors: string[] = [];
  let totalTokens = 0;

  for (const city of limited) {
    try {
      const gen = await generateMockLandingPage({
        dealershipId: ctx.dealershipId,
        service: ctx.config.service ?? "Service",
        city,
        keyword: `${ctx.config.keyword ?? ctx.config.service ?? "service"} ${city}`,
      });
      totalTokens += approxTokens(gen.bodyMarkdown);
      const slug = await uniqueSlug(ctx.dealershipId, gen.slug);
      const content = await prisma.content.create({
        data: {
          dealershipId: ctx.dealershipId,
          type: "CITY_PAGE",
          title: gen.title,
          slug,
          excerpt: gen.excerpt,
          bodyMarkdown: gen.bodyMarkdown,
          metaTitle: gen.metaTitle,
          metaDescription: gen.metaDescription,
          aiGenerated: true,
          targetCity: city,
          targetState: ctx.config.state,
          targetKeyword: `${ctx.config.keyword} ${city}`,
          status: ctx.config.publish === "live" ? "PUBLISHED" : "DRAFT",
          publishedAt: ctx.config.publish === "live" ? new Date() : null,
        },
      });
      created.push(content.id);
    } catch (e: any) {
      errors.push(`${city}: ${e?.message ?? "failed"}`);
    }
  }
  return {
    summary: `Generated ${created.length} city pages${errors.length ? ` (${errors.length} failed)` : ""}`,
    output: { createdIds: created, errored: errors },
    errors: errors.length ? errors : undefined,
    tokensUsed: totalTokens,
  };
}

async function runStaleAudit(ctx: TemplateCtx): Promise<TemplateResult> {
  const ageDays = Number(ctx.config.ageDays ?? 180);
  const max = Number(ctx.config.max ?? 20);
  const cutoff = new Date(Date.now() - ageDays * 86400_000);
  const stale = await prisma.content.findMany({
    where: {
      dealershipId: ctx.dealershipId,
      status: "PUBLISHED",
      updatedAt: { lt: cutoff },
    },
    orderBy: { updatedAt: "asc" },
    take: max,
    select: { id: true, title: true },
  });
  if (stale.length === 0) return { summary: "No stale content found" };
  if (ctx.dryRun) {
    return {
      summary: `Would flag ${stale.length} page${stale.length === 1 ? "" : "s"} older than ${ageDays}d`,
      output: { flagged: stale.map((s) => ({ id: s.id, title: s.title })) },
    };
  }
  await prisma.content.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: "NEEDS_REVISION" },
  });
  return {
    summary: `Flagged ${stale.length} pages older than ${ageDays}d as NEEDS_REVISION`,
    output: { flagged: stale.map((s) => s.id) },
  };
}

async function runHourlyAutopublish(ctx: TemplateCtx): Promise<TemplateResult> {
  const now = new Date();
  const due = await prisma.content.findMany({
    where: {
      dealershipId: ctx.dealershipId,
      scheduledAt: { lte: now, not: null },
      status: { in: ["SCHEDULED", "APPROVED"] },
    },
    select: { id: true, title: true },
  });
  if (due.length === 0) return { summary: "Nothing due" };
  if (ctx.dryRun) {
    return {
      summary: `Would publish ${due.length} item${due.length === 1 ? "" : "s"}`,
      output: { wouldPublish: due.map((d) => ({ id: d.id, title: d.title })) },
    };
  }
  await prisma.content.updateMany({
    where: { id: { in: due.map((d) => d.id) } },
    data: { status: "PUBLISHED", publishedAt: now },
  });
  return { summary: `Published ${due.length} due item${due.length === 1 ? "" : "s"}` };
}

async function runFillMeta(ctx: TemplateCtx): Promise<TemplateResult> {
  const max = Number(ctx.config.max ?? 25);
  // Find content missing either metaTitle OR metaDescription. Empty-string
  // counts as missing too — guard with OR clauses.
  const items = await prisma.content.findMany({
    where: {
      dealershipId: ctx.dealershipId,
      OR: [
        { metaTitle: null }, { metaTitle: "" },
        { metaDescription: null }, { metaDescription: "" },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: max,
    select: { id: true, title: true, bodyMarkdown: true, metaTitle: true, metaDescription: true, targetKeyword: true },
  });
  if (items.length === 0) return { summary: "All content already has meta tags" };
  if (ctx.dryRun) {
    return {
      summary: `Would fill meta tags for ${items.length} item${items.length === 1 ? "" : "s"}`,
      output: { wouldFill: items.map((i) => ({ id: i.id, title: i.title })) },
    };
  }

  const { generateMockMeta } = await import("@/lib/openai-internal");
  let filled = 0;
  let tokens = 0;
  for (const it of items) {
    const meta = await generateMockMeta({
      dealershipId: ctx.dealershipId,
      topic: it.title,
      keyword: it.targetKeyword ?? undefined,
    });
    tokens += approxTokens(meta.metaTitle + meta.metaDescription);
    await prisma.content.update({
      where: { id: it.id },
      data: {
        metaTitle: it.metaTitle || meta.metaTitle,
        metaDescription: it.metaDescription || meta.metaDescription,
        keywords: stringifyJson(meta.keywords ?? []),
      },
    });
    filled++;
  }
  return {
    summary: `Filled meta tags for ${filled} page${filled === 1 ? "" : "s"}`,
    output: { filledIds: items.map((i) => i.id) },
    tokensUsed: tokens,
  };
}

async function runArchiveExpiredOffers(ctx: TemplateCtx): Promise<TemplateResult> {
  const now = new Date();
  const expired = await prisma.offer.findMany({
    where: {
      dealershipId: ctx.dealershipId,
      expiresAt: { lte: now, not: null },
      status: { not: "ARCHIVED" },
    },
    select: { id: true, headline: true, expiresAt: true },
  });
  if (expired.length === 0) return { summary: "No expired offers" };
  if (ctx.dryRun) {
    return {
      summary: `Would archive ${expired.length} expired offer${expired.length === 1 ? "" : "s"}`,
      output: { wouldArchive: expired.map((o) => ({ id: o.id, headline: o.headline })) },
    };
  }
  await prisma.offer.updateMany({
    where: { id: { in: expired.map((o) => o.id) } },
    data: { status: "ARCHIVED" },
  });
  return {
    summary: `Archived ${expired.length} expired offer${expired.length === 1 ? "" : "s"}`,
    output: { archivedIds: expired.map((o) => o.id) },
  };
}

async function runReviewAutoreply(ctx: TemplateCtx): Promise<TemplateResult> {
  // Dry-run uses the most recent matching review (rating ≥ 4) for preview.
  const review = await resolveReviewForRun(ctx, { minRating: 4 });
  if (!review) return { summary: ctx.dryRun ? "No matching review to preview against" : "No review payload — skipped" };

  const { generateMockReviewReply } = await import("@/lib/openai-internal");
  const body = await generateMockReviewReply({
    dealershipId: ctx.dealershipId,
    rating: review.rating,
    reviewBody: review.body,
    tone: ctx.config.tone ?? "friendly",
  });
  const tokensUsed = approxTokens(body);

  if (ctx.dryRun) {
    return {
      summary: `Would ${ctx.config.autoPost ? "post" : "draft"} reply to ${review.rating}★ "${review.authorName}"`,
      output: { reviewId: review.id, reply: body },
      tokensUsed,
    };
  }
  const reply = await prisma.reviewReply.create({
    data: {
      reviewId: review.id,
      body,
      aiGenerated: true,
      status: ctx.config.autoPost ? "POSTED" : "DRAFT",
      postedAt: ctx.config.autoPost ? new Date() : null,
    },
  });
  return {
    summary: ctx.config.autoPost
      ? `Auto-posted reply to ${review.rating}★ review from ${review.authorName}`
      : `Drafted reply to ${review.rating}★ review from ${review.authorName}`,
    output: { reviewId: review.id, replyId: reply.id },
    tokensUsed,
  };
}

async function runReviewAutoescalate(ctx: TemplateCtx): Promise<TemplateResult> {
  const review = await resolveReviewForRun(ctx, { maxRating: 2 });
  if (!review) return { summary: ctx.dryRun ? "No matching low-star review to preview against" : "No review payload — skipped" };

  const { generateMockReviewReply } = await import("@/lib/openai-internal");
  const body = await generateMockReviewReply({
    dealershipId: ctx.dealershipId,
    rating: review.rating,
    reviewBody: review.body,
    tone: ctx.config.tone ?? "professional",
  });
  const tokensUsed = approxTokens(body);

  if (ctx.dryRun) {
    return {
      summary: `Would escalate ${review.rating}★ "${review.authorName}" — draft reply ready for GM`,
      output: { reviewId: review.id, reply: body },
      tokensUsed,
    };
  }
  await prisma.reviewReply.create({
    data: {
      reviewId: review.id,
      body,
      aiGenerated: true,
      status: "DRAFT",
    },
  });
  await prisma.review.update({ where: { id: review.id }, data: { isEscalated: true } });
  return {
    summary: `Escalated ${review.rating}★ review from ${review.authorName} — draft reply ready for GM`,
    output: { reviewId: review.id },
    tokensUsed,
  };
}

/**
 * Event-triggered review workflows expect a `_event.reviewId` in their config
 * when fired by `fireWorkflowEvent`. For dry-runs (no event payload) we
 * substitute the most recent review that *would* have matched the filter so
 * users can preview what the workflow would do.
 */
async function resolveReviewForRun(
  ctx: TemplateCtx,
  filter: { minRating?: number; maxRating?: number },
) {
  const ev = ctx.config?._event;
  if (ev?.reviewId) {
    const r = await prisma.review.findUnique({ where: { id: ev.reviewId } });
    if (r && r.dealershipId === ctx.dealershipId) return r;
  }
  if (!ctx.dryRun) return null;
  const where: any = { dealershipId: ctx.dealershipId };
  if (filter.minRating != null) where.rating = { gte: filter.minRating };
  if (filter.maxRating != null) where.rating = { lte: filter.maxRating };
  return prisma.review.findFirst({ where, orderBy: { publishedAt: "desc" } });
}

// ─────────────────────────────────────────────────────────────────────────
// Small utils
// ─────────────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function uniqueSlug(dealershipId: string, base: string) {
  let slug = base || `auto-${Date.now()}`;
  let n = 1;
  while (await prisma.content.findUnique({ where: { dealershipId_slug: { dealershipId, slug } } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

async function logActivity(dealershipId: string, userId: string | null | undefined, action: string, target?: string) {
  await prisma.activity.create({
    data: { dealershipId, userId: userId ?? null, action, target },
  });
}

/**
 * `revalidatePath` only works inside a request context. Workflows can also
 * run from cron handlers (which have one) and from non-request callers
 * (e.g. test scripts). Swallow the failure when it's not a real request.
 */
function safeRevalidate(path: string): void {
  try { revalidatePath(path); } catch { /* not in request context — fine */ }
}
