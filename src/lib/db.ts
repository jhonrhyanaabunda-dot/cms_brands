import { PrismaClient } from "@prisma/client";

// On serverless (Vercel/Lambda), src/instrumentation.ts copies the bundled
// demo SQLite to /tmp/dev.db and rewrites DATABASE_URL before this module
// is imported. In local dev DATABASE_URL is read from .env. Either way,
// PrismaClient picks up the env at construction time below.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
