import { api } from '@/lib/api';
import type { ApiResponse, Paginated } from '@/types';

// ─────────────────────────────────────────────────────────────
// Types (mirror the backend Prisma models / service includes)
// ─────────────────────────────────────────────────────────────

export type EmploymentType =
  | 'REGULAR'
  | 'PROBATIONARY'
  | 'CONTRACTUAL'
  | 'PART_TIME'
  | 'INTERN';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'ON_LEAVE';

export interface EmployeeListItem {
  id: string;
  employeeNo: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  dateHired: string;
  departmentId: string | null;
  positionId: string | null;
  profile: { firstName: string; lastName: string; photoUrl: string | null } | null;
  department: { name: string } | null;
  position: { title: string } | null;
}

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  civilStatus: 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'SEPARATED' | 'DIVORCED' | null;
  nationality: string | null;
  contactNumber: string | null;
  email: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  photoUrl: string | null;
  // Sensitive (present only for privileged readers)
  tin?: string | null;
  sss?: string | null;
  philhealth?: string | null;
  pagibig?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  salaryType?: 'MONTHLY' | 'DAILY' | 'HOURLY';
  basicSalary?: number | string;
  allowances?: number | string;
  taxStatus?: string | null;
}

export interface EmployeeDetail {
  id: string;
  employeeNo: string;
  userId: string | null;
  departmentId: string | null;
  positionId: string | null;
  branchId: string | null;
  scheduleId: string | null;
  supervisorId: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  rank: string | null;
  dateHired: string;
  regularizationDate: string | null;
  archivedAt: string | null;
  profile: EmployeeProfile | null;
  department: { id: string; name: string } | null;
  position: { id: string; title: string } | null;
  branch: { id: string; name: string } | null;
  schedule: { id: string; name: string; timeIn: string; timeOut: string } | null;
  supervisor: {
    id: string;
    employeeNo: string;
    profile: { firstName: string; lastName: string } | null;
  } | null;
}

export interface EmergencyContact {
  id: string;
  fullName: string;
  relationship: string | null;
  contactNumber: string | null;
  address: string | null;
  isPrimary: boolean;
}

export interface Dependent {
  id: string;
  fullName: string;
  relationship: string | null;
  dateOfBirth: string | null;
  contactNumber: string | null;
  isDependentForBenefits: boolean;
}

export interface Education {
  id: string;
  schoolName: string;
  degree: string | null;
  educationLevel: string | null;
  yearStarted: number | null;
  yearGraduated: number | null;
  honors: string | null;
}

export interface WorkExperience {
  id: string;
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
  skillName: string;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience: number | null;
  remarks: string | null;
}

export interface Training {
  id: string;
  name: string;
  provider: string | null;
  dateCompleted: string | null;
  expirationDate: string | null;
  certificateNumber: string | null;
}

export interface EmployeeDocument {
  id: string;
  documentName: string;
  documentType: string;
  fileUrl: string;
  expirationDate: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  positionId?: string;
  employmentStatus?: string;
  employmentType?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Drop undefined/empty-string params so we never send blank filters. */
function clean<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Employee core
// ─────────────────────────────────────────────────────────────

export async function listEmployees(params: ListEmployeesParams): Promise<Paginated<EmployeeListItem>> {
  const res = await api.get<ApiResponse<EmployeeListItem[]>>('/employees', { params: clean(params) });
  return { items: res.data.data, meta: res.data.meta! };
}

export async function getEmployee(id: string): Promise<EmployeeDetail> {
  const res = await api.get<ApiResponse<EmployeeDetail>>(`/employees/${id}`);
  return res.data.data;
}

export async function createEmployee(payload: Record<string, unknown>): Promise<EmployeeDetail> {
  const res = await api.post<ApiResponse<EmployeeDetail>>('/employees', payload);
  return res.data.data;
}

export async function updateEmployee(id: string, payload: Record<string, unknown>): Promise<EmployeeDetail> {
  const res = await api.put<ApiResponse<EmployeeDetail>>(`/employees/${id}`, payload);
  return res.data.data;
}

export async function deactivateEmployee(id: string): Promise<void> {
  await api.put(`/employees/${id}/deactivate`);
}

export async function archiveEmployee(id: string): Promise<void> {
  await api.put(`/employees/${id}/archive`);
}

export async function exportMasterlist(): Promise<Blob> {
  const res = await api.get('/employees/export/masterlist', { responseType: 'blob' });
  return res.data as Blob;
}

// ─────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────

export async function getProfile(id: string): Promise<EmployeeProfile> {
  const res = await api.get<ApiResponse<EmployeeProfile>>(`/employees/${id}/profile`);
  return res.data.data;
}

export async function updateProfile(id: string, payload: Record<string, unknown>): Promise<EmployeeProfile> {
  const res = await api.put<ApiResponse<EmployeeProfile>>(`/employees/${id}/profile`, payload);
  return res.data.data;
}

// ─────────────────────────────────────────────────────────────
// Background sub-resources (generic CRUD)
// ─────────────────────────────────────────────────────────────

async function listChild<T>(id: string, resource: string): Promise<T[]> {
  const res = await api.get<ApiResponse<T[]>>(`/employees/${id}/${resource}`);
  return res.data.data;
}
async function createChild<T>(id: string, resource: string, payload: Record<string, unknown>): Promise<T> {
  const res = await api.post<ApiResponse<T>>(`/employees/${id}/${resource}`, payload);
  return res.data.data;
}
async function updateChild<T>(
  id: string,
  resource: string,
  childId: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const res = await api.put<ApiResponse<T>>(`/employees/${id}/${resource}/${childId}`, payload);
  return res.data.data;
}
async function deleteChild(id: string, resource: string, childId: string): Promise<void> {
  await api.delete(`/employees/${id}/${resource}/${childId}`);
}

// Emergency contacts
export const listEmergencyContacts = (id: string) =>
  listChild<EmergencyContact>(id, 'emergency-contacts');
export const createEmergencyContact = (id: string, p: Record<string, unknown>) =>
  createChild<EmergencyContact>(id, 'emergency-contacts', p);
export const updateEmergencyContact = (id: string, c: string, p: Record<string, unknown>) =>
  updateChild<EmergencyContact>(id, 'emergency-contacts', c, p);
export const deleteEmergencyContact = (id: string, c: string) =>
  deleteChild(id, 'emergency-contacts', c);

// Dependents
export const listDependents = (id: string) => listChild<Dependent>(id, 'dependents');
export const createDependent = (id: string, p: Record<string, unknown>) =>
  createChild<Dependent>(id, 'dependents', p);
export const updateDependent = (id: string, c: string, p: Record<string, unknown>) =>
  updateChild<Dependent>(id, 'dependents', c, p);
export const deleteDependent = (id: string, c: string) => deleteChild(id, 'dependents', c);

// Education
export const listEducation = (id: string) => listChild<Education>(id, 'education');
export const createEducation = (id: string, p: Record<string, unknown>) =>
  createChild<Education>(id, 'education', p);
export const updateEducation = (id: string, c: string, p: Record<string, unknown>) =>
  updateChild<Education>(id, 'education', c, p);
export const deleteEducation = (id: string, c: string) => deleteChild(id, 'education', c);

// Work experience
export const listWorkExperience = (id: string) => listChild<WorkExperience>(id, 'work-experience');
export const createWorkExperience = (id: string, p: Record<string, unknown>) =>
  createChild<WorkExperience>(id, 'work-experience', p);
export const updateWorkExperience = (id: string, c: string, p: Record<string, unknown>) =>
  updateChild<WorkExperience>(id, 'work-experience', c, p);
export const deleteWorkExperience = (id: string, c: string) =>
  deleteChild(id, 'work-experience', c);

// Skills
export const listSkills = (id: string) => listChild<Skill>(id, 'skills');
export const createSkill = (id: string, p: Record<string, unknown>) =>
  createChild<Skill>(id, 'skills', p);
export const updateSkill = (id: string, c: string, p: Record<string, unknown>) =>
  updateChild<Skill>(id, 'skills', c, p);
export const deleteSkill = (id: string, c: string) => deleteChild(id, 'skills', c);

// Trainings
export const listTrainings = (id: string) => listChild<Training>(id, 'trainings');
export const createTraining = (id: string, p: Record<string, unknown>) =>
  createChild<Training>(id, 'trainings', p);
export const updateTraining = (id: string, c: string, p: Record<string, unknown>) =>
  updateChild<Training>(id, 'trainings', c, p);
export const deleteTraining = (id: string, c: string) => deleteChild(id, 'trainings', c);

// ─────────────────────────────────────────────────────────────
// Documents (multipart)
// ─────────────────────────────────────────────────────────────

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  documentType?: string;
}

export async function listDocuments(
  id: string,
  params: ListDocumentsParams,
): Promise<Paginated<EmployeeDocument>> {
  const res = await api.get<ApiResponse<EmployeeDocument[]>>(`/employees/${id}/documents`, {
    params: clean(params),
  });
  return { items: res.data.data, meta: res.data.meta! };
}

export async function uploadDocument(id: string, formData: FormData): Promise<EmployeeDocument> {
  const res = await api.post<ApiResponse<EmployeeDocument>>(`/employees/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteDocument(id: string, childId: string): Promise<void> {
  await api.delete(`/employees/${id}/documents/${childId}`);
}

// ─────────────────────────────────────────────────────────────
// Activity timeline
// ─────────────────────────────────────────────────────────────

export async function listActivityTimeline(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<TimelineEvent>> {
  const res = await api.get<ApiResponse<TimelineEvent[]>>(`/employees/${id}/activity-timeline`, {
    params: clean(params),
  });
  return { items: res.data.data, meta: res.data.meta! };
}

// ─────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────
// NOTE: There is NO backend lookup endpoint for departments / positions /
// branches / schedules / supervisors (no routes mounted in api/src/routes/index.ts).
// These are managed by the (not-yet-mounted) admin area. Until those endpoints
// exist, the UI accepts free-text UUIDs for these references. The typed stubs
// below throw so callers can detect the missing endpoint, and components fall
// back to manual UUID entry.

export interface LookupOption {
  id: string;
  label: string;
}

export async function listDepartments(): Promise<LookupOption[]> {
  throw new Error('No departments lookup endpoint available');
}
export async function listPositions(): Promise<LookupOption[]> {
  throw new Error('No positions lookup endpoint available');
}
export async function listBranches(): Promise<LookupOption[]> {
  throw new Error('No branches lookup endpoint available');
}
export async function listSchedules(): Promise<LookupOption[]> {
  throw new Error('No schedules lookup endpoint available');
}
