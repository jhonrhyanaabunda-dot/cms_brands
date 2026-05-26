// Wrappers around lib/openai's mock generators that work from a
// dealershipId (cron / event-triggered workflows have no tenant context).
import { prisma } from "@/lib/db";
import {
  mockGbpJson, mockLandingJson, mockReviewReplyText, mockBlogJson, mockMetaJson,
  type MockCtx,
} from "@/lib/openai";

async function buildCtx(base: Partial<MockCtx> & { dealershipId: string }): Promise<MockCtx> {
  const d = await prisma.dealership.findUnique({ where: { id: base.dealershipId } });
  return {
    dealerName: d?.name ?? "your dealership",
    brand: d?.brand ?? undefined,
    city: d?.city ?? undefined,
    state: d?.state ?? undefined,
    ...base,
  } as MockCtx;
}

export async function generateMockGbpPost(input: {
  dealershipId: string;
  topic: string;
  tone?: string;
  cta?: string;
  postType?: string;
}): Promise<Array<{ title: string; bodyMarkdown: string; hashtags?: string[] }>> {
  const ctx = await buildCtx({
    dealershipId: input.dealershipId,
    topic: input.topic,
    tone: input.tone,
    cta: input.cta,
    postType: input.postType ?? "update",
  });
  const json = mockGbpJson(ctx) as { variants: Array<{ title: string; bodyMarkdown: string; hashtags?: string[] }> };
  return json.variants;
}

export async function generateMockLandingPage(input: {
  dealershipId: string;
  service: string;
  city?: string;
  keyword?: string;
}): Promise<{ title: string; slug: string; metaTitle: string; metaDescription: string; excerpt: string; keywords: string[]; bodyMarkdown: string }> {
  const ctx = await buildCtx({
    dealershipId: input.dealershipId,
    service: input.service,
    city: input.city,
    keyword: input.keyword,
  });
  return mockLandingJson(ctx) as any;
}

export async function generateMockReviewReply(input: {
  dealershipId: string;
  rating: number;
  reviewBody: string;
  tone?: string;
}): Promise<string> {
  const ctx = await buildCtx({
    dealershipId: input.dealershipId,
    rating: input.rating,
    reviewBody: input.reviewBody,
    tone: input.tone,
  });
  return mockReviewReplyText(ctx);
}

export async function generateMockBlog(input: {
  dealershipId: string;
  topic: string;
  keyword?: string;
  tone?: string;
  structure?: string;
  audience?: string;
  wordCount?: number;
}): Promise<{ title: string; slug: string; metaTitle: string; metaDescription: string; excerpt: string; keywords: string[]; outline: string[]; bodyMarkdown: string }> {
  const ctx = await buildCtx({
    dealershipId: input.dealershipId,
    topic: input.topic,
    keyword: input.keyword,
    tone: input.tone,
    structure: input.structure,
    audience: input.audience,
    wordCount: input.wordCount,
  });
  return mockBlogJson(ctx) as any;
}

export async function generateMockMeta(input: {
  dealershipId: string;
  topic?: string;
  keyword?: string;
}): Promise<{ metaTitle: string; metaDescription: string; keywords: string[] }> {
  const ctx = await buildCtx({
    dealershipId: input.dealershipId,
    topic: input.topic,
    keyword: input.keyword,
  });
  return mockMetaJson(ctx) as any;
}
