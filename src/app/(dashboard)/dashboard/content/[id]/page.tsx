import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { ContentEditor } from "./editor";

export const metadata = { title: "Edit content" };

export default async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireTenant();
  const content = await prisma.content.findFirst({
    where: { id, dealershipId: tenant.dealershipId },
    include: {
      author: true,
      revisions: { orderBy: { createdAt: "desc" }, take: 10 },
      comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
    },
  });
  if (!content) notFound();

  return <ContentEditor initial={content as any} role={tenant.role} />;
}
