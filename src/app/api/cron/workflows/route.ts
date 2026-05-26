import { NextResponse } from "next/server";
import { runDueWorkflows } from "@/server/workflows";

export const dynamic = "force-dynamic";

/**
 * Vercel cron handler. Iterates every enabled, schedule-triggered workflow
 * whose nextRunAt has passed and executes it. Protected by CRON_SECRET so
 * a public hit can't trigger workflows arbitrarily.
 *
 * Vercel's scheduled jobs send a `Authorization: Bearer <CRON_SECRET>` header
 * automatically when the env var is set; we also accept it as a query
 * parameter for manual testing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
    if (provided !== secret) return new NextResponse("forbidden", { status: 403 });
  }

  try {
    const result = await runDueWorkflows();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
