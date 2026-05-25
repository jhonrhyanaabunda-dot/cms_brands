/**
 * Runs once per server start. On Vercel/Lambda, the bundled SQLite ships
 * read-only with the function, so copy it into /tmp/ (the only writable
 * filesystem) and rewrite DATABASE_URL before Prisma client init.
 *
 * We use eval('require') to hide the Node built-ins from webpack's static
 * analyzer — Next 15 compiles instrumentation for both Edge and Node
 * runtimes, and Edge would otherwise fail to bundle fs/path.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) return;

  const req = eval("require") as NodeJS.Require;
  const fs = req("fs") as typeof import("fs");
  const path = req("path") as typeof import("path");

  const dest = "/tmp/dev.db";
  if (!fs.existsSync(dest)) {
    const src = path.join(process.cwd(), "prisma", "dev.db");
    try {
      fs.copyFileSync(src, dest);
      console.log("[instrumentation] copied demo SQLite to /tmp/dev.db");
    } catch (err) {
      console.error("[instrumentation] failed to copy demo SQLite:", err);
    }
  }

  process.env.DATABASE_URL = `file:${dest}`;
}
