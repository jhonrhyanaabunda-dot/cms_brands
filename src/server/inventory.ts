"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";

const InventoryStatusEnum = z.enum(["AVAILABLE", "SOLD", "ON_HOLD", "ARCHIVED"]);

const InventoryInput = z.object({
  vin: z.string().min(11).max(20),
  year: z.number().int().min(1980).max(2100),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  bodyStyle: z.string().optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  mileage: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  msrp: z.number().min(0).optional(),
  stockNumber: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  drivetrain: z.string().optional(),
  imageUrl: z.string().optional(),
  status: InventoryStatusEnum.optional(),
});

export async function createInventoryItem(input: z.infer<typeof InventoryInput>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.create")) throw new Error("FORBIDDEN");
  const data = InventoryInput.parse(input);
  const item = await prisma.inventoryItem.create({
    data: { ...data, dealershipId: tenant.dealershipId },
  });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Added vehicle ${data.year} ${data.make} ${data.model}`, target: item.id },
  });
  revalidatePath("/dashboard/inventory");
  return item;
}

export async function updateInventoryItem(id: string, input: Partial<z.infer<typeof InventoryInput>>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");
  const existing = await prisma.inventoryItem.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!existing) throw new Error("NOT_FOUND");
  const data = InventoryInput.partial().parse(input);
  const item = await prisma.inventoryItem.update({ where: { id }, data });
  revalidatePath("/dashboard/inventory");
  return item;
}

export async function deleteInventoryItem(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.delete")) throw new Error("FORBIDDEN");
  await prisma.inventoryItem.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Deleted inventory item ${id}` },
  });
  revalidatePath("/dashboard/inventory");
}
