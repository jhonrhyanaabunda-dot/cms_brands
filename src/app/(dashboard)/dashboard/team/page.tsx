import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ROLE_LABEL } from "@/lib/rbac";
import type { Role } from "@/lib/types";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const tenant = await requireTenant();
  const memberships = await prisma.membership.findMany({
    where: { dealershipId: tenant.dealershipId },
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Team"
        description={`${memberships.length} member${memberships.length === 1 ? "" : "s"} in this workspace.`}
      />
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase text-muted-foreground border-b">
            <div className="col-span-6">Member</div>
            <div className="col-span-3">Role</div>
            <div className="col-span-3 text-right">Joined</div>
          </div>
          <div className="divide-y">
            {memberships.map((m) => {
              const initials = (m.user.name || m.user.email).split(/\s|@/).filter(Boolean).slice(0, 2).map((s: string) => s[0]!.toUpperCase()).join("");
              return (
                <div key={m.id} className="grid grid-cols-12 items-center px-4 py-3">
                  <div className="col-span-6 flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.user.name || m.user.email}</div>
                      <div className="text-xs text-muted-foreground">{m.user.email}</div>
                    </div>
                  </div>
                  <div className="col-span-3"><Badge variant="secondary">{ROLE_LABEL[m.role as Role]}</Badge></div>
                  <div className="col-span-3 text-right text-xs text-muted-foreground">{m.createdAt.toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
