import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Resolve the SQLite database URL.
 * Local dev: use whatever DATABASE_URL points to (./dev.db).
 * Serverless (Vercel/Lambda): only /tmp is writable, so copy the bundled
 * demo db there on cold start and point Prisma at it. Mutations live for
 * the lifetime of the warm function instance — fine for a demo.
 */
function resolveDbUrl(): string {
  const onServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!onServerless) {
    return process.env.DATABASE_URL ?? "file:./dev.db";
  }
  const dest = "/tmp/dev.db";
  if (!fs.existsSync(dest)) {
    const src = path.join(process.cwd(), "prisma", "dev.db");
    try {
      fs.copyFileSync(src, dest);
    } catch (err) {
      console.error("[db] failed to copy bundled demo SQLite to /tmp:", err);
    }
  }
  return `file:${dest}`;
}

const dbUrl = resolveDbUrl();
// Ensure Prisma's own env lookup picks up the rewritten URL too.
process.env.DATABASE_URL = dbUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
