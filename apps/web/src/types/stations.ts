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
  icon: string | null;
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
  icon?: string;
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

export interface StationCard {
  id: string;
  name: string;
  stationType: {
    id: string;
    name: string;
    icon: string | null;
    color: string;
  };
  displayOrder: number;
  status: FloorViewStatus;
  appointment: StationAppointment | null;
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
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  progressPercent: number | null;
  isOvertime: boolean;
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
