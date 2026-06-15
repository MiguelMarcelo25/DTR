import { api } from '@/lib/api';
import type { ApiResponse, Paginated, PaginationMeta } from '@/types';

export type TicketStatus = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'ACCOUNT' | 'FEEDBACK' | 'OTHER';

export const TICKET_STATUSES: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const TICKET_PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const TICKET_CATEGORIES: TicketCategory[] = ['GENERAL', 'TECHNICAL', 'BILLING', 'ACCOUNT', 'FEEDBACK', 'OTHER'];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export interface TicketClient {
  id: string;
  email: string;
  clientProfile: { fullName: string; company: string | null; phone: string | null } | null;
}
export interface TicketAssignee {
  id: string;
  employeeNo: string;
  profile: { firstName: string; lastName: string; photoUrl: string | null } | null;
}

export interface TicketSummary {
  id: string;
  ticketNo: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  boardOrder: number;
  createdAt: string;
  client: TicketClient;
  assignee: TicketAssignee | null;
  _count?: { comments: number };
}

export interface TicketComment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    email: string;
    clientProfile: { fullName: string } | null;
    employee: { profile: { firstName: string; lastName: string } | null } | null;
  };
}

export interface TicketEvent {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  events: TicketEvent[];
}

export interface Board {
  columns: { status: TicketStatus; tickets: TicketSummary[] }[];
}

export interface ListTicketParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigneeId?: string;
}

export async function listTickets(params: ListTicketParams): Promise<Paginated<TicketSummary>> {
  const res = await api.get<ApiResponse<TicketSummary[]>>('/support/tickets', { params });
  return { items: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function getBoard(): Promise<Board> {
  const res = await api.get<ApiResponse<Board>>('/support/board');
  return res.data.data;
}

export interface SupportStats {
  open: number;
  unassigned: number;
  urgent: number;
  byStatus: { status: TicketStatus; _count: { _all: number } }[];
}
export async function getStats(): Promise<SupportStats> {
  const res = await api.get<ApiResponse<SupportStats>>('/support/stats');
  return res.data.data;
}

export async function getTicket(id: string): Promise<TicketDetail> {
  const res = await api.get<ApiResponse<TicketDetail>>(`/support/tickets/${id}`);
  return res.data.data;
}

export async function createTicket(input: {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}): Promise<TicketSummary> {
  const res = await api.post<ApiResponse<TicketSummary>>('/support/tickets', input);
  return res.data.data;
}

export async function updateTicket(id: string, data: Partial<{ subject: string; description: string; category: TicketCategory; priority: TicketPriority }>) {
  const res = await api.put<ApiResponse<TicketSummary>>(`/support/tickets/${id}`, data);
  return res.data.data;
}

export async function moveTicket(id: string, status: TicketStatus, boardOrder?: number) {
  const res = await api.put<ApiResponse<TicketSummary>>(`/support/tickets/${id}/move`, { status, boardOrder });
  return res.data.data;
}

export async function assignTicket(id: string, assigneeId: string | null) {
  const res = await api.put<ApiResponse<TicketSummary>>(`/support/tickets/${id}/assign`, { assigneeId });
  return res.data.data;
}

export async function addComment(id: string, body: string, isInternal = false) {
  const res = await api.post<ApiResponse<TicketComment>>(`/support/tickets/${id}/comments`, { body, isInternal });
  return res.data.data;
}

/** Staff options for the assignee picker (reuses the employees endpoint). */
export interface AssignableStaff {
  id: string;
  name: string;
}
export async function fetchAssignableStaff(): Promise<AssignableStaff[]> {
  const res = await api.get<ApiResponse<Array<{ id: string; employeeNo: string; profile: { firstName: string; lastName: string } | null }>>>(
    '/employees',
    { params: { limit: 100 } },
  );
  return res.data.data.map((e) => ({
    id: e.id,
    name: e.profile ? `${e.profile.firstName} ${e.profile.lastName}` : e.employeeNo,
  }));
}
