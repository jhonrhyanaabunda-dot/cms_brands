import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const tenant = await requireTenant();
  const d = await prisma.dealership.findUnique({ where: { id: tenant.dealershipId } });
  if (!d) return null;

  const integrations = [
    { name: "Google Search Console", connected: !!d.gscSiteUrl, value: d.gscSiteUrl ?? "Not connected" },
    { name: "Google Analytics 4", connected: !!d.ga4PropertyId, value: d.ga4PropertyId ?? "Not connected" },
    { name: "Google Business Profile", connected: !!d.gbpAccountId, value: d.gbpAccountId ?? "Not connected" },
    { name: "OpenAI", connected: !!process.env.OPENAI_API_KEY, value: process.env.OPENAI_API_KEY ? "Connected" : "Not connected (running in demo mode)" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Settings className="h-5 w-5" /> Workspace settings</h1>
        <p className="text-sm text-muted-foreground">Manage dealership details and integrations.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dealership profile</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <Row label="Name" value={d.name} />
          <Row label="Slug" value={d.slug} />
          <Row label="Brand" value={d.brand ?? "—"} />
          <Row label="Domain" value={d.domain ?? "—"} />
          <Row label="City" value={d.city ?? "—"} />
          <Row label="State" value={d.state ?? "—"} />
          <Row label="Phone" value={d.phone ?? "—"} />
          <Row label="Email" value={d.email ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Integrations</CardTitle><CardDescription>OAuth keys live in env vars; see .env.example.</CardDescription></CardHeader>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
