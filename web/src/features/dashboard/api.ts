import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

export interface EmployeeDashboard {
  today: { date: string; attendance: unknown; status: string };
  timeClock: {
    hasTimedIn: boolean;
    hasTimedOut: boolean;
    canTimeIn: boolean;
    canTimeOut: boolean;
    timeIn: string | null;
    timeOut: string | null;
    nextAction: 'TIME_IN' | 'TIME_OUT' | 'DONE';
  };
  attendanceSummary: {
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    halfDay: number;
    holiday: number;
  };
  leaveBalanceSummary: {
    leaveTypeId: string;
    leaveType: string;
    isPaid: boolean;
    year: number;
    entitled: number;
    used: number;
    remaining: number;
  }[];
  appointmentSummary: { upcoming: number };
  latestPayslip: {
    payrollId: string;
    period: string | null;
    netPay: number;
    status: string;
    payslipNo: string | null;
    releasedAt: string | null;
  } | null;
  unreadNotifications: number;
  profileCompletion: {
    percentage: number;
    filledFields: number;
    totalFields: number;
    sections: Record<string, boolean>;
  };
}

export interface AdminDashboard {
  totals: {
    totalEmployees: number;
    activeEmployees: number;
    lateToday: number;
    absentToday: number;
    pendingLeaveRequests: number;
    pendingAttendanceCorrections: number;
    pendingAppointments: number;
  };
  payroll: { current: { id: string; name: string; status: string } | null };
  recentActivities: {
    id: string;
    action: string;
    module: string;
    description: string | null;
    createdAt: string;
    user: { email: string } | null;
  }[];
  charts: {
    attendanceTrend: { date: string; present: number; late: number; absent: number }[];
    headcountByDepartment: { department: string; count: number }[];
  };
}

export interface HrDashboard {
  pendingLeaveRequests: number;
  pendingAttendanceCorrections: number;
  pendingProfileUpdateRequests: number;
  newHiresThisMonth: number;
  documentExpirations: { withinDays: number; documents: number; trainings: number; total: number };
  headcountByDepartment: { department: string; count: number }[];
}

export async function fetchEmployeeDashboard(): Promise<EmployeeDashboard> {
  const res = await api.get<ApiResponse<EmployeeDashboard>>('/dashboard/employee');
  return res.data.data;
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  const res = await api.get<ApiResponse<AdminDashboard>>('/dashboard/admin');
  return res.data.data;
}

export async function fetchHrDashboard(): Promise<HrDashboard> {
  const res = await api.get<ApiResponse<HrDashboard>>('/dashboard/hr');
  return res.data.data;
}
