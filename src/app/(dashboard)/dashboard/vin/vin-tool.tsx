"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Wand2, FileText, Car, Loader2 } from "lucide-react";
import { decodeVin, generateVinPage, vinDecodeCreateBoth } from "@/server/vin";

type Decoded = Awaited<ReturnType<typeof decodeVin>>;

export function VinTool() {
  const [vin, setVin] = useState("");
  const [price, setPrice] = useState("");
  const [mileage, setMileage] = useState("");
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onDecode() {
    if (!vin.trim()) return toast.error("Enter a VIN");
    start(async () => {
      const t = toast.loading("Decoding…");
      try {
        const d = await decodeVin(vin.trim());
        setDecoded(d);
        toast.success("Decoded", { id: t });
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  function onGenerateContentOnly() {
    if (!vin.trim()) return toast.error("Enter a VIN");
    start(async () => {
      const t = toast.loading("Generating research page…");
      try {
        const r = await generateVinPage(vin.trim());
        setDecoded(r.decoded as any);
        toast.success("Page created", { id: t });
        router.push(`/dashboard/content/${r.contentId}`);
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  function onCreateBoth() {
    if (!vin.trim()) return toast.error("Enter a VIN");
    start(async () => {
      const t = toast.loading("Decoding + creating inventory + page…");
      try {
        const r = await vinDecodeCreateBoth({
          vin: vin.trim(),
          price: price ? Number(price) : undefined,
          mileage: mileage ? Number(mileage) : undefined,
        });
        setDecoded(r.decoded as any);
        toast.success("Inventory + research page created", { id: t });
        router.push(`/dashboard/content/${r.contentId}`);
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="space-y-2">
          <Label>VIN</Label>
          <Input
            value={vin}
            onChange={(e) => { setVin(e.target.value.toUpperCase()); setDecoded(null); }}
            placeholder="e.g. WBA5A5C50FD520000"
            maxLength={17}
            className="font-mono"
          />
          <div className="text-[10px] text-muted-foreground">17 chars · letters and digits only (no I, O, Q)</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Asking price ($) — optional</Label>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="32000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mileage — optional</Label>
            <Input type="number" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" disabled={pending} onClick={onDecode}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
            Decode only
          </Button>
          <Button variant="outline" disabled={pending} onClick={onGenerateContentOnly}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Decode + research page
          </Button>
          <Button variant="gradient" disabled={pending} onClick={onCreateBoth}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
            Decode + inventory + research page
          </Button>
        </div>

        {decoded && (
          <div className="border rounded-md p-4 text-sm grid grid-cols-2 gap-2">
            <Field label="Year"         value={decoded.year ?? "—"} />
            <Field label="Make"         value={decoded.make || "—"} />
            <Field label="Model"        value={decoded.model || "—"} />
            <Field label="Trim"         value={decoded.trim || "—"} />
            <Field label="Body"         value={decoded.bodyStyle || "—"} />
            <Field label="Fuel"         value={decoded.fuelType || "—"} />
            <Field label="Transmission" value={decoded.transmission || "—"} />
            <Field label="Drivetrain"   value={decoded.drivetrain || "—"} />
            <div className="col-span-2"><Field label="Engine" value={decoded.engine || "—"} /></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
