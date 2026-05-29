/**
 * Single chokepoint for capturing runtime errors. Today this routes to
 * `console.error` so the dev console and Vercel function logs still see
 * everything. To plug in Sentry / Bugsnag / Datadog later, swap the body
 * of `captureError` — no callsite changes required.
 *
 * Example Sentry wire-up (uncomment + set NEXT_PUBLIC_SENTRY_DSN):
 *
 *   import * as Sentry from "@sentry/nextjs";
 *   Sentry.captureException(error, { extra: context });
 */

export type ErrorContext = Record<string, unknown>;

export function captureError(error: unknown, context?: ErrorContext): void {
  const e = error instanceof Error ? error : new Error(String(error));
  // eslint-disable-next-line no-console
  console.error("[captureError]", e.message, { stack: e.stack, ...context });
}

/**
 * Wrap a server action / route handler with consistent error logging.
 * Re-throws so Next.js still surfaces the error to its error.tsx boundary
 * (or returns 500 from an API route).
 */
export async function withErrorLogging<T>(
  label: string,
  fn: () => Promise<T>,
  context?: ErrorContext,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    captureError(e, { label, ...context });
    throw e;
  }
}
