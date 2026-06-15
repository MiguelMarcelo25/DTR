import { api } from '@/lib/api';
import type { ApiResponse, AuthUser, PaginationMeta } from '@/types';

// ─────────────────────────────────────────────────────────────
// Types (mirror api/src/prisma/schema.prisma + service responses)
// ─────────────────────────────────────────────────────────────

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type CivilStatus = 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'SEPARATED' | 'DIVORCED';
export type SalaryType = 'MONTHLY' | 'DAILY' | 'HOURLY';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type EmploymentType =
  | 'REGULAR'
  | 'PROBATIONARY'
  | 'CONTRACTUAL'
  | 'PART_TIME'
  | 'INTERN';
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED' | 'ON_LEAVE';
export type DocumentType =
  | 'RESUME'
  | 'EMPLOYMENT_CONTRACT'
  | 'VALID_ID'
  | 'BIRTH_CERTIFICATE'
  | 'DIPLOMA'
  | 'TRANSCRIPT'
  | 'TRAINING_CERTIFICATE'
  | 'MEDICAL_CERTIFICATE'
  | 'CLEARANCE'
  | 'OTHER';

/** Sensitive government/payroll fields arrive only for privileged readers. */
export interface EmployeeProfile {
  id: string;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  civilStatus: CivilStatus | null;
  nationality: string | null;
  contactNumber: string | null;
  email: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  photoUrl: string | null;
  // Sensitive (may be absent for plain employees)
  tin?: string | null;
  sss?: string | null;
  philhealth?: string | null;
  pagibig?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  salaryType?: SalaryType;
  basicSalary?: number | string;
  allowances?: number | string;
  taxStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NamedRef {
  name: string;
}

export interface EmployeeRecord {
  id: string;
  employeeNo: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  rank: string | null;
  dateHired: string;
  regularizationDate: string | null;
  department: { id: string; name: string } | null;
  position: { id: string; title: string } | null;
  branch: { id: string; name: string } | null;
  schedule: { id: string; name: string; timeIn: string; timeOut: string } | null;
  supervisor: {
    id: string;
    employeeNo: string;
    profile: { firstName: string; lastName: string } | null;
  } | null;
  profile: EmployeeProfile | null;
}

export interface EmergencyContact {
  id: string;
  employeeId: string;
  fullName: string;
  relationship: string | null;
  contactNumber: string | null;
  address: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Dependent {
  id: string;
  employeeId: string;
  fullName: string;
  relationship: string | null;
  dateOfBirth: string | null;
  contactNumber: string | null;
  isDependentForBenefits: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Education {
  id: string;
  employeeId: string;
  schoolName: string;
  degree: string | null;
  educationLevel: string | null;
  yearStarted: number | null;
  yearGraduated: number | null;
  honors: string | null;
  documentUrl: string | null;
}

export interface WorkExperience {
  id: string;
  employeeId: string;
  companyName: string;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
  reasonForLeaving: string | null;
  jobDescription: string | null;
  referenceName: string | null;
  referenceContact: string | null;
}

export interface Skill {
  id: string;
  employeeId: string;
  skillName: string;
  skillLevel: SkillLevel;
  yearsOfExperience: number | null;
  remarks: string | null;
}

export interface Training {
  id: string;
  employeeId: string;
  name: string;
  provider: string | null;
  dateCompleted: string | null;
  expirationDate: string | null;
  certificateNumber: string | null;
  documentUrl: string | null;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentName: string;
  documentType: DocumentType;
  fileUrl: string;
  expirationDate: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  employeeId: string;
  eventType: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ProfileUpdateRequest {
  id: string;
  employeeId: string;
  section: string;
  changes: Record<string, unknown>;
  status: RequestStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<ApiResponse<AuthUser>>('/auth/me');
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Employee record (employment + core)
// ─────────────────────────────────────────────────────────────

export async function fetchEmployee(employeeId: string): Promise<EmployeeRecord> {
  const res = await api.get<ApiResponse<EmployeeRecord>>(`/employees/${employeeId}`);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Profile + sub-resources
// ─────────────────────────────────────────────────────────────

export async function fetchProfile(employeeId: string): Promise<EmployeeProfile> {
  const res = await api.get<ApiResponse<EmployeeProfile>>(`/employees/${employeeId}/profile`);
  return res.data.data;
}

export async function updateProfile(
  employeeId: string,
  changes: Record<string, unknown>,
): Promise<EmployeeProfile> {
  const res = await api.put<ApiResponse<EmployeeProfile>>(
    `/employees/${employeeId}/profile`,
    changes,
  );
  return res.data.data;
}

export async function uploadProfilePhoto(
  employeeId: string,
  file: File,
): Promise<EmployeeProfile> {
  const form = new FormData();
  form.append('photo', file);
  const res = await api.post<ApiResponse<EmployeeProfile>>(
    `/employees/${employeeId}/profile/photo`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

export async function fetchEmergencyContacts(employeeId: string): Promise<EmergencyContact[]> {
  const res = await api.get<ApiResponse<EmergencyContact[]>>(
    `/employees/${employeeId}/emergency-contacts`,
  );
  return res.data.data;
}

export async function fetchDependents(employeeId: string): Promise<Dependent[]> {
  const res = await api.get<ApiResponse<Dependent[]>>(`/employees/${employeeId}/dependents`);
  return res.data.data;
}

export async function fetchEducation(employeeId: string): Promise<Education[]> {
  const res = await api.get<ApiResponse<Education[]>>(`/employees/${employeeId}/education`);
  return res.data.data;
}

export async function fetchWorkExperience(employeeId: string): Promise<WorkExperience[]> {
  const res = await api.get<ApiResponse<WorkExperience[]>>(
    `/employees/${employeeId}/work-experience`,
  );
  return res.data.data;
}

export async function fetchSkills(employeeId: string): Promise<Skill[]> {
  const res = await api.get<ApiResponse<Skill[]>>(`/employees/${employeeId}/skills`);
  return res.data.data;
}

export async function fetchTrainings(employeeId: string): Promise<Training[]> {
  const res = await api.get<ApiResponse<Training[]>>(`/employees/${employeeId}/trainings`);
  return res.data.data;
}

export async function fetchDocuments(
  employeeId: string,
  params: ListParams & { documentType?: string } = {},
): Promise<ListResult<EmployeeDocument>> {
  const res = await api.get<ApiResponse<EmployeeDocument[]>>(
    `/employees/${employeeId}/documents`,
    { params },
  );
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function uploadDocument(
  employeeId: string,
  payload: {
    file: File;
    documentName: string;
    documentType?: string;
    remarks?: string | null;
    expirationDate?: string | null;
  },
): Promise<EmployeeDocument> {
  const form = new FormData();
  form.append('file', payload.file);
  form.append('documentName', payload.documentName);
  if (payload.documentType) form.append('documentType', payload.documentType);
  if (payload.remarks) form.append('remarks', payload.remarks);
  if (payload.expirationDate) form.append('expirationDate', payload.expirationDate);
  const res = await api.post<ApiResponse<EmployeeDocument>>(
    `/employees/${employeeId}/documents`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

export async function fetchActivityTimeline(
  employeeId: string,
  params: ListParams = {},
): Promise<ListResult<TimelineEntry>> {
  const res = await api.get<ApiResponse<TimelineEntry[]>>(
    `/employees/${employeeId}/activity-timeline`,
    { params },
  );
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

// ─────────────────────────────────────────────────────────────
// Profile update requests (self-service)
// ─────────────────────────────────────────────────────────────

export async function fetchUpdateRequests(
  params: ListParams & { status?: string } = {},
): Promise<ListResult<ProfileUpdateRequest>> {
  const res = await api.get<ApiResponse<ProfileUpdateRequest[]>>('/profile-update-requests', {
    params,
  });
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function createUpdateRequest(payload: {
  section: string;
  changes: Record<string, unknown>;
}): Promise<ProfileUpdateRequest> {
  const res = await api.post<ApiResponse<ProfileUpdateRequest>>(
    '/profile-update-requests',
    payload,
  );
  return res.data.data;
}

export async function cancelUpdateRequest(requestId: string): Promise<ProfileUpdateRequest> {
  const res = await api.put<ApiResponse<ProfileUpdateRequest>>(
    `/profile-update-requests/${requestId}/cancel`,
    {},
  );
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Change password
// ─────────────────────────────────────────────────────────────

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.post('/auth/change-password', payload);
}
