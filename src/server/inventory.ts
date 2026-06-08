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

// ───────────────────────────────────────────────────────────────────────
// Feed import — pull JSON from a URL or paste it directly, upsert by VIN.
// Supports two common dealer-feed shapes:
//   1. { vehicles: [ { vin, year, make, model, … } ] }
//   2. [ { vin, year, make, model, … } ]
// Field names matched flexibly (camelCase, snake_case, ALLCAPS) to absorb
// real-world feed quirks without forcing the operator to remap.
// ───────────────────────────────────────────────────────────────────────

const PARSE_ALIASES: Record<string, string[]> = {
  vin:           ["vin", "Vin", "VIN"],
  year:          ["year", "Year", "modelYear", "model_year"],
  make:          ["make", "Make", "manufacturer"],
  model:         ["model", "Model"],
  trim:          ["trim", "Trim"],
  bodyStyle:     ["bodyStyle", "body_style", "bodyType", "body_type"],
  exteriorColor: ["exteriorColor", "exterior_color", "color"],
  interiorColor: ["interiorColor", "interior_color"],
  mileage:       ["mileage", "Mileage", "miles", "odometer"],
  price:         ["price", "Price", "salePrice", "askingPrice"],
  msrp:          ["msrp", "MSRP", "originalPrice"],
  stockNumber:   ["stockNumber", "stock_number", "stockId", "stock"],
  fuelType:      ["fuelType", "fuel_type", "fuel"],
  transmission:  ["transmission", "Transmission"],
  drivetrain:    ["drivetrain", "Drivetrain", "drive_type"],
  imageUrl:      ["imageUrl", "image_url", "primaryImage", "imageURL", "image"],
  status:        ["status", "availability"],
};

function pick(row: any, names: string[]): any {
  for (const n of names) if (row?.[n] !== undefined && row[n] !== null && row[n] !== "") return row[n];
  return undefined;
}

function normalize(row: any) {
  const v: any = {};
  for (const [k, aliases] of Object.entries(PARSE_ALIASES)) {
    const val = pick(row, aliases);
    if (val === undefined) continue;
    if (["year", "mileage"].includes(k)) v[k] = Number(val) || undefined;
    else if (["price", "msrp"].includes(k)) v[k] = Number(val) || undefined;
    else v[k] = typeof val === "string" ? val.trim() : val;
  }
  if (v.status && typeof v.status === "string") {
    const s = v.status.toUpperCase();
    v.status = ["AVAILABLE", "SOLD", "ON_HOLD", "ARCHIVED"].includes(s) ? s : "AVAILABLE";
  }
  return v;
}

export async function previewInventoryFeed(input: { url?: string; raw?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");

  let payload: any;
  if (input.url) {
    const res = await fetch(input.url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
    payload = await res.json();
  } else if (input.raw) {
    try { payload = JSON.parse(input.raw); }
    catch { throw new Error("Pasted data isn't valid JSON"); }
  } else {
    throw new Error("Provide either a URL or pasted JSON");
  }

  const rows: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.vehicles) ? payload.vehicles : [];
  if (rows.length === 0) throw new Error("Feed contains no vehicles");

  const normalized = rows.map(normalize).filter((r) => r.vin && r.year && r.make && r.model);
  const skipped = rows.length - normalized.length;

  const existing = await prisma.inventoryItem.findMany({
    where: { dealershipId: tenant.dealershipId },
    select: { vin: true },
  });
  const existingVins = new Set(existing.map((e) => e.vin));
  const toAdd    = normalized.filter((r) => !existingVins.has(r.vin)).length;
  const toUpdate = normalized.filter((r) =>  existingVins.has(r.vin)).length;
  const sample   = normalized.slice(0, 5);

  return { total: rows.length, parsable: normalized.length, skipped, toAdd, toUpdate, sample };
}

export async function importInventoryFeed(input: { url?: string; raw?: string }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "content.update")) throw new Error("FORBIDDEN");

  let payload: any;
  if (input.url) {
    const res = await fetch(input.url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
    payload = await res.json();
  } else if (input.raw) {
    try { payload = JSON.parse(input.raw); }
    catch { throw new Error("Pasted data isn't valid JSON"); }
  } else {
    throw new Error("Provide either a URL or pasted JSON");
  }

  const rows: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.vehicles) ? payload.vehicles : [];
  const normalized = rows.map(normalize).filter((r) => r.vin && r.year && r.make && r.model);

  let added = 0, updated = 0, errored = 0;
  for (const v of normalized) {
    try {
      await prisma.inventoryItem.upsert({
        where: { dealershipId_vin: { dealershipId: tenant.dealershipId, vin: v.vin } },
        create: { ...v, dealershipId: tenant.dealershipId },
        update: v,
      });
      // Track add vs update via a probe query. Cheaper than relying on
      // upsert's return shape across DBs.
      const existed = await prisma.inventoryItem.findFirst({
        where: { dealershipId: tenant.dealershipId, vin: v.vin, createdAt: { lt: new Date(Date.now() - 2000) } },
        select: { id: true },
      });
      if (existed) updated++; else added++;
    } catch { errored++; }
  }

  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId, userId: tenant.userId,
      action: `Imported inventory feed · ${added} added · ${updated} updated${errored ? ` · ${errored} errored` : ""}`,
    },
  });
  revalidatePath("/dashboard/inventory");
  return { added, updated, errored, totalProcessed: normalized.length };
}
