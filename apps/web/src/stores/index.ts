/**
 * Stores Barrel Export
 */

export * from './auth-store';
export * from './ui-store';
export * from './slide-over-store';
export * from './notification-store';
// Export calendar-store with renamed types to avoid conflict with appointments-ui-store
export {
  useCalendarStore,
  useCalendarView,
  useCalendarDate,
  useCalendarDragState,
  useCalendarFilters,
  useCalendarIsDragging,
  type CalendarView as ResourceCalendarView,
  type TimeSlotInterval,
  type FilterableAppointmentStatus,
  type DragState,
  type CalendarFilters,
} from './calendar-store';
export * from './appointments-ui-store';
export * from './multi-service-store';
