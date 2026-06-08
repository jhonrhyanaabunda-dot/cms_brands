"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { generateReviewReply } from "@/server/ai";
import { fireWorkflowEvent } from "@/server/workflows";
import { sendEmail, reviewEscalationHtml } from "@/lib/email";

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
  const createdIds: { id: string; rating: number; authorName: string; body: string }[] = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const externalId = `mock-${i}-${Date.now()}`;
    const review = await prisma.review.create({
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
    createdIds.push({ id: review.id, rating: review.rating, authorName: review.authorName, body: review.body });
  }
  await prisma.activity.create({
    data: { dealershipId: tenant.dealershipId, userId: tenant.userId, action: `Synced ${created} reviews from GBP (mock)` },
  });
  // Fire one event per new review so any matching workflow (auto-reply,
  // auto-escalate) can react. Errors here must NOT roll back the sync —
  // catch and log instead.
  for (const r of createdIds) {
    try {
      await fireWorkflowEvent({
        dealershipId: tenant.dealershipId,
        eventType: "review.synced",
        payload: { reviewId: r.id, rating: r.rating },
      });
    } catch (e) {
      console.error("[workflow] review.synced fire failed:", e);
    }
  }
  // Email the dealership about each escalated review (rating ≤ 2).
  // Same fail-soft pattern as workflow events — sync should not roll back.
  if (dealer?.email) {
    const lowStars = createdIds.filter((r) => r.rating <= 2);
    if (lowStars.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:2000";
      for (const r of lowStars) {
        try {
          const { subject, html } = reviewEscalationHtml({
            dealerName: dealer.name,
            appUrl,
            review: { id: r.id, authorName: r.authorName, rating: r.rating, body: r.body },
          });
          await sendEmail({ to: dealer.email, subject, html });
        } catch (e) {
          console.error("[reviews] escalation email failed:", e);
        }
      }
    }
  }
  revalidatePath("/dashboard/reviews");
  revalidatePath("/dashboard/workflows");
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
