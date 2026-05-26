import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const tenant = await requireTenant();
  const items = await prisma.inventoryItem.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Car}
        title="Inventory"
        description={`${items.length} vehicle${items.length === 1 ? "" : "s"} · feed source: dealer XML / manual.`}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No inventory yet"
          description="Connect a dealer feed or run the seeder to populate vehicles."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((v) => (
            <Card key={v.id} className="overflow-hidden hover:shadow-md hover:border-brand-500/40 transition-all">
              <div className="aspect-video bg-muted">
                {v.imageUrl ? <img src={v.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full grid place-items-center text-xs text-muted-foreground">{v.year} {v.make} {v.model}</div>}
              </div>
              <CardContent className="p-3 space-y-1">
                <div className="font-medium text-sm truncate">{v.year} {v.make} {v.model} {v.trim ?? ""}</div>
                <div className="text-xs text-muted-foreground truncate">VIN {v.vin} · {v.mileage?.toLocaleString() ?? 0} mi</div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold">{formatCurrency(v.price as any)}</span>
                  <Badge variant={v.status === "AVAILABLE" ? "success" : "secondary"}>{v.status.toLowerCase()}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
