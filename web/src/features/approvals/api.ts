import { api } from '@/lib/api';
import type { ApiResponse, Paginated, PaginationMeta } from '@/types';

export const APPROVAL_SUBJECT_TYPES = [
  'ATTENDANCE_CORRECTION',
  'DTR_PERIOD',
  'LEAVE_REQUEST',
  'OVERTIME_REQUEST',
  'APPOINTMENT',
  'PROFILE_UPDATE_REQUEST',
] as const;

export type ApprovalSubjectType = (typeof APPROVAL_SUBJECT_TYPES)[number];

export type ApprovalInstanceStatus =
  | 'PENDING_SUPERVISOR'
  | 'PENDING_HR'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
export type ApprovalDecision = 'APPROVE' | 'REJECT';

export interface ApprovalRequester {
  id: string;
  employeeNo: string;
  departmentId: string | null;
  branchId: string | null;
  profile: { firstName: string; lastName: string } | null;
}

export interface ApprovalStep {
  id: string;
  instanceId: string;
  sequence: number;
  stage: string;
  assignedRole: string;
  assignedEmployeeId: string | null;
  status: ApprovalStepStatus;
  decidedByUserId: string | null;
  decidedAt: string | null;
  decision: ApprovalDecision | null;
  note: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalInstance {
  id: string;
  subjectType: ApprovalSubjectType;
  subjectId: string;
  requesterEmployeeId: string;
  departmentId: string | null;
  branchId: string | null;
  currentStage: string;
  status: ApprovalInstanceStatus;
  submittedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  metadata: Record<string, unknown> | null;
  requester: ApprovalRequester | null;
  steps: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ApprovalInboxParams {
  page?: number;
  limit?: number;
  sort?: 'submittedAt' | 'updatedAt' | 'status';
  order?: 'asc' | 'desc';
  subjectType?: ApprovalSubjectType;
}

export interface ApprovalActionPayload {
  decision: ApprovalDecision;
  note?: string;
}

export async function fetchApprovalInbox(
  params: ApprovalInboxParams = {},
): Promise<Paginated<ApprovalInstance>> {
  const res = await api.get<ApiResponse<ApprovalInstance[]>>('/approvals/inbox', { params });
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function fetchApproval(id: string): Promise<ApprovalInstance> {
  const res = await api.get<ApiResponse<ApprovalInstance>>(`/approvals/${id}`);
  return res.data.data;
}

export async function actOnApproval(
  id: string,
  payload: ApprovalActionPayload,
): Promise<ApprovalInstance> {
  const res = await api.post<ApiResponse<ApprovalInstance>>(`/approvals/${id}/actions`, payload);
  return res.data.data;
}

export function requesterName(approval: ApprovalInstance): string {
  const requester = approval.requester;
  if (!requester) return '-';
  const profile = requester.profile;
  if (profile) return `${profile.firstName} ${profile.lastName}`.trim();
  return requester.employeeNo;
}
