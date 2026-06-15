# Deployment Guide

Three managed services: **Supabase** (Postgres + Storage), **Render** (Express API),
**Vercel** (Next.js web).

## 1. Supabase (database + storage)

1. Create a project at https://supabase.com → note the project ref + DB password.
2. **Database URLs** (Project Settings → Database → Connection string):
   - `DATABASE_URL` — the **pooled** (PgBouncer, port `6543`) URL, append
     `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL` — the **direct** (port `5432`) URL. Prisma Migrate uses this.
3. **Storage**: create a **private** bucket named `hrms-files`
   (Storage → New bucket → uncheck "Public"). The API serves files via signed URLs.
4. **Service role key**: Project Settings → API → `service_role` secret →
   `SUPABASE_SERVICE_ROLE_KEY`. Keep this server-only; never ship to the browser.
5. `SUPABASE_URL` = `https://<ref>.supabase.co`.

## 2. Render (Express API)

The repo includes [`api/render.yaml`](../api/render.yaml) (Blueprint). Either use it
or configure manually:

- **Root directory**: `api`
- **Build command**: `npm install && npm run build && npx prisma migrate deploy`
- **Start command**: `npm start`
- **Health check path**: `/health`
- **Environment**: set every variable from [ENVIRONMENT.md](ENVIRONMENT.md) (API section).
  - `DATABASE_URL`, `DIRECT_URL` from Supabase.
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate with
    `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
  - `CORS_ORIGIN` = your Vercel URL (e.g. `https://hrms.vercel.app`).
  - `NODE_ENV=production`, `PORT=10000` (Render injects `PORT`; the app reads it).
- After first deploy, run the seed once (Render Shell): `npm run seed`.

> `prisma migrate deploy` runs pending migrations on each deploy. Generate the
> initial migration locally first: `npx prisma migrate dev --name init` and commit
> `api/src/prisma/migrations/`.

## 3. Vercel (Next.js web)

- **Root directory**: `web`
- **Framework preset**: Next.js (auto-detected)
- **Environment variable**: `NEXT_PUBLIC_API_URL = https://<your-render-service>.onrender.com`
- Deploy. Vercel builds with `next build` automatically.

## 4. Wire CORS + cookies (cross-site)

Frontend (Vercel) and API (Render) are on different domains, so:
- API `CORS_ORIGIN` must equal the exact Vercel origin; `credentials: true` is set.
- The refresh cookie is issued with `SameSite=None; Secure` in production
  (handled in `auth.controller.ts`) so the browser sends it cross-site over HTTPS.

## 5. First-run checklist

1. `npx prisma migrate deploy` succeeded (tables exist).
2. `npm run seed` created roles + the super-admin.
3. `GET https://<api>/health/db` returns `{ db: "up" }`.
4. Log in at the Vercel URL with `superadmin@hrms.local` / `Password123!`.
5. **Immediately** change the super-admin password and create real accounts.

## Local development

```bash
# API
cd api && cp .env.example .env   # fill values
npm install && npx prisma migrate dev && npm run seed && npm run dev

# Web (second terminal)
cd web && cp .env.local.example .env.local
npm install && npm run dev
```
