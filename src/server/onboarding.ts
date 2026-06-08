"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { generateBlog } from "@/server/ai";
import { createContent } from "@/server/content";

const OnboardingInput = z.object({
  // Step 1
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  // Step 2
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.string().optional(),
  // Step 3
  gscSiteUrl: z.string().optional(),
  ga4PropertyId: z.string().optional(),
  gbpAccountId: z.string().optional(),
  // Step 4 (booleans for which starter topics to generate)
  generate: z.object({
    welcomeBlog: z.boolean().optional(),
    financingPage: z.boolean().optional(),
    servicePage: z.boolean().optional(),
    cityPage: z.boolean().optional(),
    aboutBlog: z.boolean().optional(),
  }).optional(),
});

export async function completeOnboarding(input: z.infer<typeof OnboardingInput>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "dealership.manage")) throw new Error("FORBIDDEN");
  const data = OnboardingInput.parse(input);

  // Save profile / IDs.
  const profileUpdate: any = {};
  if (data.name !== undefined)          profileUpdate.name = data.name;
  if (data.brand !== undefined)         profileUpdate.brand = data.brand || null;
  if (data.primaryColor !== undefined)  profileUpdate.primaryColor = data.primaryColor || null;
  if (data.logoUrl !== undefined)       profileUpdate.logoUrl = data.logoUrl || null;
  if (data.gscSiteUrl !== undefined)    profileUpdate.gscSiteUrl = data.gscSiteUrl || null;
  if (data.ga4PropertyId !== undefined) profileUpdate.ga4PropertyId = data.ga4PropertyId || null;
  if (data.gbpAccountId !== undefined)  profileUpdate.gbpAccountId = data.gbpAccountId || null;
  profileUpdate.onboardedAt = new Date();
  const dealer = await prisma.dealership.update({
    where: { id: tenant.dealershipId },
    data: profileUpdate,
  });

  // Generate starter content. Each call is best-effort — a failure in one
  // shouldn't roll back the entire wizard.
  const gen = data.generate ?? {};
  const generated: string[] = [];

  const safeGen = async (topic: string, keyword: string) => {
    try {
      const r = await generateBlog({ topic, keyword, tone: "professional", city: dealer.city ?? undefined });
      const c = await createContent({
        type: "BLOG",
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        bodyMarkdown: r.bodyMarkdown,
        metaTitle: r.metaTitle,
        metaDescription: r.metaDescription,
        aiGenerated: true,
      });
      generated.push(c.id);
    } catch (e) {
      console.error("[onboarding] starter generation failed:", topic, e);
    }
  };

  if (gen.welcomeBlog)   await safeGen(`Welcome to ${dealer.name}`, `${dealer.brand ?? ""} dealer ${dealer.city ?? ""}`.trim() || "dealer");
  if (gen.financingPage) await safeGen("Financing options for your next vehicle", "auto financing");
  if (gen.servicePage)   await safeGen("Why factory-certified service matters", `${dealer.brand ?? "OEM"} service`.trim());
  if (gen.cityPage && dealer.city) await safeGen(`Trusted ${dealer.brand ?? ""} dealer in ${dealer.city}`.trim(), `${dealer.brand ?? "auto"} dealer ${dealer.city}`);
  if (gen.aboutBlog)     await safeGen(`The ${dealer.name} difference`, "trusted local dealer");

  await prisma.activity.create({
    data: {
      dealershipId: dealer.id, userId: tenant.userId,
      action: `Completed onboarding · ${generated.length} starter pages`,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { generated: generated.length, contentIds: generated };
}

/**
 * "Skip for now" path — still marks onboardedAt so the wizard stops
 * showing, but generates nothing and changes no profile fields.
 */
export async function skipOnboarding() {
  const tenant = await requireTenant();
  await prisma.dealership.update({
    where: { id: tenant.dealershipId },
    data: { onboardedAt: new Date() },
  });
  revalidatePath("/dashboard");
}
