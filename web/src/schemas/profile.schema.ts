import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Enums (mirror api/src/prisma/schema.prisma)
// ─────────────────────────────────────────────────────────────

export const GENDER_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;
export const CIVIL_STATUS_VALUES = [
  'SINGLE',
  'MARRIED',
  'WIDOWED',
  'SEPARATED',
  'DIVORCED',
] as const;
export const SKILL_LEVEL_VALUES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export const DOCUMENT_TYPE_VALUES = [
  'RESUME',
  'EMPLOYMENT_CONTRACT',
  'VALID_ID',
  'BIRTH_CERTIFICATE',
  'DIPLOMA',
  'TRANSCRIPT',
  'TRAINING_CERTIFICATE',
  'MEDICAL_CERTIFICATE',
  'CLEARANCE',
  'OTHER',
] as const;
export const REQUEST_STATUS_VALUES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

const genderEnum = z.enum(GENDER_VALUES);
const civilStatusEnum = z.enum(CIVIL_STATUS_VALUES);

/** Empty <Select> -> '' becomes null on submit. */
const optionalString = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v && v.length ? v : null));

// ─────────────────────────────────────────────────────────────
// Personal info — directly editable by the employee.
// ─────────────────────────────────────────────────────────────

export const personalInfoSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: optionalString,
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  suffix: z.string().trim().max(50).optional().transform((v) => (v && v.length ? v : null)),
  dateOfBirth: z
    .string()
    .optional()
    .transform((v) => (v && v.length ? v : null)),
  gender: z
    .union([genderEnum, z.literal('')])
    .optional()
    .transform((v) => (v ? v : null)),
  civilStatus: z
    .union([civilStatusEnum, z.literal('')])
    .optional()
    .transform((v) => (v ? v : null)),
  nationality: optionalString,
});
export type PersonalInfoValues = z.input<typeof personalInfoSchema>;
export type PersonalInfoOutput = z.output<typeof personalInfoSchema>;

// ─────────────────────────────────────────────────────────────
// Sensitive change request — routed through profile-update-requests.
// ─────────────────────────────────────────────────────────────

export const SENSITIVE_SECTIONS = [
  { value: 'personal', label: 'Address & Contact' },
  { value: 'government', label: 'Government IDs (TIN / SSS / PhilHealth / Pag-IBIG)' },
  { value: 'bank', label: 'Bank Account' },
] as const;
export type SensitiveSection = (typeof SENSITIVE_SECTIONS)[number]['value'];

export const sensitiveRequestSchema = z.object({
  section: z.enum(['personal', 'government', 'bank']),
  // Contact / address (section: personal)
  contactNumber: z.string().trim().max(50).optional(),
  currentAddress: z.string().trim().max(500).optional(),
  permanentAddress: z.string().trim().max(500).optional(),
  civilStatus: z.union([civilStatusEnum, z.literal('')]).optional(),
  // Government IDs (section: government)
  tin: z.string().trim().max(50).optional(),
  sss: z.string().trim().max(50).optional(),
  philhealth: z.string().trim().max(50).optional(),
  pagibig: z.string().trim().max(50).optional(),
  // Bank (section: bank)
  bankName: z.string().trim().max(100).optional(),
  bankAccountNumber: z.string().trim().max(50).optional(),
});
export type SensitiveRequestValues = z.infer<typeof sensitiveRequestSchema>;

// ─────────────────────────────────────────────────────────────
// Change password
// ─────────────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
