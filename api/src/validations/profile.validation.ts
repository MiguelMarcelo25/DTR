import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Shared params
// ─────────────────────────────────────────────────────────────

export const employeeIdParams = z.object({
  id: z.string().uuid(),
});

export const childParams = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
});

export const requestIdParams = z.object({
  requestId: z.string().uuid(),
});

// ─────────────────────────────────────────────────────────────
// Enums (mirror schema.prisma)
// ─────────────────────────────────────────────────────────────

const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);
const civilStatusEnum = z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'DIVORCED']);
const salaryTypeEnum = z.enum(['MONTHLY', 'DAILY', 'HOURLY']);
const skillLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);
const documentTypeEnum = z.enum([
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
]);
const fitnessStatusEnum = z.enum(['FIT', 'UNFIT', 'FIT_WITH_RESTRICTIONS']);
const disciplinaryStatusEnum = z.enum(['OPEN', 'RESOLVED', 'DISMISSED', 'ESCALATED']);
const requestStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

// ─────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────

export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    middleName: z.string().max(100).nullable().optional(),
    lastName: z.string().min(1).max(100).optional(),
    suffix: z.string().max(50).nullable().optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    gender: genderEnum.nullable().optional(),
    civilStatus: civilStatusEnum.nullable().optional(),
    nationality: z.string().max(100).nullable().optional(),
    contactNumber: z.string().max(50).nullable().optional(),
    email: z.string().email().nullable().optional(),
    currentAddress: z.string().max(500).nullable().optional(),
    permanentAddress: z.string().max(500).nullable().optional(),
    // Sensitive government / payroll fields
    tin: z.string().max(50).nullable().optional(),
    sss: z.string().max(50).nullable().optional(),
    philhealth: z.string().max(50).nullable().optional(),
    pagibig: z.string().max(50).nullable().optional(),
    bankName: z.string().max(100).nullable().optional(),
    bankAccountNumber: z.string().max(50).nullable().optional(),
    salaryType: salaryTypeEnum.optional(),
    basicSalary: z.coerce.number().nonnegative().optional(),
    allowances: z.coerce.number().nonnegative().optional(),
    taxStatus: z.string().max(50).nullable().optional(),
  })
  .strict();

// ─────────────────────────────────────────────────────────────
// Emergency contacts
// ─────────────────────────────────────────────────────────────

export const createEmergencyContactSchema = z.object({
  fullName: z.string().min(1).max(150),
  relationship: z.string().max(100).nullable().optional(),
  contactNumber: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export const updateEmergencyContactSchema = createEmergencyContactSchema.partial();

// ─────────────────────────────────────────────────────────────
// Dependents
// ─────────────────────────────────────────────────────────────

export const createDependentSchema = z.object({
  fullName: z.string().min(1).max(150),
  relationship: z.string().max(100).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  contactNumber: z.string().max(50).nullable().optional(),
  isDependentForBenefits: z.boolean().optional(),
});

export const updateDependentSchema = createDependentSchema.partial();

// ─────────────────────────────────────────────────────────────
// Education
// ─────────────────────────────────────────────────────────────

export const createEducationSchema = z.object({
  schoolName: z.string().min(1).max(200),
  degree: z.string().max(200).nullable().optional(),
  educationLevel: z.string().max(100).nullable().optional(),
  yearStarted: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  yearGraduated: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  honors: z.string().max(200).nullable().optional(),
  documentUrl: z.string().url().nullable().optional(),
});

export const updateEducationSchema = createEducationSchema.partial();

// ─────────────────────────────────────────────────────────────
// Work experience
// ─────────────────────────────────────────────────────────────

export const createWorkExperienceSchema = z.object({
  companyName: z.string().min(1).max(200),
  position: z.string().max(200).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  reasonForLeaving: z.string().max(500).nullable().optional(),
  jobDescription: z.string().max(2000).nullable().optional(),
  referenceName: z.string().max(150).nullable().optional(),
  referenceContact: z.string().max(100).nullable().optional(),
});

export const updateWorkExperienceSchema = createWorkExperienceSchema.partial();

// ─────────────────────────────────────────────────────────────
// Skills
// ─────────────────────────────────────────────────────────────

export const createSkillSchema = z.object({
  skillName: z.string().min(1).max(150),
  skillLevel: skillLevelEnum.optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(80).nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
});

export const updateSkillSchema = createSkillSchema.partial();

// ─────────────────────────────────────────────────────────────
// Trainings
// ─────────────────────────────────────────────────────────────

export const createTrainingSchema = z.object({
  name: z.string().min(1).max(200),
  provider: z.string().max(200).nullable().optional(),
  dateCompleted: z.coerce.date().nullable().optional(),
  expirationDate: z.coerce.date().nullable().optional(),
  certificateNumber: z.string().max(150).nullable().optional(),
  documentUrl: z.string().url().nullable().optional(),
});

export const updateTrainingSchema = createTrainingSchema.partial();

// ─────────────────────────────────────────────────────────────
// Documents (multipart — text fields parsed from req.body)
// ─────────────────────────────────────────────────────────────

export const createDocumentSchema = z.object({
  documentName: z.string().min(1).max(200),
  documentType: documentTypeEnum.optional(),
  remarks: z.string().max(500).nullable().optional(),
  expirationDate: z.coerce.date().nullable().optional(),
});

export const listDocumentsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  documentType: documentTypeEnum.optional(),
  includeDeleted: z.coerce.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────
// Medical records
// ─────────────────────────────────────────────────────────────

export const createMedicalRecordSchema = z.object({
  bloodType: z.string().max(10).nullable().optional(),
  medicalConditions: z.string().max(2000).nullable().optional(),
  allergies: z.string().max(2000).nullable().optional(),
  fitnessStatus: fitnessStatusEnum.nullable().optional(),
  medicalCertificateUrl: z.string().url().nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

export const updateMedicalRecordSchema = createMedicalRecordSchema.partial();

// ─────────────────────────────────────────────────────────────
// Disciplinary records
// ─────────────────────────────────────────────────────────────

export const createDisciplinaryRecordSchema = z.object({
  incidentDate: z.coerce.date(),
  incidentType: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  actionTaken: z.string().max(2000).nullable().optional(),
  status: disciplinaryStatusEnum.optional(),
  documentUrl: z.string().url().nullable().optional(),
});

export const updateDisciplinaryRecordSchema = createDisciplinaryRecordSchema.partial();

// ─────────────────────────────────────────────────────────────
// Performance notes
// ─────────────────────────────────────────────────────────────

export const createPerformanceNoteSchema = z.object({
  evaluationDate: z.coerce.date(),
  evaluationType: z.string().max(100).nullable().optional(),
  rating: z.coerce.number().min(0).max(100).nullable().optional(),
  strengths: z.string().max(2000).nullable().optional(),
  areasForImprovement: z.string().max(2000).nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

export const updatePerformanceNoteSchema = createPerformanceNoteSchema.partial();

// ─────────────────────────────────────────────────────────────
// Activity timeline (list)
// ─────────────────────────────────────────────────────────────

export const listQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// Profile update requests
// ─────────────────────────────────────────────────────────────

export const listUpdateRequestsQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: requestStatusEnum.optional(),
});

export const createUpdateRequestSchema = z.object({
  section: z.string().min(1).max(100),
  changes: z.record(z.string(), z.unknown()),
});

export const rejectUpdateRequestSchema = z.object({
  reviewNote: z.string().min(1).max(1000),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type CreateUpdateRequestInput = z.infer<typeof createUpdateRequestSchema>;
