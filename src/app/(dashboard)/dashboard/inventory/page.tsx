import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Car } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { InventoryClient, type Vehicle } from "./inventory-client";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const tenant = await requireTenant();
  const items = await prisma.inventoryItem.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const rows: Vehicle[] = items.map((v) => ({
    id: v.id,
    vin: v.vin, year: v.year, make: v.make, model: v.model,
    trim: v.trim, bodyStyle: v.bodyStyle,
    exteriorColor: v.exteriorColor, interiorColor: v.interiorColor,
    mileage: v.mileage, price: v.price, msrp: v.msrp,
    stockNumber: v.stockNumber, fuelType: v.fuelType,
    transmission: v.transmission, drivetrain: v.drivetrain,
    imageUrl: v.imageUrl, status: v.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Car}
        title="Inventory"
        description={`${rows.length} vehicle${rows.length === 1 ? "" : "s"} · search, filter, add, and edit in place.`}
      />
      <InventoryClient initial={rows} role={tenant.role} />
    </div>
  );
}
