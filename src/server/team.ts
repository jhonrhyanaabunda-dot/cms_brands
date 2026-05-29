"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { can } from "@/lib/rbac";
import type { Role } from "@/lib/types";

const RoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "SEO_MANAGER", "CONTENT_MANAGER", "DEALER_CLIENT", "VIEWER"]);

/**
 * Invite a teammate to the current dealership. If the user doesn't exist
 * yet, create them with a default password (real production would email
 * a magic link instead).
 */
export async function inviteMember(input: { email: string; name?: string; role: Role }) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "team.manage")) throw new Error("FORBIDDEN");
  const email = z.string().email().parse(input.email).toLowerCase();
  const role = RoleEnum.parse(input.role);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash("password123", 10);
    user = await prisma.user.create({
      data: { email, name: input.name ?? email.split("@")[0], passwordHash },
    });
  }

  // Idempotent: don't duplicate a membership.
  const existing = await prisma.membership.findUnique({
    where: { userId_dealershipId: { userId: user.id, dealershipId: tenant.dealershipId } },
  });
  if (existing) {
    if (existing.role !== role) {
      await prisma.membership.update({ where: { id: existing.id }, data: { role } });
    }
  } else {
    await prisma.membership.create({
      data: { userId: user.id, dealershipId: tenant.dealershipId, role },
    });
  }

  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId, userId: tenant.userId,
      action: `Invited ${email} as ${role.toLowerCase().replace("_", " ")}`,
      target: user.id,
    },
  });
  revalidatePath("/dashboard/team");
  return { id: user.id, email: user.email };
}

export async function changeMemberRole(membershipId: string, role: Role) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "team.manage")) throw new Error("FORBIDDEN");
  RoleEnum.parse(role);
  const m = await prisma.membership.findFirst({
    where: { id: membershipId, dealershipId: tenant.dealershipId },
  });
  if (!m) throw new Error("NOT_FOUND");
  await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath("/dashboard/team");
}

export async function removeMember(membershipId: string) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "team.manage")) throw new Error("FORBIDDEN");
  const m = await prisma.membership.findFirst({
    where: { id: membershipId, dealershipId: tenant.dealershipId },
    include: { user: true },
  });
  if (!m) throw new Error("NOT_FOUND");
  // Refuse to remove yourself if you're the last team manager — would lock
  // the dealership out of further membership changes.
  if (m.userId === tenant.userId) {
    const others = await prisma.membership.count({
      where: {
        dealershipId: tenant.dealershipId,
        role: { in: ["SUPER_ADMIN", "ADMIN"] },
        NOT: { id: membershipId },
      },
    });
    if (others === 0) throw new Error("Cannot remove the last admin");
  }
  await prisma.membership.delete({ where: { id: membershipId } });
  await prisma.activity.create({
    data: {
      dealershipId: tenant.dealershipId, userId: tenant.userId,
      action: `Removed ${m.user.email} from team`,
      target: m.userId,
    },
  });
  revalidatePath("/dashboard/team");
}
