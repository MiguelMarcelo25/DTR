# System Architecture

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                         │
│   Next.js 14 App Router · React 18 · Tailwind · ShadCN · TanStack    │
└───────────────────────────────┬─────────────────────────────────────┘
                                 │  HTTPS (JSON) + Bearer access token
                                 │  Axios client w/ refresh interceptor
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXPRESS REST API (Render)                       │
│                                                                       │
│  routes → middlewares → controllers → services → repositories        │
│                                                                       │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │ Auth/JWT  │ │ RBAC guard │ │ Zod valid.│ │ Audit log writer   │  │
│  └───────────┘ └────────────┘ └───────────┘ └────────────────────┘  │
│  Helmet · CORS · rate-limit · error handler · request logger         │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ Prisma Client                  │ Supabase JS (storage)
                ▼                                 ▼
   ┌────────────────────────┐        ┌──────────────────────────────┐
   │ Supabase PostgreSQL    │        │ Supabase Storage (buckets)    │
   │ (Prisma migrations)    │        │ photos, documents, payslips   │
   └────────────────────────┘        └──────────────────────────────┘
```

**Key boundary rules**
- The browser holds only a short-lived **access token** (in memory / React state)
  and a long-lived **refresh token** in an `httpOnly`, `Secure`, `SameSite`
  cookie. The DB is never reachable from the client.
- Supabase Storage uploads are brokered by the API: the client sends the file to
  the API (Multer, memory storage), the API validates type/size, uploads via the
  Supabase **service-role** key, persists metadata, and returns a signed URL.
- Sensitive columns (salary, bank, gov IDs, medical, disciplinary) are filtered
  at the **service layer** by role before serialization — never sent raw.

## 2. Backend layered (clean) architecture

```
api/src/
├── config/          # env loading, prisma client, supabase client, constants
├── middlewares/     # auth, rbac, validate, error, notFound, rateLimit, audit ctx
├── routes/          # express routers, one file per module (+ index.ts)
├── controllers/     # HTTP concerns: parse req, call service, shape response
├── services/        # business logic, orchestration, sensitive-field redaction
├── repositories/    # Prisma data access (the ONLY place Prisma is queried)
├── validations/     # Zod schemas per module (body/query/params)
├── utils/           # response, errors (AppError), jwt, password, pagination,
│                    #   pdf, audit, storage, dateTime, payroll calculators
├── types/           # shared TS types, express Request augmentation
├── prisma/          # schema.prisma, seed.ts, migrations/
├── app.ts           # express app assembly (middleware order)
└── server.ts        # bootstrap + graceful shutdown
```

Dependency direction: `routes → controllers → services → repositories → prisma`.
Controllers never call Prisma; services never read `req`/`res`.

## 3. Frontend architecture

```
web/src/
├── app/                       # App Router routes (see docs/API.md route map)
│   ├── (auth)/                # login, forgot/reset password (no shell)
│   └── dashboard/             # authenticated shell (sidebar + topbar)
├── components/                # ui/ (shadcn), shared/ (DataTable, PageHeader…)
├── features/                  # one folder per domain: components + hooks + api
│   ├── auth/  employees/  attendance/  leave/  appointments/
│   ├── payroll/  profile/  dashboard/  notifications/  reports/  admin/
├── hooks/                     # cross-cutting hooks (useAuth, useDebounce…)
├── lib/                       # api client (axios), query client, utils, cn
├── schemas/                   # Zod schemas shared with forms
├── types/                     # API response types
└── providers/                 # QueryProvider, AuthProvider, ThemeProvider
```

State model: **TanStack Query** owns all server state (caching, refetch,
invalidation). **React Hook Form + Zod** own form state. Auth/session lives in a
lightweight context backed by the `/auth/me` query.

## 4. Entity Relationship overview (ERD)

```
User 1───1 Employee 1───* (all profile sub-records)
User *───* Role  (via UserRole)            Role 1───* (permission via enum)
Employee *───1 Department
Employee *───1 Position
Employee *───1 Branch
Employee *───1 Schedule
Employee *───1 Employee (supervisor self-relation)

Employee 1───1 EmployeeProfile            (personal info)
Employee 1───* EmployeeEmergencyContact
Employee 1───* EmployeeDependent
Employee 1───* EmployeeEducation
Employee 1───* EmployeeWorkExperience
Employee 1───* EmployeeSkill
Employee 1───* EmployeeTraining
Employee 1───* EmployeeDocument
Employee 1───* EmployeeMedicalRecord
Employee 1───* EmployeeDisciplinaryRecord
Employee 1───* EmployeePerformanceNote
Employee 1───* EmployeeProfileUpdateRequest
Employee 1───* EmployeeActivityTimeline

Employee 1───* Attendance 1───* AttendanceCorrection
LeaveType 1───* LeaveRequest *───1 Employee
LeaveType 1───* LeaveBalance *───1 Employee
Employee 1───* Appointment *───0..1 AppointmentSlot
PayrollPeriod 1───* Payroll *───1 Employee
Payroll 1───* PayrollItem
Payroll 1───1 Payslip
User/Employee 1───* Notification
User 1───* AuditLog
```

Full column-level definitions live in [`../api/src/prisma/schema.prisma`](../api/src/prisma/schema.prisma).

## 5. RBAC matrix (summary)

| Capability                         | Super Admin | Admin | HR  | Employee |
| ---------------------------------- | :---------: | :---: | :-: | :------: |
| Manage users / roles / settings    |     ✅      |  ❌   | ❌  |   ❌     |
| View all audit logs                |     ✅      |  ✅   | ✅* | ❌       |
| Manage employees (CRUD)            |     ✅      |  ✅   | ✅  | ❌       |
| Manage payroll / process payroll   |     ✅      |  ✅   | ❌  | ❌       |
| View salary / bank / gov IDs       |     ✅      |  ✅   | ✅  | self†    |
| Manage profile background records  |     ✅      |  ✅   | ✅  | view-own |
| Medical / disciplinary records     |     ✅      |  ✅   | ✅  | ❌       |
| Approve leave / corrections        |     ✅      |  ✅   | ✅  | ❌       |
| Approve profile-update requests    |     ✅      |  ✅   | ✅  | ❌       |
| Time in/out, own DTR & payslip     |     ✅      |  ✅   | ✅  | ✅       |

\* HR sees attendance/leave audit scope. † Employee sees own gov/bank but cannot
edit without an approval request; salary is read-only and never editable by self.

Enforced in two layers: `authorize(...roles)` route guard **and** record-scope
checks in services (`ensureSelfOrPrivileged`). Sensitive fields are stripped in
service serializers regardless of route reached.

## 6. Authentication flow

```
Login
  client POST /auth/login {email,password}
    → service: find active user, bcrypt.compare
    → issue access JWT (15m) + refresh JWT (7d, jti stored hashed in RefreshToken? )
    → set refresh cookie (httpOnly), return {accessToken, user}
    → audit: LOGIN

Authenticated request
  Authorization: Bearer <access>
    → authenticate mw verifies access JWT → req.user
    → authorize mw checks role

Token refresh (access expired → 401 w/ code TOKEN_EXPIRED)
  axios interceptor calls POST /auth/refresh-token (cookie sent automatically)
    → verify refresh JWT + rotation check → new access (+ rotate refresh)
    → retry original request

Logout
  POST /auth/logout → revoke refresh token, clear cookie → audit LOGOUT
```

Password reset uses a single-use, time-boxed token (hashed at rest) delivered by
email (email transport is pluggable; dev logs the link).

## 7. Database indexing strategy

- **Primary keys**: UUID (`@default(uuid())`) on every table.
- **Foreign keys**: every relation column is indexed (Prisma indexes FKs used in
  `where`; we add explicit `@@index` for composite lookups).
- **Search columns**: `Employee.employeeNo`, `EmployeeProfile.lastName/firstName`,
  `Department.name`, `Position.title` indexed for directory search/sort.
- **Hot query paths**:
  - `Attendance @@index([employeeId, date])` + `@@unique([employeeId, date])`
  - `LeaveRequest @@index([employeeId, status])`
  - `Appointment @@index([slotId, status])`, `@@index([employeeId, status])`
  - `Notification @@index([userId, isRead])`
  - `AuditLog @@index([userId, createdAt])`, `@@index([module, action])`
  - `Payroll @@index([periodId, employeeId])`
- **Soft delete**: `deletedAt DateTime?` on Employee, EmployeeDocument, and other
  archivable records; repositories default to `where: { deletedAt: null }`.
- **Timestamps**: `createdAt @default(now())`, `updatedAt @updatedAt` everywhere.

## 8. Cross-cutting concerns

| Concern         | Implementation |
| --------------- | -------------- |
| Validation      | Zod schemas via `validate(schema)` middleware (body/query/params) |
| Errors          | `AppError` + central `errorHandler`, consistent JSON envelope |
| Responses       | `ok()/created()/paginated()` helpers — one shape everywhere |
| Pagination      | `?page=&limit=&sort=&order=&search=` → `buildPagination()` util |
| Audit           | `writeAudit()` util called by services for sensitive actions |
| Security        | helmet, cors allowlist, express-rate-limit, bcrypt, JWT, field redaction |
| File upload     | Multer (memory) → validate → Supabase Storage → metadata row |
| PDF             | `pdfkit` for payslips & report exports |
| Notifications   | DB-backed in-app notifications, created by services on domain events |

See [ROADMAP.md](ROADMAP.md) for the sprint plan, risk register, and phase order.
