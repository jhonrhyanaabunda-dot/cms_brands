import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewsList } from "./reviews-list";
import { Star } from "lucide-react";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const tenant = await requireTenant();
  const reviews = await prisma.review.findMany({
    where: { dealershipId: tenant.dealershipId },
    orderBy: { publishedAt: "desc" },
    include: { replies: true },
    take: 50,
  });

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(2) : "—";
  const positive = reviews.filter((r) => r.sentiment === "POSITIVE").length;
  const negative = reviews.filter((r) => r.sentiment === "NEGATIVE").length;
  const escalated = reviews.filter((r) => r.isEscalated && !r.replies.some((rp) => rp.status === "POSTED")).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Star className="h-5 w-5" /> Review center</h1>
        <p className="text-sm text-muted-foreground">Sync, draft AI replies, approve, and post — all in one place.</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Avg rating" value={String(avg)} tone="success" />
        <Stat label="Positive" value={`${positive}`} tone="success" />
        <Stat label="Negative" value={`${negative}`} tone="danger" />
        <Stat label="Needs reply" value={`${escalated}`} tone="warning" />
      </div>

      <ReviewsList reviews={reviews as any} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "danger" }) {
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-semibold">{value}</div><Badge variant={tone} className="mt-1">live</Badge></CardContent>
    </Card>
  );
}
