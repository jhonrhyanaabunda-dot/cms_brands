import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { MediaUploader } from "./media-uploader";
import { Image as ImageIcon } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { MediaGrid, type Asset } from "./media-grid";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const tenant = await requireTenant();
  const [folders, assets] = await Promise.all([
    prisma.mediaFolder.findMany({ where: { dealershipId: tenant.dealershipId }, orderBy: { name: "asc" } }),
    prisma.mediaAsset.findMany({ where: { dealershipId: tenant.dealershipId }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  const rows: Asset[] = assets.map((a) => ({
    id: a.id, url: a.url, filename: a.filename, mimeType: a.mimeType, size: a.size,
    width: a.width, height: a.height, alt: a.alt, aiTags: a.aiTags,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ImageIcon}
        title="Media library"
        description={`${formatNumber(assets.length)} assets · ${folders.length} folders · search, tag, edit metadata.`}
        actions={<MediaUploader />}
      />
      <MediaGrid initial={rows} />
    </div>
  );
}
