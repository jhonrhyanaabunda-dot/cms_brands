"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";

const OfferStatusEnum = z.enum(["ACTIVE", "ARCHIVED"]);

const OfferInput = z.object({
  headline: z.string().min(1),
  subheadline: z.string().optional(),
  detail: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  oemBrand: z.string().optional(),
  model: z.string().optional(),
  monthlyPayment: z.number().min(0).optional(),
  apr: z.number().min(0).optional(),
  termMonths: z.number().int().min(1).optional(),
  disclaimer: z.string().optional(),
  status: OfferStatusEnum.optional(),
});

function toDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function createOffer(input: z.infer<typeof OfferInput>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");
  const data = OfferInput.parse(input);
  const offer = await prisma.offer.create({
    data: {
      ...data,
      startsAt:  toDate(data.startsAt),
      expiresAt: toDate(data.expiresAt),
      dealershipId: tenant.dealershipId,
    },
  });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Created offer "${data.headline}"`, target: offer.id },
  });
  revalidatePath("/dashboard/offers");
  return offer;
}

export async function updateOffer(id: string, input: Partial<z.infer<typeof OfferInput>>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  const existing = await prisma.offer.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!existing) throw new Error("NOT_FOUND");
  const data = OfferInput.partial().parse(input);
  const offer = await prisma.offer.update({
    where: { id },
    data: {
      ...data,
      startsAt:  data.startsAt  !== undefined ? toDate(data.startsAt)  : undefined,
      expiresAt: data.expiresAt !== undefined ? toDate(data.expiresAt) : undefined,
    },
  });
  revalidatePath("/dashboard/offers");
  return offer;
}

export async function deleteOffer(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.delete")) throw new Error("FORBIDDEN");
  await prisma.offer.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Deleted offer ${id}` },
  });
  revalidatePath("/dashboard/offers");
}
