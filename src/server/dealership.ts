"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";

const DealershipInput = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  brand: z.string().optional(),
  domain: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  gscSiteUrl: z.string().optional(),
  ga4PropertyId: z.string().optional(),
  gbpAccountId: z.string().optional(),
});

export async function updateDealership(input: Partial<z.infer<typeof DealershipInput>>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "dealership.manage")) throw new Error("FORBIDDEN");
  const data = DealershipInput.partial().parse(input);
  const cleaned: any = { ...data };
  if (cleaned.email === "") cleaned.email = null;
  const updated = await prisma.dealership.update({
    where: { id: tenant.dealershipId },
    data: cleaned,
  });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: "Updated dealership profile", target: updated.id },
  });
  revalidatePath("/dashboard/settings");
  // Also revalidate the public microsite — name/color changes need to flush.
  revalidatePath(`/site/${updated.slug}`);
  return updated;
}
