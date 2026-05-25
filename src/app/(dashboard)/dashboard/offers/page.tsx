import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Offers" };

export default async function OffersPage() {
  const tenant = await requireTenant();
  const offers = await prisma.offer.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Tag className="h-5 w-5" /> Lease & finance offers</h1>
        <p className="text-sm text-muted-foreground">OEM-compliant lease and finance offer builder.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {offers.length === 0 && <Card className="col-span-full"><CardContent className="p-10 text-center text-sm text-muted-foreground">No offers yet. Add one in the next iteration of this surface.</CardContent></Card>}
        {offers.map((o) => (
          <Card key={o.id}>
            <CardContent className="p-5 space-y-2">
              <div className="text-xs uppercase font-semibold text-brand-500">{o.oemBrand ?? "Offer"}</div>
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
        ))}
      </div>
    </div>
  );
}
