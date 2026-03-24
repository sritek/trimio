/**
 * Dashboard Types
 * Types for Command Center dashboard
 */

import type { FloorViewStatus } from './stations';

export interface Station {
  id: string;
  name: string;
  stationType: {
    id: string;
    name: string;
    color: string;
  };
  displayOrder: number;
  status: FloorViewStatus;
  appointment: {
    id: string;
    customerName: string;
    stylistName: string | null;
    assistantNames: string[];
    services: string[];
    startedAt: string | null;
    estimatedEndTime: string | null;
    scheduledTime: string;
    delayMinutes: number; // Minutes late the appointment started
    elapsedMinutes: number | null;
    remainingMinutes: number | null;
    progressPercent: number | null;
    isOvertime: boolean;
  } | null;
}

export interface UpcomingAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  scheduledTime: string;
  services: string[];
  stylistName: string;
  status: 'booked' | 'confirmed' | 'checked_in';
  isLate: boolean;
}

export interface WalkInEntry {
  id: string;
  tokenNumber: number;
  customerName: string;
  services: string[];
  waitTime: number;
  status: 'waiting' | 'called' | 'serving';
}

export interface AttentionItem {
  id: string;
  type:
    | 'late_arrival'
    | 'pending_checkout'
    | 'walk_in_waiting'
    | 'low_stock'
    | 'pending_approval'
    | 'no_show_risk';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityType: 'appointment' | 'customer' | 'inventory' | 'expense';
  entityId: string;
  createdAt: string;
}

export interface TimelineAppointment {
  id: string;
  startTime: string;
  endTime: string;
  customerName: string;
  status: string;
}

export interface StylistSchedule {
  stylistId: string;
  stylistName: string;
  avatar: string | null;
  appointments: TimelineAppointment[];
}

// Alias for LiveTimeline component
export type TimelineEntry = StylistSchedule;

export interface QuickStats {
  todayRevenue: number;
  revenueChange: number;
  appointmentsCompleted: number;
  appointmentsRemaining: number;
  walkInsServed: number;
  averageWaitTime: number;
  noShows: number;
  occupancyRate: number;
}

export interface CommandCenterData {
  stats: QuickStats;
  stations: Station[];
  nextUp: {
    appointments: UpcomingAppointment[];
    walkIns: WalkInEntry[];
  };
  attentionItems: AttentionItem[];
  timeline: StylistSchedule[];
}
