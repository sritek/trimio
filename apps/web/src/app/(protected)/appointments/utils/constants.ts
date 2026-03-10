import { FilterableAppointmentStatus } from '@/stores';
import { BookingType } from '@/types/appointments';

export const STATUS_OPTIONS: {
  value: FilterableAppointmentStatus;
  label: string;
  color: string;
}[] = [
  { value: 'booked', label: 'Booked', color: 'bg-sky-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-500' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-violet-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-slate-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'no_show', label: 'No Show', color: 'bg-rose-500' },
];

export const BOOKING_TYPE_OPTIONS: { value: BookingType; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'phone', label: 'Phone' },
  { value: 'walk_in', label: 'Walk-in' },
];
