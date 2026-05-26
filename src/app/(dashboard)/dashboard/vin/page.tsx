import { VinTool } from "./vin-tool";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata = { title: "VIN tools" };

export default function VinPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        icon={Receipt}
        title="VIN content generator"
        description="Paste any 17-digit VIN to decode (via NHTSA) and auto-generate a model research page."
      />
      <VinTool />
    </div>
  );
}
