# HR Management System

A production-ready, full-stack Human Resources Management System built with a
**separated Web + API architecture**.

- **`web/`** — Next.js 14 (App Router) + React 18 + TypeScript + Tailwind + ShadCN UI
- **`api/`** — Node.js + Express + TypeScript + Prisma ORM (REST)
- **Database** — Supabase PostgreSQL
- **Storage** — Supabase Storage
- **Auth** — Custom JWT (access + refresh) with Role-Based Access Control

> The frontend **never** touches the database directly. All data access goes
> through the Express API.

## Modules

1. Authentication & RBAC
2. Employee Management
3. Employee Profiling & Background Management
4. DTR & Attendance Management
5. Leave Management
6. Appointment Booking
7. Payroll
8. Dashboard
9. Notifications
10. Reports
11. Audit Logs

## Quick start

```bash
# 1. API
cd api
cp .env.example .env          # fill in Supabase + JWT secrets
npm install
npx prisma generate
npx prisma migrate deploy     # or: npx prisma migrate dev
npm run seed
npm run dev                   # http://localhost:4000

# 2. Web
cd ../web
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

Default seeded super-admin: `superadmin@hrms.local` / `Password123!`
(change immediately in any real environment).

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, ERD, RBAC matrix, auth flow |
| [docs/API.md](docs/API.md) | Full REST endpoint catalogue |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Sprint breakdown, risks, implementation plan |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Render + Supabase deployment guide |
| [docs/TESTING.md](docs/TESTING.md) | QA checklist & production readiness checklist |
