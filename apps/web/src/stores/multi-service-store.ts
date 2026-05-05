/**
 * Multi-Service Appointment Store
 * Manages state for multi-service appointment operations
 */

import { create } from 'zustand';

// ============================================
// Types
// ============================================

export interface ServiceInProgress {
  serviceId: string;
  serviceName: string;
  stationId: string;
  stationName: string;
  startedAt: Date;
  stylistId?: string;
  stylistName?: string;
}

interface MultiServiceState {
  // Active appointment being managed
  activeAppointmentId: string | null;
  activeAppointmentCustomerName: string | null;

  // Services currently in progress (keyed by serviceId)
  servicesInProgress: Map<string, ServiceInProgress>;

  // Loading states
  loadingServiceId: string | null;

  // Actions
  setActiveAppointment: (appointmentId: string | null, customerName?: string | null) => void;
  startService: (service: ServiceInProgress) => void;
  completeService: (serviceId: string) => void;
  skipService: (serviceId: string) => void;
  setLoadingService: (serviceId: string | null) => void;
  clearAll: () => void;
}

// ============================================
// Store
// ============================================

export const useMultiServiceStore = create<MultiServiceState>()((set) => ({
  // Initial state
  activeAppointmentId: null,
  activeAppointmentCustomerName: null,
  servicesInProgress: new Map(),
  loadingServiceId: null,

  // Actions
  setActiveAppointment: (appointmentId, customerName = null) =>
    set({
      activeAppointmentId: appointmentId,
      activeAppointmentCustomerName: customerName,
      // Clear services when changing appointments
      servicesInProgress: appointmentId ? new Map() : new Map(),
    }),

  startService: (service) =>
    set((state) => {
      const newMap = new Map(state.servicesInProgress);
      newMap.set(service.serviceId, service);
      return { servicesInProgress: newMap, loadingServiceId: null };
    }),

  completeService: (serviceId) =>
    set((state) => {
      const newMap = new Map(state.servicesInProgress);
      newMap.delete(serviceId);
      return { servicesInProgress: newMap, loadingServiceId: null };
    }),

  skipService: (serviceId) =>
    set((state) => {
      const newMap = new Map(state.servicesInProgress);
      newMap.delete(serviceId);
      return { servicesInProgress: newMap, loadingServiceId: null };
    }),

  setLoadingService: (serviceId) => set({ loadingServiceId: serviceId }),

  clearAll: () =>
    set({
      activeAppointmentId: null,
      activeAppointmentCustomerName: null,
      servicesInProgress: new Map(),
      loadingServiceId: null,
    }),
}));

// ============================================
// Selectors
// ============================================

/**
 * Check if a specific service is in progress
 */
export const selectIsServiceInProgress = (serviceId: string) => (state: MultiServiceState) =>
  state.servicesInProgress.has(serviceId);

/**
 * Get service in progress details
 */
export const selectServiceInProgress = (serviceId: string) => (state: MultiServiceState) =>
  state.servicesInProgress.get(serviceId);

/**
 * Get count of services in progress
 */
export const selectServicesInProgressCount = (state: MultiServiceState) =>
  state.servicesInProgress.size;

/**
 * Check if any service is loading
 */
export const selectIsAnyServiceLoading = (state: MultiServiceState) =>
  state.loadingServiceId !== null;
