import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata = { title: "Offers" };

export default async function OffersPage() {
  const tenant = await requireTenant();
  const offers = await prisma.offer.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Tag}
        title="Lease & finance offers"
        description={`${offers.length} active offer${offers.length === 1 ? "" : "s"} · OEM-compliant builder.`}
      />
      {offers.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No offers yet"
          description="Run the seeder for a demo set, or wire in your OEM offer feed."
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {offers.map((o) => {
            const archived = (o as any).status === "ARCHIVED";
            const expired = o.expiresAt && new Date(o.expiresAt) < new Date();
            return (
              <Card key={o.id} className={`hover:shadow-md hover:border-brand-500/40 transition-all ${archived ? "opacity-60" : ""}`}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs uppercase font-semibold text-brand-500">{o.oemBrand ?? "Offer"}</div>
                    {archived
                      ? <Badge variant="secondary">archived</Badge>
                      : expired
                        ? <Badge variant="warning">expired</Badge>
                        : <Badge variant="success">active</Badge>}
                  </div>
                  <div className="font-semibold">{o.headline}</div>
                  {o.subheadline && <p className="text-sm text-muted-foreground">{o.subheadline}</p>}
                  <div className="flex items-center gap-3 text-sm pt-2">
                    {o.monthlyPayment && <span>{formatCurrency(o.monthlyPayment as any)}/mo</span>}
                    {o.termMonths && <span className="text-muted-foreground">{o.termMonths} mo</span>}
                    {o.apr && <span className="text-muted-foreground">{Number(o.apr)}% APR</span>}
                  </div>
                  {o.disclaimer && <p className="text-[10px] text-muted-foreground pt-2 border-t">{o.disclaimer}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
