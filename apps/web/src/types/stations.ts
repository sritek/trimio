/**
 * Stations Module Types
 */

// ============================================
// Station Type Types
// ============================================

export interface StationType {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  displayOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stations: number;
  };
}

export interface CreateStationTypeInput {
  name: string;
  color?: string;
  displayOrder?: number;
}

export type UpdateStationTypeInput = Partial<CreateStationTypeInput>;

// ============================================
// Station Types
// ============================================

export type StationStatus = 'active' | 'out_of_service';

export interface Station {
  id: string;
  tenantId: string;
  branchId: string;
  stationTypeId: string;
  stationType?: StationType;
  name: string;
  displayOrder: number;
  status: StationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStationInput {
  stationTypeId: string;
  name: string;
  displayOrder?: number;
  notes?: string;
}

export type UpdateStationInput = Partial<CreateStationInput> & {
  status?: StationStatus;
};

export interface BulkCreateStationsInput {
  stations: Array<{
    stationTypeId: string;
    count: number;
  }>;
}

export interface StationFilters {
  page?: number;
  limit?: number;
  stationTypeId?: string;
  status?: StationStatus;
  search?: string;
}

// ============================================
// Floor View Types
// ============================================

export type FloorViewStatus = 'available' | 'occupied' | 'reserved' | 'out_of_service';

// Current service info for multi-service appointments
export interface CurrentServiceInfo {
  id: string;
  serviceName: string;
  sequence: number;
  status: string;
  assignedStylistId: string | null;
  assignedStylistName: string | null;
  actualStylistId: string | null;
  actualStylistName: string | null;
  // Timing fields for progress tracking
  durationMinutes: number;
  actualStartTime: string | null;
  actualEndTime: string | null;
}

// Service progress info for multi-service progress bar
export interface ServiceProgressInfo {
  id: string;
  serviceName: string;
  sequence: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'skipped';
  durationMinutes: number;
  actualStartTime: string | null;
  actualEndTime: string | null;
  /** Progress percentage for this service (0-100) */
  progressPercent: number;
  /** Elapsed time in minutes for this service */
  elapsedMinutes: number;
  /** Whether this service is overtime */
  isOvertime: boolean;
  /** Assigned stylist name (who was supposed to do it) */
  assignedStylistName: string | null;
  /** Actual stylist name (who actually did/is doing it) */
  actualStylistName: string | null;
}

// "Up Next" service for multi-service appointments
export interface UpNextService {
  id: string;
  serviceName: string;
  customerName: string;
  assignedStylistId: string | null;
  assignedStylistName: string | null;
  estimatedStartTime: string | null;
  durationMinutes: number;
  sequence: number;
}

export interface StationCard {
  id: string;
  name: string;
  stationType: {
    id: string;
    name: string;
    color: string;
  };
  displayOrder: number;
  status: FloorViewStatus;
  appointment: StationAppointment | null;
  /** Next service in sequence for multi-service appointments (backward compat) */
  upNext: UpNextService | null;
  /** All "Up Next" services (supports parallel services with same sequence) */
  upNextServices: UpNextService[];
}

export interface StationAppointment {
  id: string;
  customerName: string;
  stylistName: string | null;
  assistantNames: string[];
  services: string[];
  startedAt: string | null;
  estimatedEndTime: string | null;
  scheduledTime: string;
  scheduledDate: string; // Date in YYYY-MM-DD format
  delayMinutes: number;
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  progressPercent: number | null;
  isOvertime: boolean;
  // Multi-service fields
  /** Whether this appointment has multiple services */
  isMultiService: boolean;
  /** Total number of services in the appointment */
  serviceCount: number;
  /** Current service index (1-based) */
  currentServiceIndex: number | null;
  /** Details of the current in-progress service (for backward compat) */
  currentService: CurrentServiceInfo | null;
  /** All in-progress services on this station (for parallel services) */
  currentServices: CurrentServiceInfo[];
  /** Whether the timer is paused (between services - completed service with waiting services) */
  isPaused: boolean;
  /** Progress info for each service (for multi-service progress bar) */
  serviceProgress: ServiceProgressInfo[];
}

export interface FloorViewSummary {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  outOfService: number;
}

export interface FloorViewResponse {
  stations: StationCard[];
  summary: FloorViewSummary;
}

// ============================================
// Appointment Extension Types
// ============================================

export interface AssignStationInput {
  stationId: string;
}

export interface AddServiceInput {
  serviceId: string;
  stylistId?: string;
  quantity?: number;
}

export interface UpdateStylistsInput {
  primaryStylistId?: string;
  assistantIds?: string[];
}
