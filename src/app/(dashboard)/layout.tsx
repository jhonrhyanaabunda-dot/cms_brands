import { redirect } from "next/navigation";
import { getTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
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

  return (
    <div
      className="h-screen flex bg-muted/30"
      style={{ ["--tenant-color" as any]: accent }}
    >
      <Sidebar role={tenant.role} accent={accent} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <Topbar
          role={tenant.role}
          dealerships={dealerships.map((d) => ({ id: d.id, name: d.name, slug: d.slug, brand: d.brand }))}
          currentId={current?.id ?? ""}
          accent={accent}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="container py-6 max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
