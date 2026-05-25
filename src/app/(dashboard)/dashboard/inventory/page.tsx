import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Car className="h-5 w-5" /> Inventory</h1>
        <p className="text-sm text-muted-foreground">{items.length} vehicles · feed source: dealer XML / manual</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.length === 0 && <Card className="col-span-full"><CardContent className="p-10 text-center text-sm text-muted-foreground">No inventory yet — run the seeder or connect your feed.</CardContent></Card>}
        {items.map((v) => (
          <Card key={v.id}>
            <div className="aspect-video bg-muted">
              {v.imageUrl ? <img src={v.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full grid place-items-center text-xs text-muted-foreground">{v.year} {v.make} {v.model}</div>}
            </div>
            <CardContent className="p-3 space-y-1">
              <div className="font-medium text-sm">{v.year} {v.make} {v.model} {v.trim ?? ""}</div>
              <div className="text-xs text-muted-foreground">VIN {v.vin} · {v.mileage?.toLocaleString() ?? 0} mi</div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold">{formatCurrency(v.price as any)}</span>
                <Badge variant={v.status === "AVAILABLE" ? "success" : "secondary"}>{v.status.toLowerCase()}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
