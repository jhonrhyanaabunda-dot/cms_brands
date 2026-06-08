"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import { sendEmail, leadNotificationHtml } from "@/lib/email";

const LeadKindEnum   = z.enum(["contact", "testdrive", "finance"]);
const LeadStatusEnum = z.enum(["new", "contacted", "qualified", "converted", "archived"]);

const CreateLeadInput = z.object({
  dealershipId: z.string().min(1),
  kind: LeadKindEnum,
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  vehicleInterest: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
  source: z.string().max(500).optional(),
});

/**
 * Public-callable: anyone on the dealership microsite can submit a lead.
 * No `requireTenant` here — we validate the `dealershipId` is real and
 * accept anonymous form submissions. Rate limiting would happen at the
 * edge / CDN in production.
 */
export async function submitLead(input: z.infer<typeof CreateLeadInput>) {
  const data = CreateLeadInput.parse(input);
  const dealer = await prisma.dealership.findUnique({ where: { id: data.dealershipId } });
  if (!dealer) throw new Error("UNKNOWN_DEALERSHIP");

  const lead = await prisma.lead.create({
    data: {
      dealershipId: dealer.id,
      kind: data.kind,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      vehicleInterest: data.vehicleInterest?.trim() || null,
      message: data.message?.trim() || null,
      source: data.source?.trim() || null,
      status: "new",
    },
  });

  await prisma.activity.create({
    data: {
      dealershipId: dealer.id,
      action: `New ${data.kind} lead from ${data.name} (${data.email})`,
      target: lead.id,
    },
  });

  // Notify the dealership by email if they have one configured.
  // Errors are caught — the lead is already saved, the inbox shows it,
  // and a failed email shouldn't reflect back to the form submitter.
  if (dealer.email) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:2000";
      const { subject, html } = leadNotificationHtml({
        dealerName: dealer.name,
        appUrl,
        lead: {
          id: lead.id, kind: lead.kind, name: lead.name, email: lead.email,
          phone: lead.phone, vehicleInterest: lead.vehicleInterest,
          message: lead.message, source: lead.source,
        },
      });
      await sendEmail({ to: dealer.email, subject, html, replyTo: lead.email });
    } catch (e) {
      console.error("[leads] notification email failed:", e);
    }
  }

  // Refresh the dashboard's lead inbox + sidebar count.
  revalidatePath("/dashboard/leads");
  return { id: lead.id };
}

// ───────────────────────────────────────────────────────────────────────
// Dashboard-side actions (tenant-gated).
// ───────────────────────────────────────────────────────────────────────

export async function updateLeadStatus(id: string, status: z.infer<typeof LeadStatusEnum>) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "reviews.manage")) throw new Error("FORBIDDEN");
  LeadStatusEnum.parse(status);
  const lead = await prisma.lead.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!lead) throw new Error("NOT_FOUND");
  await prisma.lead.update({ where: { id }, data: { status } });
  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId,
      userId: tenant.userId,
      action: `Lead ${lead.name} → ${status}`,
      target: id,
    },
  });
  revalidatePath("/dashboard/leads");
}

export async function updateLeadNotes(id: string, notes: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "reviews.manage")) throw new Error("FORBIDDEN");
  const lead = await prisma.lead.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!lead) throw new Error("NOT_FOUND");
  await prisma.lead.update({ where: { id }, data: { notes: notes.slice(0, 4000) } });
  revalidatePath("/dashboard/leads");
}

export async function deleteLead(id: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "reviews.manage")) throw new Error("FORBIDDEN");
  await prisma.lead.deleteMany({ where: { id, dealershipId: tenant.dealershipId } });
  revalidatePath("/dashboard/leads");
}
