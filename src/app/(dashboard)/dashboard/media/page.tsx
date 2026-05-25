import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "./media-uploader";
import { Image as ImageIcon } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const tenant = await requireTenant();
  const [folders, assets] = await Promise.all([
    prisma.mediaFolder.findMany({ where: { dealershipId: tenant.dealershipId }, orderBy: { name: "asc" } }),
    prisma.mediaAsset.findMany({ where: { dealershipId: tenant.dealershipId }, orderBy: { createdAt: "desc" }, take: 96 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Media library</h1>
          <p className="text-sm text-muted-foreground">{formatNumber(assets.length)} assets · {folders.length} folders · AI-tagged + CDN-optimized.</p>
        </div>
        <MediaUploader />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {assets.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-10 text-center text-sm text-muted-foreground">No media yet — drop files above.</CardContent></Card>
        )}
        {assets.map((a) => (
          <Card key={a.id} className="overflow-hidden group">
            <div className="aspect-square bg-muted relative">
              {/^image\//.test(a.mimeType) ? (
                <img src={a.url} alt={a.alt ?? ""} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">{a.mimeType}</div>
              )}
              {(() => { try { return (JSON.parse(a.aiTags ?? "[]") as string[]).length > 0; } catch { return false; }})() && (
                <Badge variant="brand" className="absolute top-1 right-1 text-[10px]">AI tagged</Badge>
              )}
            </div>
            <CardContent className="p-2">
              <div className="text-xs truncate" title={a.filename}>{a.filename}</div>
              <div className="text-[10px] text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
