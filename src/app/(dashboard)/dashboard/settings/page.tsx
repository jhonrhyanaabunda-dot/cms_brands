import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { PROVIDER, MODEL } from "@/lib/openai";
import { SettingsClient } from "./settings-client";
import { can } from "@/lib/rbac";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const tenant = await requireTenant();
  const d = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  if (!d) return null;
  const canEdit = can(tenant.role, "dealership.manage");

  const integrations = [
    { name: "Google Search Console", connected: !!d.gscSiteUrl, value: d.gscSiteUrl ?? "Not connected" },
    { name: "Google Analytics 4",    connected: !!d.ga4PropertyId, value: d.ga4PropertyId ?? "Not connected" },
    { name: "Google Business Profile",connected: !!d.gbpAccountId, value: d.gbpAccountId ?? "Not connected" },
    {
      name: "Gemini (Google AI)",
      connected: PROVIDER === "gemini",
      value: PROVIDER === "gemini" ? `Active · ${MODEL}` : "Not connected (set GOOGLE_GENERATIVE_AI_API_KEY)",
    },
    {
      name: "OpenAI",
      connected: PROVIDER === "openai",
      value:
        PROVIDER === "openai" ? `Active · ${MODEL}` :
        PROVIDER === "gemini" ? "Available · using Gemini instead" :
        "Not connected (running in demo mode)",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        icon={Settings}
        title="Workspace settings"
        description="Manage dealership details and integrations."
      />

      <SettingsClient
        canEdit={canEdit}
        initial={{
          name: d.name,
          legalName: d.legalName,
          brand: d.brand,
          domain: d.domain,
          city: d.city,
          state: d.state,
          zip: d.zip,
          phone: d.phone,
          email: d.email,
          primaryColor: d.primaryColor,
          gscSiteUrl: d.gscSiteUrl,
          ga4PropertyId: d.ga4PropertyId,
          gbpAccountId: d.gbpAccountId,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration status</CardTitle>
          <CardDescription>Snapshot of which external services this workspace is wired to.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {integrations.map((i) => (
            <div key={i.name} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.value}</div>
              </div>
              <Badge variant={i.connected ? "success" : "secondary"}>{i.connected ? "connected" : "off"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
