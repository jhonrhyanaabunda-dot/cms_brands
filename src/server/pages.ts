"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { stringifyJson } from "@/lib/utils";

export async function createPage(input: { path: string; title: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const page = await prisma.pageNode.create({
    data: { dealershipId: tenant.dealershipId, path, title: input.title, blocks: "[]" },
  });
  revalidatePath("/dashboard/pages");
  return page;
}

export async function savePage(id: string, input: { title?: string; blocks?: any[]; published?: boolean; path?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  const page = await prisma.pageNode.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!page) throw new Error("NOT_FOUND");
  const updated = await prisma.pageNode.update({
    where: { id },
    data: {
      title: input.title ?? page.title,
      blocks: input.blocks !== undefined ? stringifyJson(input.blocks) : page.blocks,
      published: input.published ?? page.published,
      path: input.path ?? page.path,
    },
  });
  revalidatePath("/dashboard/pages");
  return updated;
}

export async function deletePage(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.delete")) throw new Error("FORBIDDEN");
  await prisma.pageNode.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  revalidatePath("/dashboard/pages");
}
