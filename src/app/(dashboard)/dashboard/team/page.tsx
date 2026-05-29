import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import type { Role } from "@/lib/types";
import { TeamClient, type MemberRow } from "./team-client";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const tenant = await requireTenant();
  const memberships = await prisma.membership.findMany({
    where: { dealershipId: tenant.dealershipId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const rows: MemberRow[] = memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role as Role,
    name: m.user.name,
    email: m.user.email,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Team"
        description={`${rows.length} member${rows.length === 1 ? "" : "s"} · invite by email, change role, or remove.`}
      />
      <TeamClient initial={rows} currentUserId={tenant.userId} currentRole={tenant.role} />
    </div>
  );
}
