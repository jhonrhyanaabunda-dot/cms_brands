import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setActiveTenant } from "@/lib/tenant";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  if (!session.user.isSuperAdmin) {
    const m = await prisma.membership.findFirst({ where: { userId: session.user.id, dealershipId: id } });
    if (!m) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  await setActiveTenant(id);
  return NextResponse.json({ ok: true });
}
