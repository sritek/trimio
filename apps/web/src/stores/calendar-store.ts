/**
 * Calendar Store
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 5.1, 5.8, 5.10
 *
 * Manages calendar state including:
 * - View mode (day/week)
 * - Selected date
 * - Time slot interval
 * - Drag state for appointments
 * - Filter state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { format, startOfDay } from 'date-fns';

export type CalendarView = 'day' | 'week';
export type TimeSlotInterval = 15 | 30 | 60;
export type FilterableAppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface DragState {
  isDragging: boolean;
  appointmentId: string | null;
  originalStylistId: string | null;
  originalTime: string | null;
  targetStylistId: string | null;
  targetTime: string | null;
}

export interface CalendarFilters {
  stylistIds: string[];
  statuses: FilterableAppointmentStatus[];
}

interface CalendarState {
  view: CalendarView;
  selectedDate: string; // ISO date string
  timeSlotInterval: TimeSlotInterval;
  workingHours: { start: string; end: string };
  dragState: DragState;
  filters: CalendarFilters;
  selectedStylistId: string | null; // For mobile single-stylist view

  // Actions
  setView: (view: CalendarView) => void;
  setSelectedDate: (date: Date | string) => void;
  setTimeSlotInterval: (interval: TimeSlotInterval) => void;
  setWorkingHours: (hours: { start: string; end: string }) => void;

  // Drag actions
  startDrag: (appointmentId: string, stylistId: string, time: string) => void;
  updateDragTarget: (stylistId: string | null, time: string | null) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  // Filter actions
  setFilters: (filters: Partial<CalendarFilters>) => void;
  clearFilters: () => void;
  toggleStylistFilter: (stylistId: string) => void;
  toggleStatusFilter: (status: FilterableAppointmentStatus) => void;

  // Mobile
  setSelectedStylist: (stylistId: string | null) => void;

  // Navigation
  goToToday: () => void;
  goToNextDay: () => void;
  goToPreviousDay: () => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
}

const initialDragState: DragState = {
  isDragging: false,
  appointmentId: null,
  originalStylistId: null,
  originalTime: null,
  targetStylistId: null,
  targetTime: null,
};

const initialFilters: CalendarFilters = {
  stylistIds: [],
  statuses: [],
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      view: 'day',
      selectedDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
      timeSlotInterval: 60,
      workingHours: { start: '09:00', end: '21:00' },
      dragState: initialDragState,
      filters: initialFilters,
      selectedStylistId: null,

      setView: (view) => set({ view }),

      setSelectedDate: (date) => {
        const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
        set({ selectedDate: dateStr });
      },

      setTimeSlotInterval: (interval) => set({ timeSlotInterval: interval }),

      setWorkingHours: (hours) => set({ workingHours: hours }),

      // Drag actions
      startDrag: (appointmentId, stylistId, time) => {
        set({
          dragState: {
            isDragging: true,
            appointmentId,
            originalStylistId: stylistId,
            originalTime: time,
            targetStylistId: stylistId,
            targetTime: time,
          },
        });
      },

      updateDragTarget: (stylistId, time) => {
        set((state) => ({
          dragState: {
            ...state.dragState,
            targetStylistId: stylistId,
            targetTime: time,
          },
        }));
      },

      endDrag: () => {
        set({ dragState: initialDragState });
      },

      cancelDrag: () => {
        set({ dragState: initialDragState });
      },

      // Filter actions
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      clearFilters: () => {
        set({ filters: initialFilters });
      },

      toggleStylistFilter: (stylistId) => {
        set((state) => {
          const current = state.filters.stylistIds;
          const updated = current.includes(stylistId)
            ? current.filter((id) => id !== stylistId)
            : [...current, stylistId];
          return {
            filters: { ...state.filters, stylistIds: updated },
          };
        });
      },

      toggleStatusFilter: (status) => {
        set((state) => {
          const current = state.filters.statuses;
          const updated = current.includes(status)
            ? current.filter((s) => s !== status)
            : [...current, status];
          return {
            filters: { ...state.filters, statuses: updated },
          };
        });
      },

      // Mobile
      setSelectedStylist: (stylistId) => set({ selectedStylistId: stylistId }),

      // Navigation
      goToToday: () => {
        set({ selectedDate: format(startOfDay(new Date()), 'yyyy-MM-dd') });
      },

      goToNextDay: () => {
        const current = new Date(get().selectedDate);
        current.setDate(current.getDate() + 1);
        set({ selectedDate: format(current, 'yyyy-MM-dd') });
      },

      goToPreviousDay: () => {
        const current = new Date(get().selectedDate);
        current.setDate(current.getDate() - 1);
        set({ selectedDate: format(current, 'yyyy-MM-dd') });
      },

      goToNextWeek: () => {
        const current = new Date(get().selectedDate);
        current.setDate(current.getDate() + 7);
        set({ selectedDate: format(current, 'yyyy-MM-dd') });
      },

      goToPreviousWeek: () => {
        const current = new Date(get().selectedDate);
        current.setDate(current.getDate() - 7);
        set({ selectedDate: format(current, 'yyyy-MM-dd') });
      },
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        view: state.view,
        timeSlotInterval: state.timeSlotInterval,
      }),
    }
  )
);

// Selector hooks
export const useCalendarView = () => useCalendarStore((state) => state.view);
export const useCalendarDate = () => useCalendarStore((state) => state.selectedDate);
export const useCalendarDragState = () => useCalendarStore((state) => state.dragState);
export const useCalendarFilters = () => useCalendarStore((state) => state.filters);
export const useCalendarIsDragging = () => useCalendarStore((state) => state.dragState.isDragging);
