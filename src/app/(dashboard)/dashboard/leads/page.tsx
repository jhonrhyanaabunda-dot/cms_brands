import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LeadsClient, type LeadRow } from "./leads-client";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const tenant = await requireTenant();
  const leads = await prisma.lead.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    kind: l.kind,
    name: l.name,
    email: l.email,
    phone: l.phone,
    status: l.status,
    vehicleInterest: l.vehicleInterest,
    message: l.message,
    source: l.source,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Inbox}
        title="Leads"
        description={`${rows.length} submission${rows.length === 1 ? "" : "s"} · contact / test-drive / finance leads from the public site.`}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No leads yet"
          description="Add a Contact form, Test-drive request, or Finance pre-qual block to your homepage — every submission lands here."
        />
      ) : (
        <LeadsClient initial={rows} role={tenant.role} />
      )}
    </div>
  );
}
