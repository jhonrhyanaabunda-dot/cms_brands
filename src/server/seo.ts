"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";

export async function createRedirect(input: { from: string; to: string; statusCode?: number }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "seo.manage")) throw new Error("FORBIDDEN");
  const r = await prisma.redirect.create({
    data: {
      dealershipId: tenant.dealershipId,
      from: input.from,
      to: input.to,
      statusCode: input.statusCode ?? 301,
    },
  });
  revalidatePath("/dashboard/seo");
  return r;
}

export async function deleteRedirect(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "seo.manage")) throw new Error("FORBIDDEN");
  await prisma.redirect.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  revalidatePath("/dashboard/seo");
}
