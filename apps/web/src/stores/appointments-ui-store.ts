/**
 * Appointments UI Store
 * Manages list view specific state (filters, search, pagination)
 * Date is synced from calendar-store for consistency between views
 */

import { create } from 'zustand';

export type CalendarView = 'day' | 'week' | 'month';

/**
 * List filters state
 * - Multi-select within same group = OR (e.g., status: booked OR confirmed)
 * - Across groups = AND (e.g., status: booked AND bookingType: online)
 */
export interface ListFiltersState {
  dateFrom: string; // yyyy-MM-dd
  dateTo: string; // yyyy-MM-dd
  statuses: string[]; // Multi-select (OR within group)
  bookingTypes: string[]; // Multi-select (OR within group)
  stylistIds: string[]; // Multi-select (OR within group)
}

interface AppointmentsUIState {
  // List specific
  listFilters: ListFiltersState;
  listSearch: string;
  listPage: number;
  listLimit: number;

  // Actions
  setListFilters: (filters: Partial<ListFiltersState>) => void;
  setListSearch: (search: string) => void;
  setListPage: (page: number) => void;
  setListLimit: (limit: number) => void;
  resetFilters: (date: string) => void;
  syncDateFromCalendar: (date: string) => void;
}

export const useAppointmentsUIStore = create<AppointmentsUIState>()((set) => ({
  // Initial state - dates will be synced from calendar store
  listFilters: {
    dateFrom: '',
    dateTo: '',
    statuses: [],
    bookingTypes: [],
    stylistIds: [],
  },
  listSearch: '',
  listPage: 1,
  listLimit: 20,

  // Actions
  setListFilters: (filters) =>
    set((state) => ({
      listFilters: { ...state.listFilters, ...filters },
      listPage: 1, // Reset page when filters change
    })),

  setListSearch: (search) =>
    set({
      listSearch: search,
      listPage: 1,
    }),

  setListPage: (page) => set({ listPage: page }),

  setListLimit: (limit) => set({ listLimit: limit }),

  resetFilters: (date) =>
    set({
      listFilters: {
        dateFrom: date,
        dateTo: date,
        statuses: [],
        bookingTypes: [],
        stylistIds: [],
      },
      listSearch: '',
      listPage: 1,
    }),

  // Sync date from calendar store when switching views
  syncDateFromCalendar: (date) =>
    set((state) => ({
      listFilters: {
        ...state.listFilters,
        dateFrom: date,
        dateTo: date,
      },
      listPage: 1,
    })),
}));
