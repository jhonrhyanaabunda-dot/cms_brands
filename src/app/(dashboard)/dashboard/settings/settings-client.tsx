"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDealership } from "@/server/dealership";

export type DealershipForm = {
  name: string;
  legalName: string | null;
  brand: string | null;
  domain: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  primaryColor: string | null;
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  gbpAccountId: string | null;
};

export function SettingsClient({ initial, canEdit }: { initial: DealershipForm; canEdit: boolean }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  function set<K extends keyof DealershipForm>(k: K, val: DealershipForm[K]) {
    setD((c) => ({ ...c, [k]: val }));
    setDirty(true);
  }

  function save() {
    start(async () => {
      const t = toast.loading("Saving…");
      try {
        const data: any = {};
        for (const [k, v] of Object.entries(d)) {
          data[k] = v === "" ? null : v;
        }
        await updateDealership(data);
        toast.success("Saved", { id: t });
        setDirty(false);
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message ?? "Failed", { id: t });
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Dealership profile</CardTitle>
            <CardDescription>Visible on the public microsite + every generated piece of content.</CardDescription>
          </div>
          {canEdit && (
            <Button onClick={save} variant="gradient" disabled={!dirty || pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input value={d.name ?? ""} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Legal name"><Input value={d.legalName ?? ""} onChange={(e) => set("legalName", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="OEM brand"><Input value={d.brand ?? ""} onChange={(e) => set("brand", e.target.value)} disabled={!canEdit} placeholder="BMW / TOYOTA / NISSAN / …" /></Field>
          <Field label="Domain"><Input value={d.domain ?? ""} onChange={(e) => set("domain", e.target.value)} disabled={!canEdit} placeholder="example.com" /></Field>
          <Field label="City"><Input value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="State"><Input value={d.state ?? ""} onChange={(e) => set("state", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="ZIP"><Input value={d.zip ?? ""} onChange={(e) => set("zip", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Phone"><Input value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value)} disabled={!canEdit} placeholder="(555) 555-5555" /></Field>
          <Field label="Email"><Input type="email" value={d.email ?? ""} onChange={(e) => set("email", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Primary color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.primaryColor || "#1DB954"}
                onChange={(e) => set("primaryColor", e.target.value)}
                disabled={!canEdit}
                className="h-9 w-12 rounded border bg-transparent p-0.5 cursor-pointer disabled:opacity-50"
              />
              <Input value={d.primaryColor ?? ""} onChange={(e) => set("primaryColor", e.target.value)} disabled={!canEdit} className="font-mono" placeholder="#1DB954" />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>OAuth keys live in env vars; these IDs identify the property/account once OAuth is configured.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="GSC site URL"><Input value={d.gscSiteUrl ?? ""} onChange={(e) => set("gscSiteUrl", e.target.value)} disabled={!canEdit} placeholder="https://www.example.com/" /></Field>
          <Field label="GA4 property ID"><Input value={d.ga4PropertyId ?? ""} onChange={(e) => set("ga4PropertyId", e.target.value)} disabled={!canEdit} placeholder="123456789" /></Field>
          <div className="sm:col-span-2">
            <Field label="GBP account ID"><Input value={d.gbpAccountId ?? ""} onChange={(e) => set("gbpAccountId", e.target.value)} disabled={!canEdit} /></Field>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
