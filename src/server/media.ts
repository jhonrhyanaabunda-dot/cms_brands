"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { chat } from "@/lib/openai";

export async function createMediaFolder(name: string, parentId?: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "media.upload")) throw new Error("FORBIDDEN");
  const f = await prisma.mediaFolder.create({
    data: { dealershipId: tenant.dealershipId, name, parentId: parentId ?? null },
  });
  revalidatePath("/dashboard/media");
  return f;
}

export async function attachMediaAsset(input: {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  folderId?: string;
}) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "media.upload")) throw new Error("FORBIDDEN");
  const asset = await prisma.mediaAsset.create({
    data: {
      dealershipId: tenant.dealershipId,
      uploadedBy: tenant.userId,
      url: input.url,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      width: input.width,
      height: input.height,
      folderId: input.folderId,
    },
  });
  // Async-ish AI tagging (fires the call; in real prod we'd queue)
  try {
    const { text } = await chat({
      system: "You generate concise alt text and tags for dealership media.",
      user: `Filename: ${input.filename}\nMime: ${input.mimeType}\n\nReturn JSON: { alt: string, tags: string[] }.`,
      json: true,
    });
    const parsed = JSON.parse(text);
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { alt: parsed.alt, aiTags: JSON.stringify(parsed.tags ?? []) },
    });
  } catch { /* non-fatal */ }
  revalidatePath("/dashboard/media");
  return asset;
}

export async function deleteMediaAsset(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "media.delete")) throw new Error("FORBIDDEN");
  await prisma.mediaAsset.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  revalidatePath("/dashboard/media");
}
