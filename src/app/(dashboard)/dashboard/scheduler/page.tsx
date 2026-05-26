import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { format, isSameDay, addDays, startOfWeek } from "date-fns";
import { RunSchedulerNow } from "./run-now";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Scheduler" };

export default async function SchedulerPage() {
  const tenant = await requireTenant();
  const items = await prisma.content.findMany({
    where: { dealershipId: tenant.dealershipId, scheduledAt: { not: null } },
    orderBy: { scheduledAt: "asc" },
  });

  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title="Scheduler"
        description={`${items.length} item${items.length === 1 ? "" : "s"} scheduled · auto-publish, expire, recur.`}
        actions={<RunSchedulerNow />}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Upcoming 14 days</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const dayItems = items.filter((i) => i.scheduledAt && isSameDay(i.scheduledAt, d));
              return (
                <div key={d.toISOString()} className="border rounded-md p-2 min-h-[110px]">
                  <div className="text-[10px] uppercase text-muted-foreground">{format(d, "EEE")}</div>
                  <div className="text-sm font-medium">{format(d, "MMM d")}</div>
                  <div className="mt-2 space-y-1">
                    {dayItems.map((c) => (
                      <Link key={c.id} href={`/dashboard/content/${c.id}`} className="block rounded bg-brand-500/10 text-brand-700 dark:text-brand-300 px-1.5 py-1 text-[11px] truncate hover:bg-brand-500/15">{c.title}</Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All scheduled content</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {items.length === 0 && <p className="text-sm text-muted-foreground py-2">Nothing scheduled — set a publish date in the editor.</p>}
          {items.map((c) => (
            <Link key={c.id} href={`/dashboard/content/${c.id}`} className="flex items-center justify-between py-2 text-sm hover:bg-accent/40 -mx-2 px-2 rounded">
              <span className="truncate">{c.title}</span>
              <div className="flex items-center gap-3">
                <Badge variant="info">{c.status.toLowerCase().replace("_"," ")}</Badge>
                <span className="text-xs text-muted-foreground">{c.scheduledAt && format(c.scheduledAt, "MMM d, h:mm a")}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
