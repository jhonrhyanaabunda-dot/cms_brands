import { VinTool } from "./vin-tool";

export const metadata = { title: "VIN tools" };

export default function VinPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">VIN content generator</h1>
        <p className="text-sm text-muted-foreground">Paste any 17-digit VIN to decode (via NHTSA) and auto-generate a model research page.</p>
      </div>
      <VinTool />
    </div>
  );
}
