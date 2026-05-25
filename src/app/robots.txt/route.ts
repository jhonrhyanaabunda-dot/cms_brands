import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const dealers = await prisma.dealership.findMany({ where: { status: "ACTIVE" } });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /dashboard/",
    ...dealers.map((d) => `Sitemap: ${base}/sitemap/${d.slug}`),
  ].join("\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/plain" } });
}
