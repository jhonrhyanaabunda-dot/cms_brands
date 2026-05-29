# Production checklist

This app ships as a working demo against bundled SQLite + mock integrations. Here's what to wire up before pointing it at a real dealership.

## 1. Database — swap SQLite → Postgres

The demo `prisma/dev.db` is committed and copied to `/tmp` on Vercel cold start (see `src/instrumentation.ts`). For production:

```bash
# 1. Update .env
DATABASE_URL="postgresql://user:pass@host:5432/a3cms?schema=public"

# 2. Use the Postgres-flavored schema (or just change provider in schema.prisma)
cp prisma/schema.postgres.prisma prisma/schema.prisma

# 3. Migrate
npx prisma migrate deploy

# 4. Seed (optional — uses the same seed.ts that builds the demo data)
npx tsx prisma/seed.ts
```

No app-code changes needed. Every place that stores arrays/objects already goes through `lib/utils.parseJson` / `stringifyJson`, so the SQLite TEXT-encoded JSON and a Postgres native JSON column round-trip identically.

## 2. Auth — Google OAuth

The credentials provider works out of the box for demo. To enable Google OAuth:

```bash
# .env
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

The login page shows a "Continue with Google" button when `AUTH_GOOGLE_ID` is set. Provider wiring is already in `src/lib/auth.ts`.

## 3. AI — Gemini or OpenAI

Provider is chosen at runtime in `src/lib/openai.ts`. First env var wins:

```bash
# .env — pick one
GOOGLE_GENERATIVE_AI_API_KEY="..."   # free tier on AI Studio
GEMINI_MODEL="gemini-flash-latest"

OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

Without either, the app falls back to deterministic mocks so demos always work.

## 4. Media uploads — UploadThing or S3

Currently `MediaUploader` accepts file metadata via the `attachMediaAsset` server action — there's no built-in upload transport. To wire UploadThing:

```bash
npm i uploadthing @uploadthing/react
# .env
UPLOADTHING_TOKEN="..."
```

Then create `src/app/api/uploadthing/route.ts` per UploadThing's Next.js guide and replace the URL-paste fallback in `media-uploader.tsx` with the UploadDropzone component. The schema is ready — `MediaAsset.url`, `width`, `height`, `size` all exist.

## 5. Google integrations (GSC, GA4, GBP)

`src/lib/google.ts` currently returns stub data. To wire real APIs:

```bash
# .env
GOOGLE_CLIENT_ID=""        # OAuth installed app or service account
GOOGLE_CLIENT_SECRET=""
GOOGLE_REFRESH_TOKEN=""    # for a service-style integration
```

Replace the stubbed functions in `lib/google.ts` with real `googleapis` calls. Each dealership's `gscSiteUrl` / `ga4PropertyId` / `gbpAccountId` (already on the `Dealership` model and editable in Settings) selects the right property.

## 6. Error tracking

Every server action and the dashboard error boundary go through `src/lib/observability.ts::captureError`. Today it `console.error`s. To plug in Sentry:

```bash
npm i @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
# .env
NEXT_PUBLIC_SENTRY_DSN="..."
```

Then update the body of `captureError`:

```ts
import * as Sentry from "@sentry/nextjs";
export function captureError(error, context) {
  Sentry.captureException(error, { extra: context });
}
```

Done — no callsite changes needed.

## 7. Cron + workflows

Vercel cron is declared in `vercel.json`. Hobby plan only allows daily crons — the current schedule is `0 6 * * *`. On Pro you can increase to `*/15 * * * *` for faster workflow firing. Set `CRON_SECRET` in env to lock the `/api/cron/workflows` endpoint:

```bash
# .env
CRON_SECRET="$(openssl rand -base64 32)"
```

## 8. CORS / CSP / security headers

For real dealership traffic, add a `headers()` function to `next.config.mjs` enforcing `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and a content security policy that allows Google APIs + analytics scripts where used.

## 9. Image optimization

Inventory + offers cards use `<img>` for compatibility. Swap to `next/image` for built-in CDN optimization + lazy-loading + automatic responsive sizes. Adjust `next.config.mjs::images.remotePatterns` to whitelist your CDN domains (already set to allow `https://**`).

## 10. Performance budget

`productionBrowserSourceMaps` is on for debug ergonomics. For tightest production bundles, set it to `false` before final deploy. Run `npm run build` and check the route sizes printed at the end — keep dashboard routes under ~200 KB First Load JS.
