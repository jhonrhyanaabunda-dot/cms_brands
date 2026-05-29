import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Activity as ActivityIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ActivityClient, type ActivityRow } from "./activity-client";

export const metadata = { title: "Activity" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ q?: string; user?: string }> }) {
  const tenant = await requireTenant();
  const sp = await searchParams;

  const [items, members] = await Promise.all([
    prisma.activity.findMany({
      where: { dealershipId: tenant.dealershipId },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.membership.findMany({
      where: { dealershipId: tenant.dealershipId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const rows: ActivityRow[] = items.map((a) => ({
    id: a.id,
    action: a.action,
    target: a.target,
    createdAt: a.createdAt.toISOString(),
    userId: a.userId,
    userName: a.user?.name ?? null,
    userEmail: a.user?.email ?? null,
  }));

  const memberOptions = members.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ActivityIcon}
        title="Activity"
        description={`${rows.length} recent event${rows.length === 1 ? "" : "s"} · who changed what, when.`}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity yet"
          description="Once your team starts editing content, creating workflows, or syncing reviews, it'll show up here."
        />
      ) : (
        <ActivityClient
          initial={rows}
          members={memberOptions}
          initialQuery={sp.q ?? ""}
          initialUser={sp.user ?? ""}
        />
      )}
    </div>
  );
}
