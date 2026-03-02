/**
 * Appointments UI Store
 * Persists view state across navigation (date, view type, filters)
 */

import { format } from 'date-fns';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  // Calendar specific
  calendarView: CalendarView;

  // List specific
  listFilters: ListFiltersState;
  listSearch: string;
  listPage: number;
  listLimit: number;

  // Actions
  setCalendarView: (view: CalendarView) => void;
  setListFilters: (filters: Partial<ListFiltersState>) => void;
  setListSearch: (search: string) => void;
  setListPage: (page: number) => void;
  setListLimit: (limit: number) => void;
  resetFilters: () => void;
  resetToToday: () => void;
}

const getDefaultFilters = (): ListFiltersState => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    dateFrom: today,
    dateTo: today,
    statuses: [],
    bookingTypes: [],
    stylistIds: [],
  };
};

export const useAppointmentsUIStore = create<AppointmentsUIState>()(
  persist(
    (set) => ({
      // Initial state
      calendarView: 'week',
      listFilters: getDefaultFilters(),
      listSearch: '',
      listPage: 1,
      listLimit: 20,

      // Actions
      setCalendarView: (view) => set({ calendarView: view }),

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

      resetFilters: () =>
        set({
          listFilters: getDefaultFilters(),
          listSearch: '',
          listPage: 1,
        }),

      resetToToday: () =>
        set({
          listFilters: getDefaultFilters(),
          listSearch: '',
          listPage: 1,
        }),
    }),
    {
      name: 'appointments-ui-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        calendarView: state.calendarView,
      }),
    }
  )
);
