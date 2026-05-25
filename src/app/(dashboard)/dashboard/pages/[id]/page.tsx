import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PageBuilder } from "./builder";

export const metadata = { title: "Page builder" };

export default async function PageBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireTenant();
  const page = await prisma.pageNode.findFirst({ where: { id, dealershipId: tenant.dealershipId } });
  if (!page) notFound();
  return <PageBuilder initial={page as any} />;
}
