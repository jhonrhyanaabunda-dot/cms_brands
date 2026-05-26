"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { toSlug } from "@/lib/utils";
import type { ContentType, WorkflowStatus } from "@/lib/types";
import { stringifyJson } from "@/lib/utils";

const ContentTypeEnum = z.enum([
  "BLOG", "LANDING_PAGE", "DEALER_PAGE", "OEM_PAGE", "CITY_PAGE",
  "FAQ", "GBP_POST", "OFFER", "INVENTORY_CAMPAIGN", "SERVICE_CAMPAIGN",
  "MODEL_RESEARCH", "COMPARE_PAGE", "TRADE_IN_PAGE", "FINANCE_PAGE", "SERVICE_PAGE",
]);

const StatusEnum = z.enum([
  "DRAFT", "IN_REVIEW", "NEEDS_REVISION", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED",
]);

export async function createContent(input: {
  type: ContentType;
  title: string;
  slug?: string;
  excerpt?: string;
  bodyMarkdown?: string;
  blocks?: any[];
  aiGenerated?: boolean;
  aiModel?: string;
  targetCity?: string;
  targetState?: string;
  targetKeyword?: string;
  metaTitle?: string;
  metaDescription?: string;
  heroImageUrl?: string;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");

  const parsed = ContentTypeEnum.parse(input.type);
  const baseSlug = input.slug ? toSlug(input.slug) : toSlug(input.title);
  // ensure unique slug per dealership
  let slug = baseSlug;
  let n = 1;
  while (await prisma.content.findUnique({ where: { dealershipId_slug: { dealershipId: tenant.dealershipId, slug } } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const content = await prisma.content.create({
    data: {
      dealershipId: tenant.dealershipId,
      authorId: tenant.userId,
      type: parsed,
      title: input.title,
      slug,
      excerpt: input.excerpt,
      bodyMarkdown: input.bodyMarkdown,
      blocks: stringifyJson(input.blocks ?? []),
      aiGenerated: input.aiGenerated ?? false,
      aiModel: input.aiModel,
      targetCity: input.targetCity,
      targetState: input.targetState,
      targetKeyword: input.targetKeyword,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      heroImageUrl: input.heroImageUrl,
    },
  });

  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Created ${parsed.toLowerCase().replace("_", " ")}: ${input.title}`, target: content.id },
  });

  revalidatePath("/dashboard/content");
  return content;
}

export async function updateContent(id: string, input: Partial<{
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  bodyHtml: string;
  blocks: any[];
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  keywords: string[];
  noindex: boolean;
  status: WorkflowStatus;
  scheduledAt: string | null;
  expiresAt: string | null;
  heroImageUrl: string;
}>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");

  const existing = await prisma.content.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!existing) throw new Error("NOT_FOUND");

  // Snapshot before changes (version history)
  await prisma.revision.create({
    data: { contentId: id, snapshot: stringifyJson({ ...existing }), createdBy: tenant.userId, message: "auto-snapshot" },
  });

  const data: any = { ...input };
  if (input.slug) data.slug = toSlug(input.slug);
  if (input.blocks !== undefined) data.blocks = stringifyJson(input.blocks);
  if (input.keywords !== undefined) data.keywords = stringifyJson(input.keywords);
  if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (input.status === "PUBLISHED" && !existing.publishedAt) data.publishedAt = new Date();

  const updated = await prisma.content.update({ where: { id }, data });

  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Updated ${updated.title}`, target: id },
  });

  revalidatePath("/dashboard/content");
  revalidatePath(`/dashboard/content/${id}`);
  return updated;
}

export async function transitionStatus(id: string, status: WorkflowStatus, message?: string) {
  const tenant = await requireTenant();
  const permNeeded = status === "PUBLISHED" ? "content.publish" : "content.update";
  if (!can(tenant.role, permNeeded)) throw new Error("FORBIDDEN");

  const existing = await prisma.content.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!existing) throw new Error("NOT_FOUND");

  StatusEnum.parse(status);

  const data: any = { status };
  if (status === "PUBLISHED" && !existing.publishedAt) data.publishedAt = new Date();

  const updated = await prisma.content.update({ where: { id }, data });

  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId,
      userId: tenant.userId,
      action: `${status.toLowerCase().replace("_", " ")}: ${existing.title}`,
      target: id,
      meta: message ? stringifyJson({ message }) : undefined,
    },
  });

  revalidatePath("/dashboard/content");
  revalidatePath(`/dashboard/content/${id}`);
  return updated;
}

/**
 * Demo "fake scheduler": flips any scheduled content whose time has arrived
 * into PUBLISHED. In production this would be a cron / queue worker; here it's
 * triggered manually from the Scheduler page so prototypes can show the flow.
 */
export async function runDueScheduledNow() {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.publish")) throw new Error("FORBIDDEN");
  const now = new Date();
  const due = await prisma.content.findMany({
    where: {
      dealershipId: tenant.dealershipId,
      scheduledAt: { lte: now, not: null },
      status: { in: ["SCHEDULED", "APPROVED"] },
    },
    select: { id: true, title: true },
  });
  if (due.length > 0) {
    await prisma.content.updateMany({
      where: { id: { in: due.map((d) => d.id) } },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    await prisma.activity.create({
      data: {
        dealershipId: tenant.dealershipId,
        userId: tenant.userId,
        action: `Scheduler published ${due.length} item${due.length === 1 ? "" : "s"}`,
      },
    });
  }
  revalidatePath("/dashboard/scheduler");
  revalidatePath("/dashboard/content");
  return { publishedCount: due.length, titles: due.map((d) => d.title) };
}

export async function deleteContent(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.delete")) throw new Error("FORBIDDEN");
  await prisma.content.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Deleted content ${id}` },
  });
  revalidatePath("/dashboard/content");
}

export async function bulkTransitionStatus(ids: string[], status: WorkflowStatus) {
  const tenant = await requireTenant();
  const permNeeded = status === "PUBLISHED" ? "content.publish" : "content.update";
  if (!can(tenant.role, permNeeded)) throw new Error("FORBIDDEN");
  StatusEnum.parse(status);
  if (!ids.length) return { count: 0 };

  const data: any = { status };
  if (status === "PUBLISHED") data.publishedAt = new Date();
  const res = await prisma.content.updateMany({
    where: { id: { in: ids }, dealershipId: tenant.dealershipId },
    data,
  });
  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId,
      userId: tenant.userId,
      action: `Bulk ${status.toLowerCase().replace("_", " ")}: ${res.count} item${res.count === 1 ? "" : "s"}`,
    },
  });
  revalidatePath("/dashboard/content");
  return { count: res.count };
}

export async function bulkSchedule(ids: string[], when: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  if (!ids.length || !when) return { count: 0 };
  const scheduledAt = new Date(when);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("INVALID_DATE");
  const res = await prisma.content.updateMany({
    where: { id: { in: ids }, dealershipId: tenant.dealershipId },
    data: { scheduledAt, status: "SCHEDULED" },
  });
  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId,
      userId: tenant.userId,
      action: `Bulk scheduled ${res.count} item${res.count === 1 ? "" : "s"} for ${scheduledAt.toLocaleString()}`,
    },
  });
  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/scheduler");
  return { count: res.count };
}

export async function bulkDelete(ids: string[]) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.delete")) throw new Error("FORBIDDEN");
  if (!ids.length) return { count: 0 };
  const res = await prisma.content.deleteMany({
    where: { id: { in: ids }, dealershipId: tenant.dealershipId },
  });
  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId,
      userId: tenant.userId,
      action: `Bulk deleted ${res.count} item${res.count === 1 ? "" : "s"}`,
    },
  });
  revalidatePath("/dashboard/content");
  return { count: res.count };
}

export async function duplicateContent(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");
  const src = await prisma.content.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!src) throw new Error("NOT_FOUND");
  // Unique slug per dealership: "<slug>-copy", "<slug>-copy-2", …
  let slug = `${src.slug}-copy`;
  let n = 1;
  while (await prisma.content.findUnique({ where: { dealershipId_slug: { dealershipId: tenant.dealershipId, slug } } })) {
    slug = `${src.slug}-copy-${++n}`;
  }
  const copy = await prisma.content.create({
    data: {
      dealershipId: tenant.dealershipId,
      authorId: tenant.userId,
      type: src.type,
      title: `${src.title} (copy)`,
      slug,
      excerpt: src.excerpt,
      bodyMarkdown: src.bodyMarkdown,
      bodyHtml: src.bodyHtml,
      blocks: src.blocks,
      metaTitle: src.metaTitle,
      metaDescription: src.metaDescription,
      keywords: src.keywords,
      heroImageUrl: src.heroImageUrl,
      noindex: true,
      status: "DRAFT",
      aiGenerated: src.aiGenerated,
      aiModel: src.aiModel,
      targetCity: src.targetCity,
      targetState: src.targetState,
      targetKeyword: src.targetKeyword,
    },
  });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Duplicated ${src.title}`, target: copy.id },
  });
  revalidatePath("/dashboard/content");
  return copy;
}

export async function addComment(contentId: string, body: string) {
  const tenant = await requireTenant();
  await prisma.comment.create({ data: { contentId, userId: tenant.userId, body } });
  revalidatePath(`/dashboard/content/${contentId}`);
}

export async function rollbackToRevision(contentId: string, revisionId: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  const r = await prisma.revision.findUnique({ where: { id: revisionId } });
  if (!r) throw new Error("NOT_FOUND");
  const snap = JSON.parse(r.snapshot ?? "{}") as any;
  if (snap.dealershipId !== tenant.dealershipId) throw new Error("NOT_FOUND");
  const updated = await prisma.content.update({
    where: { id: contentId },
    data: {
      title: snap.title,
      slug: snap.slug,
      excerpt: snap.excerpt,
      bodyMarkdown: snap.bodyMarkdown,
      blocks: snap.blocks,
      metaTitle: snap.metaTitle,
      metaDescription: snap.metaDescription,
    },
  });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Rolled back ${updated.title}`, target: contentId },
  });
  revalidatePath(`/dashboard/content/${contentId}`);
  return updated;
}
