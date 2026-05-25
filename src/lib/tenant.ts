import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/types";

const COOKIE = "a3_tenant";

export async function setActiveTenant(dealershipId: string) {
  (await cookies()).set(COOKIE, dealershipId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getTenantSlugCookie() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export type TenantContext = {
  userId: string;
  isSuperAdmin: boolean;
  dealershipId: string;
  dealershipSlug: string;
  role: Role;
};

/**
 * Resolve the current user + active dealership.
 * - Picks dealership from cookie if available, otherwise first membership.
 * - Super admins can access any dealership.
 */
export async function getTenant(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { dealership: true },
    orderBy: { createdAt: "asc" },
  });

  const cookieId = await getTenantSlugCookie();

  // Super admin can land on any tenant; otherwise pick from memberships
  if (session.user.isSuperAdmin) {
    const dealership =
      (cookieId && (await prisma.dealership.findUnique({ where: { id: cookieId } }))) ||
      memberships[0]?.dealership ||
      (await prisma.dealership.findFirst({ orderBy: { createdAt: "asc" } }));
    if (!dealership) return null;
    return {
      userId: session.user.id,
      isSuperAdmin: true,
      dealershipId: dealership.id,
      dealershipSlug: dealership.slug,
      role: "SUPER_ADMIN",
    };
  }

  const m =
    memberships.find((mb) => mb.dealershipId === cookieId) || memberships[0];
  if (!m) return null;
  return {
    userId: session.user.id,
    isSuperAdmin: false,
    dealershipId: m.dealershipId,
    dealershipSlug: m.dealership.slug,
    role: m.role as Role,
  };
}

export async function requireTenant(): Promise<TenantContext> {
  const t = await getTenant();
  if (!t) throw new Error("UNAUTHENTICATED");
  return t;
}
