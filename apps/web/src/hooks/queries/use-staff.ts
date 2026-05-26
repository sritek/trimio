/**
 * Staff Management Query Hooks
 */

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { api } from '@/lib/api/client';
import type {
  StaffProfile,
  Attendance,
  AttendanceSummary,
  DailyAttendanceResponse,
  Leave,
  LeaveBalance,
  Commission,
  CommissionSummary,
  StaffDeduction,
  Payroll,
  Payslip,
  CreateStaffInput,
  UpdateStaffInput,
  CheckInInput,
  CheckOutInput,
  ManualAttendanceInput,
  ApplyLeaveInput,
  AddDeductionInput,
  GeneratePayrollInput,
} from '@/types/staff';

// ============================================
// Query Keys
// ============================================

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...staffKeys.lists(), filters] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (id: string) => [...staffKeys.details(), id] as const,
  attendance: () => [...staffKeys.all, 'attendance'] as const,
  attendanceList: (filters: Record<string, unknown>) =>
    [...staffKeys.attendance(), 'list', filters] as const,
  attendanceSummary: (userId: string, startDate: string, endDate: string) =>
    [...staffKeys.attendance(), 'summary', userId, startDate, endDate] as const,
  attendanceDaily: (date: string, branchId?: string) =>
    [...staffKeys.attendance(), 'daily', date, branchId] as const,
  leaves: () => [...staffKeys.all, 'leaves'] as const,
  leaveList: (filters: Record<string, unknown>) =>
    [...staffKeys.leaves(), 'list', filters] as const,
  leaveBalance: (userId: string, financialYear?: string) =>
    [...staffKeys.leaves(), 'balance', userId, financialYear] as const,
  commissions: () => [...staffKeys.all, 'commissions'] as const,
  commissionList: (filters: Record<string, unknown>) =>
    [...staffKeys.commissions(), 'list', filters] as const,
  commissionSummary: (userId: string, startDate: string, endDate: string) =>
    [...staffKeys.commissions(), 'summary', userId, startDate, endDate] as const,
  deductions: (userId: string) => [...staffKeys.all, 'deductions', userId] as const,
  payroll: () => [...staffKeys.all, 'payroll'] as const,
  payrollList: (filters: Record<string, unknown>) =>
    [...staffKeys.payroll(), 'list', filters] as const,
  payrollDetail: (id: string) => [...staffKeys.payroll(), 'detail', id] as const,
  payslips: () => [...staffKeys.all, 'payslips'] as const,
  payslipList: (filters: Record<string, unknown>) =>
    [...staffKeys.payslips(), 'list', filters] as const,
  payslipDetail: (id: string) => [...staffKeys.payslips(), 'detail', id] as const,
};

// ============================================
// Staff Profile Hooks
// ============================================

interface ListStaffParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  role?: string;
  isActive?: boolean;
  employmentType?: string;
}

export function useStaffList(params: ListStaffParams = {}) {
  return useQuery({
    queryKey: staffKeys.list(params as Record<string, unknown>),
    queryFn: () => api.getPaginated<StaffProfile>('/staff', params as Record<string, unknown>),
  });
}

export function useStaffDetail(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => api.get<StaffProfile>(`/staff/${id}`),
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStaffInput) => api.post<{ staff: StaffProfile }>('/staff', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      // Invalidate limit counts to update the Add Staff button state immediately
      queryClient.invalidateQueries({ queryKey: ['limit-counts'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateStaffInput & { id: string }) =>
      api.patch<StaffProfile>(`/staff/${id}`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) });
    },
  });
}

export function useDeactivateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      // Invalidate limit counts since deactivating frees up a user slot
      queryClient.invalidateQueries({ queryKey: ['limit-counts'] });
    },
  });
}

export function useReactivateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<StaffProfile>(`/staff/${id}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      // Invalidate limit counts since reactivating uses a user slot
      queryClient.invalidateQueries({ queryKey: ['limit-counts'] });
    },
  });
}

// ============================================
// Attendance Hooks
// ============================================

interface ListAttendanceParams {
  page?: number;
  limit?: number;
  branchId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export function useAttendanceList(params: ListAttendanceParams = {}) {
  return useQuery({
    queryKey: staffKeys.attendanceList(params as Record<string, unknown>),
    queryFn: () =>
      api.getPaginated<Attendance>('/staff/attendance', params as Record<string, unknown>),
  });
}

export function useDailyAttendance(date: string, branchId?: string) {
  return useQuery({
    queryKey: staffKeys.attendanceDaily(date, branchId),
    queryFn: () =>
      api.get<DailyAttendanceResponse>('/staff/attendance/daily', {
        date,
        ...(branchId && { branchId }),
      }),
    enabled: !!date,
  });
}

/**
 * Fetch daily attendance for every date in a range using parallel queries.
 * Each date is cached individually. Returns merged rows + combined loading/error state.
 */
export function useDailyAttendanceRange(dateFrom: string, dateTo: string, branchId?: string) {
  // Build array of date strings in the range
  const dates: string[] = [];
  const start = new Date(dateFrom + 'T00:00:00');
  const end = new Date(dateTo + 'T00:00:00');
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(format(cursor, 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }

  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: staffKeys.attendanceDaily(date, branchId),
      queryFn: () =>
        api.get<DailyAttendanceResponse>('/staff/attendance/daily', {
          date,
          ...(branchId && { branchId }),
        }),
      enabled: !!date,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;

  return { results, dates, isLoading, error };
}

export function useAttendanceSummary(
  userId: string,
  startDate: string,
  endDate: string,
  branchId?: string
) {
  return useQuery({
    queryKey: staffKeys.attendanceSummary(userId, startDate, endDate),
    queryFn: () =>
      api.get<AttendanceSummary>(`/staff/${userId}/attendance/summary`, {
        startDate,
        endDate,
        branchId,
      }),
    enabled: !!userId && !!startDate && !!endDate,
  });
}

export function useStaffCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckInInput) =>
      api.post<{ attendance: Attendance }>('/staff/attendance/check-in', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
    },
  });
}

export function useStaffCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckOutInput) =>
      api.post<{ attendance: Attendance }>('/staff/attendance/check-out', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManualAttendanceInput) =>
      api.post<{ attendance: Attendance }>('/staff/attendance/manual', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
    },
  });
}

// ============================================
// Leave Hooks
// ============================================

interface ListLeavesParams {
  page?: number;
  limit?: number;
  userId?: string;
  branchId?: string;
  status?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
}

export function useLeaveList(params: ListLeavesParams = {}) {
  return useQuery({
    queryKey: staffKeys.leaveList(params as Record<string, unknown>),
    queryFn: () => api.getPaginated<Leave>('/staff/leaves', params as Record<string, unknown>),
  });
}

export function useLeaveBalance(userId: string, financialYear?: string) {
  return useQuery({
    queryKey: staffKeys.leaveBalance(userId, financialYear),
    queryFn: () => api.get<LeaveBalance[]>(`/staff/${userId}/leave-balance`, { financialYear }),
    enabled: !!userId,
  });
}

export function useApplyLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplyLeaveInput) => api.post<Leave>('/staff/leaves', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      api.post<Leave>(`/staff/leaves/${id}/approve`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<Leave>(`/staff/leaves/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Leave>(`/staff/leaves/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
}

// ============================================
// Commission Hooks
// ============================================

interface ListCommissionsParams {
  page?: number;
  limit?: number;
  userId?: string;
  branchId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function useCommissionList(params: ListCommissionsParams = {}) {
  return useQuery({
    queryKey: staffKeys.commissionList(params as Record<string, unknown>),
    queryFn: () =>
      api.getPaginated<Commission>('/staff/commissions', params as Record<string, unknown>),
  });
}

export function useCommissionSummary(userId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: staffKeys.commissionSummary(userId, startDate, endDate),
    queryFn: () =>
      api.get<CommissionSummary>(`/staff/${userId}/commissions/summary`, {
        startDate,
        endDate,
      }),
    enabled: !!userId && !!startDate && !!endDate,
  });
}

export function useApproveCommissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commissionIds: string[]) =>
      api.post<{ approvedCount: number }>('/staff/commissions/approve', { commissionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.commissions() });
    },
  });
}

// ============================================
// Deduction Hooks
// ============================================

export function useDeductionList(userId: string) {
  return useQuery({
    queryKey: staffKeys.deductions(userId),
    queryFn: () => api.get<StaffDeduction[]>(`/staff/${userId}/deductions`),
    enabled: !!userId,
  });
}

export function useAddDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, ...input }: AddDeductionInput & { userId: string }) =>
      api.post<StaffDeduction>(`/staff/${userId}/deductions`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.deductions(variables.userId) });
    },
  });
}

export function useUpdateDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, monthlyDeduction }: { id: string; monthlyDeduction: number }) =>
      api.patch<StaffDeduction>(`/staff/deductions/${id}`, { monthlyDeduction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function useCancelDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/staff/deductions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

// ============================================
// Payroll Hooks
// ============================================

interface ListPayrollParams {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
  payrollMonth?: string;
}

export function usePayrollList(params: ListPayrollParams = {}) {
  return useQuery({
    queryKey: staffKeys.payrollList(params as Record<string, unknown>),
    queryFn: () => api.getPaginated<Payroll>('/staff/payroll', params as Record<string, unknown>),
  });
}

export function usePayrollDetail(id: string) {
  return useQuery({
    queryKey: staffKeys.payrollDetail(id),
    queryFn: () => api.get<Payroll>(`/staff/payroll/${id}`),
    enabled: !!id,
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GeneratePayrollInput) =>
      api.post<{ payroll: Payroll; warnings: string[] }>('/staff/payroll/generate', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.payroll() });
    },
  });
}

export function useProcessPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Payroll>(`/staff/payroll/${id}/process`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.payrollDetail(id) });
      queryClient.invalidateQueries({ queryKey: staffKeys.payrollList({}) });
    },
  });
}

export function useApprovePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Payroll>(`/staff/payroll/${id}/approve`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.payrollDetail(id) });
      queryClient.invalidateQueries({ queryKey: staffKeys.payrollList({}) });
    },
  });
}

export function useMarkPayrollPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Payroll>(`/staff/payroll/${id}/pay`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.payrollDetail(id) });
      queryClient.invalidateQueries({ queryKey: staffKeys.payrollList({}) });
    },
  });
}

// ============================================
// Payslip Hooks
// ============================================

interface ListPayslipsParams {
  page?: number;
  limit?: number;
  userId?: string;
  payPeriod?: string;
}

export function usePayslipList(params: ListPayslipsParams = {}) {
  return useQuery({
    queryKey: staffKeys.payslipList(params as Record<string, unknown>),
    queryFn: () => api.getPaginated<Payslip>('/staff/payslips', params as Record<string, unknown>),
  });
}

export function usePayslipDetail(id: string) {
  return useQuery({
    queryKey: staffKeys.payslipDetail(id),
    queryFn: () => api.get<Payslip>(`/staff/payslips/${id}`),
    enabled: !!id,
  });
}

export function usePayslipDownload() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.get<{ downloadUrl: string }>(`/staff/payslips/${id}/download`);
      return response;
    },
  });
}

export function useSendPayslipEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean }>(`/staff/payslips/${id}/send-email`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.payslipDetail(id) });
      queryClient.invalidateQueries({ queryKey: staffKeys.payslips() });
    },
  });
}

export function useSendPayslipWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ success: boolean }>(`/staff/payslips/${id}/send-whatsapp`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.payslipDetail(id) });
      queryClient.invalidateQueries({ queryKey: staffKeys.payslips() });
    },
  });
}

// ============================================
// Stylist Breaks Hooks
// ============================================

export interface StylistBreak {
  id: string;
  name: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  branchId: string;
  isActive: boolean;
}

export const breakKeys = {
  all: ['stylist-breaks'] as const,
  list: (userId: string) => [...breakKeys.all, 'list', userId] as const,
};

export function useStylistBreaks(userId: string) {
  return useQuery({
    queryKey: breakKeys.list(userId),
    queryFn: () => api.get<StylistBreak[]>(`/staff/${userId}/breaks`),
    enabled: !!userId,
  });
}

export function useCreateStylistBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      ...input
    }: {
      userId: string;
      branchId: string;
      name: string;
      dayOfWeek: number | null;
      startTime: string;
      endTime: string;
    }) => api.post<StylistBreak>(`/staff/${userId}/breaks`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: breakKeys.list(variables.userId) });
    },
  });
}

export function useDeleteStylistBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, breakId }: { userId: string; breakId: string }) =>
      api.delete<void>(`/staff/${userId}/breaks/${breakId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: breakKeys.list(variables.userId) });
    },
  });
}
