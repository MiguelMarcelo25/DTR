# Development Roadmap

## Sprint breakdown

| Sprint | Theme | Deliverables |
| ------ | ----- | ------------ |
| **S0** | Planning & foundation | Architecture, ERD, Prisma schema, API scaffold, error/response/audit/JWT utils |
| **S1** | Auth & RBAC | Login/logout/refresh/forgot/reset/change-password, `authenticate`, `authorize`, `/auth/me`, audit on auth events |
| **S2** | DB & seed | Migrations, indexes, seed (roles, super-admin, departments, positions, schedules, leave types, sample employees) |
| **S3** | Employee mgmt | Employee CRUD, deactivate/archive, directory search/filter/paginate, masterlist export |
| **S4** | Profiling & background | Profile + 13 sub-resources, documents (Supabase Storage), profile-update approval workflow, activity timeline |
| **S5** | DTR & attendance | time/break in-out, history, monthly DTR, summary, corrections workflow, reports/export |
| **S6** | Leave | leave types, requests, approve/reject/cancel, balances (deduction rules), overlap prevention, reports |
| **S7** | Appointments | slots, booking, reschedule/cancel/approve/reject/complete, calendar, double-booking prevention, history |
| **S8** | Payroll | periods, computation engine, payslip PDF, recalc/release/cancel, payroll reports |
| **S9** | Dashboard / Notifications / Reports / Audit | role dashboards, in-app notifications, report exports (PDF/CSV), audit log browse |
| **S10** | Frontend foundation | Next.js, Tailwind, ShadCN, layouts, protected routes, api client, TanStack Query, RHF/Zod |
| **S11** | Frontend pages | all route groups wired to API, role-based UI rendering |
| **S12** | QA & deploy | testing checklist, Vercel + Render + Supabase deploy, production readiness review |

## Implementation order (matches spec phases 1–12)

Planning → Backend foundation → DB/seed → Employee/Profile → Attendance →
Leave → Appointments → Payroll → Frontend foundation → Frontend pages →
Integration → QA & deployment.

## Risk register

| # | Risk | Likelihood | Impact | Mitigation |
| - | ---- | ---------- | ------ | ---------- |
| 1 | Sensitive data leakage (salary/bank/gov/medical) | Med | High | Service-layer field redaction + RBAC route guards + audit on access; never `select *` to client |
| 2 | Payroll computation correctness | Med | High | Pure, unit-tested calculator module; deterministic period inputs; recalc + draft states before release |
| 3 | Token/session compromise | Low | High | Short access TTL, httpOnly refresh cookie, rotation + revocation, rate-limited auth routes |
| 4 | Refresh-token rotation race / multi-tab | Med | Med | Single in-flight refresh promise in axios interceptor; server tolerates current+previous token grace |
| 5 | N+1 queries / slow lists | Med | Med | Prisma `select`/`include` scoping, indexes, pagination everywhere |
| 6 | Inconsistent API contract across modules | High | Med | Shared response envelope + reference module + Zod-first; parallel agents copy the pattern |
| 7 | File upload abuse | Low | Med | MIME + size validation, private buckets, signed URLs, audit logging |
| 8 | Migration drift Supabase ↔ Prisma | Med | Med | `DIRECT_URL` for migrations, `migrate deploy` in CI, never edit DB by hand |
| 9 | Overlapping leave / double-booking | Med | Med | Transactional checks + DB unique/constraint where possible |
| 10 | Scope creep (large surface) | High | Med | Vertical slices, phase gates, definition-of-done = tested |

## Definition of done (per module)

Authentication ✔ · Authorization ✔ · Zod validation ✔ · Error handling ✔ ·
Clean response shape ✔ · Audit logging on sensitive actions ✔ · Pagination ✔ ·
Search/filter where applicable ✔ · Sensitive-field redaction ✔ · Tested ✔
