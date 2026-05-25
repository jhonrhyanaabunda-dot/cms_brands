"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { generateReviewReply } from "@/server/ai";

export async function syncReviews() {
  const tenant = await requireTenant();
  if (!can(tenant.role, "reviews.manage")) throw new Error("FORBIDDEN");
  // Real impl: call Google Business Profile API. Here we mock-sync demo reviews.
  const dealer = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  const samples = [
    { authorName: "Sarah M.", rating: 5, body: `Best experience at ${dealer?.name}. Service team was fast and friendly!`, sentiment: "POSITIVE" as const },
    { authorName: "James L.", rating: 4, body: "Great selection of vehicles. Test drive was smooth.", sentiment: "POSITIVE" as const },
    { authorName: "Pat R.", rating: 2, body: "Waited too long for my oil change appointment.", sentiment: "NEGATIVE" as const },
    { authorName: "Amy K.", rating: 5, body: "Loved the new car experience — highly recommend.", sentiment: "POSITIVE" as const },
  ];
  let created = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const externalId = `mock-${i}-${Date.now()}`;
    await prisma.review.create({
      data: {
        dealershipId: tenant.dealershipId,
        externalId,
        authorName: s.authorName,
        rating: s.rating,
        body: s.body,
        sentiment: s.sentiment,
        isEscalated: s.rating <= 2,
        publishedAt: new Date(Date.now() - Math.random() * 14 * 86400000),
      },
    });
    created++;
  }
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Synced ${created} reviews from GBP (mock)` },
  });
  revalidatePath("/dashboard/reviews");
  return created;
}

export async function draftReply(reviewId: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "reviews.reply")) throw new Error("FORBIDDEN");
  const r = await prisma.review.findFirst({ where: { id: reviewId, dealershipId: tenant.dealershipId } });
  if (!r) throw new Error("NOT_FOUND");
  const body = await generateReviewReply({ reviewBody: r.body, rating: r.rating });
  const reply = await prisma.reviewReply.create({
    data: { reviewId, body, status: "DRAFT", aiGenerated: true, authorId: tenant.userId },
  });
  revalidatePath("/dashboard/reviews");
  return reply;
}

export async function approveReply(replyId: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "reviews.reply")) throw new Error("FORBIDDEN");
  const updated = await prisma.reviewReply.update({
    where: { id: replyId },
    data: { status: "POSTED", postedAt: new Date() },
  });
  // Real impl: post via GBP API.
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Posted review reply` },
  });
  revalidatePath("/dashboard/reviews");
  return updated;
}
