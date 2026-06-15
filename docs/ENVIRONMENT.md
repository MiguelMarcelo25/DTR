# Environment Variable Guide

## API (`api/.env`)

| Variable | Required | Example / Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Supabase **pooled** URL (port 6543) + `?pgbouncer=true&connection_limit=1`. Used at runtime. |
| `DIRECT_URL` | ✅ | Supabase **direct** URL (port 5432). Used by Prisma Migrate. |
| `JWT_ACCESS_SECRET` | ✅ | ≥16 chars random. Signs short-lived access tokens. |
| `JWT_REFRESH_SECRET` | ✅ | ≥16 chars random, **different** from access secret. |
| `JWT_ACCESS_EXPIRES_IN` | — | Default `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | — | Default `7d`. |
| `SUPABASE_URL` | for uploads | `https://<ref>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | for uploads | Server-only secret. Never expose to the browser. |
| `SUPABASE_STORAGE_BUCKET` | — | Default `hrms-files` (create as a **private** bucket). |
| `NODE_ENV` | — | `development` \| `production` \| `test`. |
| `PORT` | — | Default `4000` (Render sets its own). |
| `CORS_ORIGIN` | ✅ (prod) | Exact web origin, e.g. `https://hrms.vercel.app`. Comma-separate for multiple. |
| `REFRESH_COOKIE_NAME` | — | Default `hrms_rt`. |
| `COOKIE_DOMAIN` | — | Leave empty unless using a shared parent domain. |

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Web (`web/.env.local`)

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | ✅ | Base URL of the API, no trailing slash. The client appends `/api`. |

> Only `NEXT_PUBLIC_*` vars reach the browser. Never put secrets (DB URL, service
> role key, JWT secrets) in the web app — they belong to the API only.

## Security notes

- The access token lives in browser memory only (not localStorage).
- The refresh token is an `httpOnly`, `Secure`, `SameSite=None` (prod) cookie
  scoped to `/api/auth` — not readable by JS.
- Rotate JWT secrets if you suspect compromise (this invalidates all sessions).
