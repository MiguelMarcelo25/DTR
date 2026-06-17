/** Canonical role identifiers — mirror the `RoleName` enum in schema.prisma. */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  HR: 'HR',
  EMPLOYEE: 'EMPLOYEE',
  CLIENT: 'CLIENT',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** Roles allowed to read/write sensitive profile data (salary, bank, gov IDs). */
export const PRIVILEGED_ROLES: RoleName[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR];

/** Roles allowed to operate payroll. */
export const PAYROLL_ROLES: RoleName[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

/** Internal staff roles (everyone except external clients) — can work the support board. */
export const STAFF_ROLES: RoleName[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE];

/** Audit log module names. */
export const MODULES = {
  AUTH: 'AUTH',
  EMPLOYEE: 'EMPLOYEE',
  PROFILE: 'PROFILE',
  ATTENDANCE: 'ATTENDANCE',
  LEAVE: 'LEAVE',
  APPOINTMENT: 'APPOINTMENT',
  PAYROLL: 'PAYROLL',
  NOTIFICATION: 'NOTIFICATION',
  REPORT: 'REPORT',
  USER: 'USER',
  SETTINGS: 'SETTINGS',
  SUPPORT: 'SUPPORT',
  OVERTIME: 'OVERTIME',
  HOLIDAY: 'HOLIDAY',
  APPROVAL: 'APPROVAL',
} as const;

/** Upload constraints. */
export const UPLOAD = {
  MAX_FILE_BYTES: 10 * 1024 * 1024, // 10 MB
  IMAGE_MIME: ['image/jpeg', 'image/png', 'image/webp'],
  DOC_MIME: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

/** Default pagination limits. */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
