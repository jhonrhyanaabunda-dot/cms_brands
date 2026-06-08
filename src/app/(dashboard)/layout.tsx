import { redirect } from "next/navigation";
import { getTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Sidebar, MobileSidebar, type SidebarCounts } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { CommandPaletteRoot } from "@/components/dashboard/command-palette";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";
import { can } from "@/lib/rbac";
import { tenantAccent } from "@/lib/branding";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  if (!tenant) redirect("/login");

  // Eligible dealerships for the tenant switcher
  const dealerships = tenant.isSuperAdmin
    ? await prisma.dealership.findMany({ orderBy: { name: "asc" } })
    : await prisma.dealership.findMany({
        where: { memberships: { some: { userId: tenant.userId } } },
        orderBy: { name: "asc" },
      });

  const current = dealerships.find((d) => d.id === tenant.dealershipId) ?? dealerships[0];
  const accent = tenantAccent({ brand: current?.brand, primaryColor: current?.primaryColor });

  // Sidebar status-count badges. Best-effort; counts that fail individually
  // collapse to undefined and just hide the badge.
  const dId = tenant.dealershipId;
  const [contentTotal, scheduledTotal, reviewsPending, gbpTotal, inventoryTotal, offersTotal, mediaTotal, workflowsEnabled, leadsNew] = await Promise.all([
    prisma.content.count({ where: { dealershipId: dId, status: { in: ["DRAFT", "IN_REVIEW", "NEEDS_REVISION", "APPROVED"] } } }).catch(() => undefined),
    prisma.content.count({ where: { dealershipId: dId, scheduledAt: { not: null }, status: { in: ["SCHEDULED", "APPROVED"] } } }).catch(() => undefined),
    prisma.review.count({ where: { dealershipId: dId, isEscalated: true, replies: { none: { status: "POSTED" } } } }).catch(() => undefined),
    prisma.content.count({ where: { dealershipId: dId, type: "GBP_POST", status: { in: ["DRAFT", "IN_REVIEW", "SCHEDULED"] } } }).catch(() => undefined),
    prisma.inventoryItem.count({ where: { dealershipId: dId } }).catch(() => undefined),
    prisma.offer.count({ where: { dealershipId: dId } }).catch(() => undefined),
    prisma.mediaAsset.count({ where: { dealershipId: dId } }).catch(() => undefined),
    prisma.workflow.count({ where: { dealershipId: dId, enabled: true } }).catch(() => undefined),
    prisma.lead.count({ where: { dealershipId: dId, status: "new" } }).catch(() => undefined),
  ]);
  const counts: SidebarCounts = {
    content: contentTotal,
    scheduler: scheduledTotal,
    reviews: reviewsPending,
    gbp: gbpTotal,
    inventory: inventoryTotal,
    offers: offersTotal,
    media: mediaTotal,
    workflows: workflowsEnabled,
    leads: leadsNew,
  };

  return (
    <div
      className="h-screen flex bg-muted/30"
      style={{ ["--tenant-color" as any]: accent }}
    >
      <Sidebar role={tenant.role} accent={accent} counts={counts} />
      <MobileSidebar role={tenant.role} counts={counts} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <Topbar
          role={tenant.role}
          dealerships={dealerships.map((d) => ({ id: d.id, name: d.name, slug: d.slug, brand: d.brand }))}
          currentId={current?.id ?? ""}
          accent={accent}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="container py-4 md:py-6 px-3 sm:px-4 md:px-6 max-w-screen-2xl">{children}</div>
        </main>
      </div>
      <CommandPaletteRoot />
      {current && !current.onboardedAt && can(tenant.role, "dealership.manage") && (
        <OnboardingWizard
          initial={{
            name: current.name,
            brand: current.brand,
            primaryColor: current.primaryColor,
            logoUrl: current.logoUrl,
            gscSiteUrl: current.gscSiteUrl,
            ga4PropertyId: current.ga4PropertyId,
            gbpAccountId: current.gbpAccountId,
          }}
        />
      )}
    </div>
  );
}
