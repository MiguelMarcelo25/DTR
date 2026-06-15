# API Reference

Base URL: `<API_URL>/api`. All responses use the envelope:

```json
{ "success": true, "message": "OK", "data": <T>, "meta": { /* lists only */ } }
```
Errors: `{ "success": false, "code": "STRING_CODE", "message": "...", "errors"?: {...} }`

Auth: send `Authorization: Bearer <accessToken>`. List endpoints accept
`?page=&limit=&sort=&order=&search=` plus per-module filters.

Legend — roles that may call: **SA** Super Admin · **A** Admin · **HR** · **E** Employee (self-scoped).

## Auth
| Method | Path | Roles |
| --- | --- | --- |
| POST | `/auth/login` | public |
| POST | `/auth/refresh-token` | cookie |
| POST | `/auth/logout` | any |
| POST | `/auth/forgot-password` | public |
| POST | `/auth/reset-password` | public |
| POST | `/auth/change-password` | any auth |
| GET | `/auth/me` | any auth |

## Employees
`GET /employees` · `POST /employees` · `GET/PUT/DELETE /employees/:id` ·
`PUT /employees/:id/deactivate` · `PUT /employees/:id/archive` ·
`GET /employees/export/masterlist` — **SA/A/HR** (GET :id also self).

## Profile & background (mounted under `/employees`)
- `GET/PUT /employees/:id/profile`, `POST /employees/:id/profile/photo`
- `GET /employees/:id/activity-timeline`
- CRUD `…/emergency-contacts`, `…/dependents`, `…/education`, `…/work-experience`,
  `…/skills`, `…/trainings`, `…/documents`, `…/medical-records`,
  `…/disciplinary-records`, `…/performance-notes`
- `GET/POST /profile-update-requests`, `GET /profile-update-requests/:id`,
  `PUT …/:id/approve|reject|cancel`

Reads: self or **SA/A/HR**. Writes: **SA/A/HR** (employees may upload own documents
and submit update-requests). Medical/disciplinary/performance: **SA/A/HR** only (audited).

## Attendance & DTR — `/attendance`
`POST /time-in|time-out|break-in|break-out` (**E** self) ·
`GET /` `GET /logs` (**SA/A/HR**) · `GET /history` · `GET /monthly-dtr` · `GET /summary` ·
`POST /corrections` (**E**) · `GET /corrections` · `PUT /corrections/:id/approve|reject` (**SA/A/HR**) ·
`GET /reports`, `GET /reports/export` (**SA/A/HR**).

## Leave — `/leave`
`GET /types` · `POST/PUT/DELETE /types[/:id]` (**SA/A/HR**) ·
`GET /requests` · `POST /requests` (**E**) · `GET /requests/:id` ·
`PUT /requests/:id/cancel` (owner) · `PUT /requests/:id/approve|reject` (**SA/A/HR**) ·
`GET /balances`, `GET /balances/:employeeId`, `PUT /balances/:employeeId` (**SA/A/HR**) ·
`GET /reports`, `/reports/export`.

## Appointments — `/appointments`, `/appointment-slots`
Slots: `GET /appointment-slots` · `POST/PUT/DELETE` (**SA/A/HR**).
Appointments: `GET /` · `POST /` (**E**) · `GET /calendar` · `GET /reports` ·
`GET /:id` · `PUT /:id/reschedule|cancel` (owner/priv) ·
`PUT /:id/approve|reject|complete` (**SA/A/HR**).

## Payroll — `/payroll`, `/payslips`
`GET /payroll` · `POST /payroll/process` · `GET /payroll/:id` ·
`PUT /payroll/:id/recalculate|release|cancel` · `GET /payroll/:id/payslips` ·
`GET /payroll/reports`, `/reports/export` — **SA/A**.
Payslips: `GET /payslips`, `GET /payslips/:id`, `GET /payslips/:id/download` (owner/priv).

## Dashboard — `/dashboard`
`GET /employee` (self) · `GET /admin` (**SA/A**) · `GET /hr` (**SA/A/HR**).

## Notifications — `/notifications` (self-scoped)
`GET /` · `PUT /:id/read` · `PUT /read-all` · `DELETE /:id`.

## Reports — `/reports` (**SA/A/HR**)
`GET /attendance|dtr|late|undertime|absences|leave|appointments|payroll|employees|employee-background`
· `GET /export?type=&format=csv|pdf`.

## Audit Logs — `/audit-logs` (**SA/A/HR**)
`GET /` (filters: module, action, userId, employeeId, from, to) · `GET /:id`.

## Org & User Administration
Lookup `GET` lists are readable by **SA/A/HR** (used to populate selects); writes are **SA/A**.
- Departments: `GET/POST /departments`, `PUT/DELETE /departments/:id`
- Positions: `GET/POST /positions`, `PUT/DELETE /positions/:id`
- Branches: `GET/POST /branches`, `PUT/DELETE /branches/:id`
- Schedules: `GET/POST /schedules`, `PUT/DELETE /schedules/:id`
- Roles: `GET /roles`
- Users (**SA/A**): `GET /users` (paginated, search) · `POST /users` (email, password, role, employeeId?) · `PUT /users/:id` ({ isActive?, role? })

## Health
`GET /health` · `GET /health/db`.
