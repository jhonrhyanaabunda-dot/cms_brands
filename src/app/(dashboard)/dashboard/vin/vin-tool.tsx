"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { generateVinPage } from "@/server/vin";

export function VinTool() {
  const [vin, setVin] = useState("");
  const [pending, start] = useTransition();
  const [decoded, setDecoded] = useState<any | null>(null);
  const router = useRouter();

  function run() {
    if (!vin.trim()) return toast.error("Enter a VIN");
    start(async () => {
      const t = toast.loading("Decoding + generating…");
      try {
        const r = await generateVinPage(vin.trim());
        setDecoded(r.decoded);
        toast.success("Page created", { id: t });
        router.push(`/dashboard/content/${r.contentId}`);
      } catch (e: any) { toast.error(e.message, { id: t }); }
    });
  }

  return (
    <Card><CardContent className="p-6 space-y-4">
      <div className="space-y-2">
        <Label>VIN</Label>
        <Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="e.g. 1HGCM82633A123456" maxLength={17} />
      </div>
      <Button variant="gradient" disabled={pending} onClick={run}><Wand2 /> Decode + generate</Button>

      {decoded && (
        <div className="border rounded-md p-4 text-sm space-y-1">
          <div><span className="text-muted-foreground">Year</span> {decoded.year}</div>
          <div><span className="text-muted-foreground">Make</span> {decoded.make}</div>
          <div><span className="text-muted-foreground">Model</span> {decoded.model}</div>
          <div><span className="text-muted-foreground">Trim</span> {decoded.trim || "—"}</div>
          <div><span className="text-muted-foreground">Body</span> {decoded.bodyStyle || "—"}</div>
          <div><span className="text-muted-foreground">Fuel</span> {decoded.fuelType || "—"}</div>
        </div>
      )}
    </CardContent></Card>
  );
}
