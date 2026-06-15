# QA Testing Checklist & Production Readiness

## Test accounts (seeded)

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | superadmin@hrms.local | Password123! |
| Admin | admin@hrms.local | Password123! |
| HR | hr@hrms.local | Password123! |
| Employee | employee@hrms.local | Password123! |

## Functional test checklist

### Authentication & RBAC
- [ ] Login succeeds with valid credentials; fails with wrong password.
- [ ] Deactivated user cannot log in (`ACCOUNT_DISABLED`).
- [ ] Access token expiry triggers silent refresh (no visible logout).
- [ ] Logout revokes the refresh token (subsequent refresh fails).
- [ ] Forgot/reset password flow updates the password and revokes sessions.
- [ ] Change password requires the correct current password.
- [ ] Employee cannot reach privileged routes (403).

### Employee management
- [ ] Create employee (optionally with linked user account + role).
- [ ] Directory search/filter/sort/pagination works.
- [ ] Update, deactivate, archive, soft-delete.
- [ ] Export masterlist (CSV downloads).

### Profile & background
- [ ] View own profile; sensitive gov/bank fields hidden from employees.
- [ ] HR/Admin can view + edit sensitive fields; access is audited.
- [ ] CRUD on each sub-resource (contacts, dependents, education, work, skills, trainings).
- [ ] Document upload (type/size validated) → stored in Supabase, metadata saved, audited.
- [ ] Medical/disciplinary records restricted to privileged; access audited.
- [ ] Profile-update request: employee submits → HR approves/rejects → applied + notified.

### Attendance & DTR
- [ ] Time in/out, break in/out; double time-in blocked.
- [ ] Late + undertime + worked minutes computed vs schedule.
- [ ] Monthly DTR + summary correct.
- [ ] Correction request → approve updates attendance + audited + notified.

### Leave
- [ ] Submit request; overlapping approved leave blocked.
- [ ] Approve deducts balance (paid types only); reject does not.
- [ ] Cancel of approved restores balance.
- [ ] Balance adjust (privileged) works.

### Appointments
- [ ] Book; double-booking / over-capacity blocked.
- [ ] Approve/reject/complete/reschedule (history retained) /cancel.
- [ ] Calendar view returns correct range.

### Payroll
- [ ] Process creates payrolls for active employees using attendance + leave.
- [ ] Late/undertime/absence/overtime/leave deductions correct (unit-test `computePayroll`).
- [ ] Recalculate updates figures; release sets status + notifies; payslip PDF downloads.
- [ ] Employee sees only own payslips.

### Dashboard / Notifications / Reports / Audit
- [ ] Role-appropriate dashboard loads with correct counts/charts.
- [ ] Notifications list, mark-read, mark-all-read, delete (own only).
- [ ] Each report returns data; CSV/PDF export works; filters applied.
- [ ] Audit log lists sensitive actions with old/new values; filterable.

### Cross-cutting
- [ ] Every list paginates and caps `limit`.
- [ ] Validation errors return 422 with field errors.
- [ ] Unknown route → 404 envelope; server error → 500 envelope (no stack in prod).
- [ ] Rate limiting blocks auth brute force.

### Unit tests
```bash
cd api && npm test    # includes payroll calculator tests
```

## Production readiness checklist

- [ ] All env vars set on Render + Vercel (see ENVIRONMENT.md); no secrets in the web app.
- [ ] `prisma migrate deploy` run; schema matches; indexes present.
- [ ] Seed run once; **super-admin password changed**; demo accounts removed/disabled.
- [ ] Supabase bucket is **private**; files served via signed URLs only.
- [ ] CORS locked to the production web origin; `credentials: true`.
- [ ] Helmet + rate limiting enabled; `trust proxy` set.
- [ ] Refresh cookie `httpOnly` + `Secure` + `SameSite=None` in prod.
- [ ] HTTPS enforced on both services.
- [ ] `GET /health/db` green; logging/alerting configured (Render logs).
- [ ] `npm run typecheck` passes in both `api` and `web`; `npm run build` succeeds.
- [ ] Lighthouse ≥ 90 on key pages; images optimized; code-split routes.
- [ ] Backups enabled on Supabase; secrets rotated from defaults.
- [ ] Audit logging verified for: login, sensitive views, gov/bank edits, payroll, role changes.
```
