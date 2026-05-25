# A3 CMS

**An AI-powered, multi-tenant dealership content platform — built to replace WordPress.**

A3 CMS is a production-ready Next.js 15 application designed as the operating system for A3 Brands' dealership marketing operations. Built from scratch in TypeScript, not based on WordPress, not a plugin, no PHP.

---

## ✨ What's inside

| Domain | What ships |
| ------ | ---------- |
| **Multi-tenancy** | Dealership workspaces, super-admin context, tenant cookie + switcher, full data isolation via Prisma queries |
| **Auth + RBAC** | NextAuth v5 (Auth.js) with Prisma adapter, credentials + optional Google OAuth, 6 roles with fine-grained permissions |
| **CMS workflow** | Draft → Review → Approved → Scheduled → Published, with revision history, rollback, and team comments |
| **AI Studio** | Blog, landing page, GBP post, and **bulk city page** generators backed by the OpenAI API (falls back to deterministic mock content when no key is set) |
| **Visual page builder** | 12-block library, mobile/tablet/desktop preview, drag/move/delete, inspector panel, live JSON-LD injection |
| **SEO system** | Live SEO score engine, sitemap-per-tenant, robots.txt, redirects, schema generator, programmatic city pages, duplicate detection |
| **Media library** | Drag-and-drop upload, AI alt-text + tagging, folder structure (UploadThing/S3 swap-in ready) |
| **Review center** | Review syncing, AI reply drafting, sentiment + escalation, approval flow |
| **Google integrations** | GSC, GA4, GBP, PageSpeed wrappers (real PageSpeed; mocks for the rest until OAuth creds added) |
| **Analytics dashboard** | Charts, top queries, top pages, GBP insights, Lighthouse scores |
| **Automotive** | VIN decoder (NHTSA vPIC, free, real), AI-generated model research pages, inventory, lease offer builder |
| **Scheduler** | 14-day editorial calendar, scheduled publishing |
| **Microsite generator** | `/site/<dealership-slug>` renders the active home page + content + custom paths, with SEO metadata and JSON-LD |
| **Audit log** | All actions written to `Activity` table, surfaced in dashboard |

> See the **Status Matrix** below for what's fully wired vs scaffolded.

---

## 🚀 Quick start

```bash
# 1. Install deps
npm install

# 2. Set up env
cp .env.example .env
# edit DATABASE_URL + AUTH_SECRET (openssl rand -base64 32)
# OPENAI_API_KEY is optional — without it the AI features run in deterministic mock mode

# 3. Create the DB schema
npx prisma db push

# 4. Seed demo data
npm run db:seed

# 5. Run
npm run dev
```

App runs at **http://localhost:3000**

### Demo accounts (all use password `password123`)

| Email | Role |
| ----- | ---- |
| `admin@a3brands.com` | Super Admin (sees all 4 demo dealerships) |
| `seo@a3brands.com` | SEO Manager |
| `content@a3brands.com` | Content Manager |
| `gm@horizonbmw.com` | Dealer Client (Horizon BMW only) |

### Demo dealerships

- Horizon BMW (Atlanta, GA)
- Summit Mercedes-Benz (Marietta, GA)
- Pioneer Toyota (Decatur, GA)
- Alpine Ford & Lincoln (Smyrna, GA)

Each comes pre-seeded with: a home page (built with the block builder), a published service blog, a city lease-offers page, a GBP post, sample inventory, and active offers.

### Live microsite preview

Once seeded, browse to:
- `http://localhost:3000/site/horizon-bmw` — public dealership microsite
- `http://localhost:3000/sitemap-horizon-bmw.xml` — auto-generated sitemap
- `http://localhost:3000/robots.txt` — auto-generated robots with all tenant sitemaps

---

## 🧱 Architecture

```
/src
  /app
    /(auth)            ← login + future register
    /(dashboard)       ← authenticated app
      /dashboard       ← overview, content, AI, pages, SEO, media, reviews,
                         analytics, inventory, offers, VIN, scheduler, team, settings
    /api
      /auth/[...nextauth]
      /tenant/switch
    /preview           ← in-editor preview for drafts
    /site/[slug]       ← public dealership microsites (SSR + SEO)
    /sitemap-[slug].xml
    /robots.txt
  /components
    /ui                ← Radix-based primitives (Button, Card, Dialog, etc.)
    /dashboard         ← sidebar, topbar, charts
    /blocks            ← block renderer for the page builder
  /lib
    auth.ts, db.ts, tenant.ts, rbac.ts
    openai.ts          ← OpenAI client + mock fallback
    google.ts          ← GSC/GA4/GBP/PageSpeed wrappers
    seo.ts             ← SEO scoring + duplicate detection
    blocks.ts          ← page builder block schema
  /server              ← server actions (CMS, AI, pages, media, seo, reviews, vin)
/prisma
  schema.prisma        ← full multi-tenant schema (20+ models)
  seed.ts              ← demo data
```

Server actions handle all mutations; queries use Prisma directly from server components. Tenant isolation is enforced at the query level — every server action calls `requireTenant()` and scopes by `dealershipId`.

---

## 🔐 RBAC matrix (from `src/lib/rbac.ts`)

| Permission | Super Admin | Admin | SEO Mgr | Content Mgr | Dealer Client | Viewer |
| ---------- | :--: | :--: | :--: | :--: | :--: | :--: |
| content.read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| content.create | ✓ | ✓ | ✓ | ✓ | | |
| content.publish | ✓ | ✓ | ✓ | | | |
| content.approve | ✓ | ✓ | | | ✓ | |
| content.delete | ✓ | ✓ | | | | |
| ai.use | ✓ | ✓ | ✓ | ✓ | | |
| seo.manage | ✓ | ✓ | ✓ | | | |
| reviews.reply | ✓ | ✓ | | | | |
| team.manage | ✓ | ✓ | | | | |

---

## 📦 Deployment (Vercel)

```bash
# 1. Push to GitHub
# 2. Import into Vercel
# 3. Add all env vars from .env.example
# 4. Add a Postgres database (Vercel Postgres, Neon, Supabase, etc.)
# 5. Deploy — `prisma generate` runs automatically via postinstall
```

After first deploy:
```bash
# Run migrations against prod DB
DATABASE_URL=<prod-url> npx prisma db push

# (optional) seed
DATABASE_URL=<prod-url> npm run db:seed
```

The middleware (`src/middleware.ts`) protects `/dashboard/*` and leaves `/site/*`, `/sitemap*`, `/robots.txt` publicly cacheable.

---

## ✅ Status matrix — what's real, what's scaffolded

| Feature | Status | Notes |
| ------- | :----: | ----- |
| Multi-tenant data model | **✅ Full** | Every model has `dealershipId`; queries scoped via `requireTenant()`. |
| NextAuth credentials | **✅ Full** | Sign in / sign out / JWT session / RBAC. |
| Google OAuth | 🟡 Scaffold | Add `AUTH_GOOGLE_ID`/`SECRET` to env — provider auto-enables. |
| Content workflow + versioning | **✅ Full** | Status transitions, revisions, rollback, comments. |
| AI content generation | **✅ Full** | Real OpenAI integration with JSON-mode; deterministic mock when no key. |
| AI QA / hallucination check | **✅ Full** | LLM-powered, returns flags + suggestions. |
| Bulk city page generator | **✅ Full** | Loops through cities, creates content rows. |
| Visual page builder | **✅ Functional** | Click-to-add, move/delete, inspector, mobile/tablet/desktop preview, JSON-LD on FAQ blocks. (Drag-and-drop reorder is up/down buttons; swap in `@dnd-kit` to upgrade.) |
| SEO scoring | **✅ Full** | 13-check live engine, A–F grading. |
| Sitemap + robots | **✅ Full** | Generated from real DB content per tenant. |
| Redirects | **✅ Full** | Managed in UI, enforced in `/site/[slug]/[...path]`. |
| Media uploads | **✅ Functional** | Demo writes data-URLs to DB so it works without object storage. Swap `attachMediaAsset`'s `url` with UploadThing/S3 presigned URL output for prod. |
| AI image tagging | **✅ Full** | Runs on upload via OpenAI. |
| Reviews (sync + reply) | **✅ Functional** | Sync uses mock data — replace `syncReviews()` body with GBP API call. AI reply + approval flow is fully real. |
| Google Search Console / GA4 / GBP | 🟡 Scaffold | Wrappers in `src/lib/google.ts` return deterministic mocks; swap in `googleapis` SDK calls when OAuth creds added. |
| PageSpeed Insights | **✅ Full** | Real Google API when `PAGESPEED_API_KEY` set. |
| VIN decoder | **✅ Full** | Uses NHTSA vPIC (free, no key) + GPT page generation. |
| Inventory + offers | **✅ DB-backed** | Read UI complete; CRUD UI is a v0.2 add-on. |
| Scheduler / calendar | **✅ Full** | Visual 14-day calendar reading from `scheduledAt`. Cron job to auto-publish on schedule is a Vercel Cron / pg_cron addition (not included). |
| Microsite generator | **✅ Full** | Renders home, custom pages, blog slugs, redirects, JSON-LD, OG. |
| Audit log | **✅ Full** | Every mutation writes an `Activity` row. |
| Backups | 🟡 Recommend | Use your DB provider's PITR (Vercel Postgres / Neon / Supabase). |
| Rate limiting | 🟡 Recommend | Add `@upstash/ratelimit` middleware for AI endpoints in production. |

---

## 🛠 Extending

- **Drag-and-drop reorder** → swap the up/down buttons in `builder.tsx` for `@dnd-kit/sortable`.
- **Real GBP review sync** → replace `syncReviews()` in `src/server/reviews.ts` with `mybusinessbusinessinformation` + `mybusinessreviews` API calls.
- **Custom OEM themes** → seed `Theme` rows and apply in the microsite header/footer.
- **Webhooks / OEM compliance** → add a `Webhook` model and HMAC-signed POSTs from key transitions.
- **Background jobs** → add a Vercel Cron route at `/api/cron/publish` that selects `Content` where `scheduledAt <= now()` and `status = SCHEDULED`, flips to `PUBLISHED`.

---

## 📝 License

Proprietary — © A3 Brands.
