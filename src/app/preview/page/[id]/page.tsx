import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { BlockRenderer } from "@/components/blocks/block-renderer";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireTenant();
  const page = await prisma.pageNode.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!page) notFound();
  const blocks = JSON.parse((page.blocks as unknown as string) ?? "[]") as any[];
  return (
    <main className="max-w-6xl mx-auto">
      <div className="mx-6 mt-4 text-xs text-amber-500 border border-amber-500/50 bg-amber-500/10 rounded px-3 py-2 inline-block">
        Preview · {page.published ? "published" : "draft"}
      </div>
      {blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}
    </main>
  );
}
