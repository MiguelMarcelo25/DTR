import { z } from 'zod';

/**
 * Zod schemas for the Employee Management feature. These mirror the backend
 * validations in api/src/validations/employee.validation.ts and profile.validation.ts.
 * Optional UUID fields use `''` as the empty sentinel from <Select> and are
 * stripped before sending to the API.
 */

export const EMPLOYMENT_TYPES = [
  'REGULAR',
  'PROBATIONARY',
  'CONTRACTUAL',
  'PART_TIME',
  'INTERN',
] as const;

export const EMPLOYMENT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'RESIGNED',
  'TERMINATED',
  'ON_LEAVE',
] as const;

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export const CIVIL_STATUSES = ['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'DIVORCED'] as const;
export const SALARY_TYPES = ['MONTHLY', 'DAILY', 'HOURLY'] as const;
export const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export const FITNESS_STATUSES = ['FIT', 'UNFIT', 'FIT_WITH_RESTRICTIONS'] as const;
export const DOCUMENT_TYPES = [
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
export const ACCOUNT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE'] as const;

/**
 * Sentinel used by SelectField for the "no selection" option, since Radix
 * <Select> items cannot carry an empty-string value. Normalised back to ''
 * before validation so the submitted payload shape is unchanged.
 */
export const SELECT_NONE = '__none__';

/** Accept '' / the None sentinel (no selection) or a UUID. */
const optionalUuid = z.preprocess(
  (v) => (v === SELECT_NONE ? '' : v),
  z
    .string()
    .optional()
    .refine((v) => !v || z.string().uuid().safeParse(v).success, 'Must be a valid ID'),
);

// ─────────────────────────────────────────────────────────────
// Create employee
// ─────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  employeeNo: z.string().optional(),
  departmentId: optionalUuid,
  positionId: optionalUuid,
  branchId: optionalUuid,
  scheduleId: optionalUuid,
  supervisorId: optionalUuid,
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  rank: z.string().optional(),
  dateHired: z.string().min(1, 'Date hired is required'),
  // Profile (nested)
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  currentAddress: z.string().optional(),
  // Optional linked account
  createAccount: z.boolean().optional(),
  accountEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  accountPassword: z.string().optional(),
  accountRole: z.enum(ACCOUNT_ROLES).optional(),
});

export type CreateEmployeeValues = z.infer<typeof createEmployeeSchema>;

// ─────────────────────────────────────────────────────────────
// Edit employment
// ─────────────────────────────────────────────────────────────

export const employmentSchema = z.object({
  departmentId: optionalUuid,
  positionId: optionalUuid,
  branchId: optionalUuid,
  scheduleId: optionalUuid,
  supervisorId: optionalUuid,
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  rank: z.string().optional(),
  dateHired: z.string().optional(),
  regularizationDate: z.string().optional(),
});

export type EmploymentValues = z.infer<typeof employmentSchema>;

// ─────────────────────────────────────────────────────────────
// Profile (incl. sensitive gov/payroll for privileged)
// ─────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDERS).optional(),
  civilStatus: z.enum(CIVIL_STATUSES).optional(),
  nationality: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  // Sensitive
  tin: z.string().optional(),
  sss: z.string().optional(),
  philhealth: z.string().optional(),
  pagibig: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  salaryType: z.enum(SALARY_TYPES).optional(),
  basicSalary: z.string().optional(),
  allowances: z.string().optional(),
  taxStatus: z.string().optional(),
});

export type ProfileValues = z.infer<typeof profileSchema>;

// ─────────────────────────────────────────────────────────────
// Background sub-resources
// ─────────────────────────────────────────────────────────────

export const emergencyContactSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  relationship: z.string().optional(),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
  isPrimary: z.boolean().optional(),
});
export type EmergencyContactValues = z.infer<typeof emergencyContactSchema>;

export const dependentSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  relationship: z.string().optional(),
  dateOfBirth: z.string().optional(),
  contactNumber: z.string().optional(),
  isDependentForBenefits: z.boolean().optional(),
});
export type DependentValues = z.infer<typeof dependentSchema>;

export const educationSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  degree: z.string().optional(),
  educationLevel: z.string().optional(),
  yearStarted: z.string().optional(),
  yearGraduated: z.string().optional(),
  honors: z.string().optional(),
});
export type EducationValues = z.infer<typeof educationSchema>;

export const workExperienceSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  position: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reasonForLeaving: z.string().optional(),
  jobDescription: z.string().optional(),
  referenceName: z.string().optional(),
  referenceContact: z.string().optional(),
});
export type WorkExperienceValues = z.infer<typeof workExperienceSchema>;

export const skillSchema = z.object({
  skillName: z.string().min(1, 'Skill name is required'),
  skillLevel: z.enum(SKILL_LEVELS).optional(),
  yearsOfExperience: z.string().optional(),
  remarks: z.string().optional(),
});
export type SkillValues = z.infer<typeof skillSchema>;

export const trainingSchema = z.object({
  name: z.string().min(1, 'Training name is required'),
  provider: z.string().optional(),
  dateCompleted: z.string().optional(),
  expirationDate: z.string().optional(),
  certificateNumber: z.string().optional(),
});
export type TrainingValues = z.infer<typeof trainingSchema>;

// ─────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────

export const documentUploadSchema = z.object({
  documentName: z.string().min(1, 'Document name is required'),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  remarks: z.string().optional(),
  expirationDate: z.string().optional(),
});
export type DocumentUploadValues = z.infer<typeof documentUploadSchema>;
