/**
 * Multi-Service Appointment Utilities
 *
 * Core logic for handling appointments with multiple services, including:
 * - Status derivation from child services
 * - Status transition validation
 * - Duration calculations (sequential and parallel)
 * - Price calculations
 */

import type { AppointmentStatus } from '@prisma/client';

// Service status type (not an enum in Prisma, stored as string)
export type ServiceStatus = 'waiting' | 'in_progress' | 'completed' | 'skipped';

// Valid service status transitions
const VALID_SERVICE_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  waiting: ['in_progress', 'skipped'],
  in_progress: ['completed', 'skipped'],
  completed: [], // Terminal state
  skipped: [], // Terminal state
};

/**
 * Service data needed for status derivation
 */
export interface ServiceForStatusDerivation {
  status: string;
}

/**
 * Service data needed for duration calculation
 */
export interface ServiceForDurationCalculation {
  sequence: number;
  runParallel: boolean;
  durationMinutes: number;
}

/**
 * Service data needed for price calculation
 */
export interface ServiceForPriceCalculation {
  unitPrice: number | { toNumber(): number };
  quantity: number;
  discountAmount: number | { toNumber(): number };
  taxAmount: number | { toNumber(): number };
}

/**
 * Derive appointment status from child service statuses
 *
 * Rules (from design document):
 * - All skipped → cancelled
 * - Any in_progress → in_progress
 * - All completed (or completed + skipped with at least one completed) → completed
 * - All waiting and customer checked in → checked_in
 * - Default: return the provided fallback status
 *
 * @param services - Array of services with status
 * @param isCheckedIn - Whether the customer has checked in
 * @param fallbackStatus - Status to return if no derivation rule matches
 * @returns Derived appointment status
 */
export function deriveAppointmentStatus(
  services: ServiceForStatusDerivation[],
  isCheckedIn: boolean = false,
  fallbackStatus: AppointmentStatus = 'booked'
): AppointmentStatus {
  if (services.length === 0) {
    return fallbackStatus;
  }

  const statuses = services.map((s) => s.status as ServiceStatus);

  // Property 17: All skipped → cancelled
  if (statuses.every((s) => s === 'skipped')) {
    return 'cancelled';
  }

  // Property 15: Any in_progress → in_progress
  if (statuses.some((s) => s === 'in_progress')) {
    return 'in_progress';
  }

  // Property 16: All completed (or completed + skipped with at least one completed) → completed
  const hasCompleted = statuses.some((s) => s === 'completed');
  const allCompletedOrSkipped = statuses.every((s) => s === 'completed' || s === 'skipped');
  if (hasCompleted && allCompletedOrSkipped) {
    return 'completed';
  }

  // All waiting and customer checked in → checked_in
  const allWaiting = statuses.every((s) => s === 'waiting');
  if (allWaiting && isCheckedIn) {
    return 'checked_in';
  }

  // Default: return fallback status
  return fallbackStatus;
}

/**
 * Validate a service status transition
 *
 * Valid transitions (Property 18):
 * - waiting → in_progress
 * - waiting → skipped
 * - in_progress → completed
 * - in_progress → skipped
 *
 * @param currentStatus - Current service status
 * @param newStatus - Desired new status
 * @returns Object with isValid flag and error message if invalid
 */
export function validateServiceStatusTransition(
  currentStatus: string,
  newStatus: string
): { isValid: boolean; errorCode?: string; errorMessage?: string } {
  const current = currentStatus as ServiceStatus;
  const next = newStatus as ServiceStatus;

  // Check if current status is valid
  if (!VALID_SERVICE_TRANSITIONS[current]) {
    return {
      isValid: false,
      errorCode: 'INVALID_CURRENT_STATUS',
      errorMessage: `Invalid current status: ${currentStatus}`,
    };
  }

  // Check if transition is allowed
  const allowedTransitions = VALID_SERVICE_TRANSITIONS[current];
  if (!allowedTransitions.includes(next)) {
    return {
      isValid: false,
      errorCode: 'INVALID_STATUS_TRANSITION',
      errorMessage: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
    };
  }

  return { isValid: true };
}

/**
 * Calculate total duration for multi-service appointments
 *
 * Rules:
 * - Property 2: Sequential services (different sequence numbers) → sum of durations
 * - Property 3: Parallel services (same sequence number) → max duration of the group
 *
 * @param services - Array of services with sequence, runParallel, and durationMinutes
 * @param gapMinutes - Optional gap between sequential services (default: 0)
 * @returns Total duration in minutes
 */
export function calculateTotalDuration(
  services: ServiceForDurationCalculation[],
  gapMinutes: number = 0
): number {
  if (services.length === 0) {
    return 0;
  }

  // Group services by sequence number
  const sequenceGroups = new Map<number, ServiceForDurationCalculation[]>();

  for (const service of services) {
    const existing = sequenceGroups.get(service.sequence) || [];
    existing.push(service);
    sequenceGroups.set(service.sequence, existing);
  }

  // Sort sequence numbers
  const sortedSequences = Array.from(sequenceGroups.keys()).sort((a, b) => a - b);

  let totalDuration = 0;

  for (let i = 0; i < sortedSequences.length; i++) {
    const sequence = sortedSequences[i];
    const group = sequenceGroups.get(sequence)!;

    // For parallel services (same sequence), take the max duration
    // For sequential services, this will be a single-item group
    const groupDuration = Math.max(...group.map((s) => s.durationMinutes));
    totalDuration += groupDuration;

    // Add gap between sequential groups (not after the last one)
    if (i < sortedSequences.length - 1 && gapMinutes > 0) {
      totalDuration += gapMinutes;
    }
  }

  return totalDuration;
}

/**
 * Calculate scheduled times for each service based on appointment start time
 *
 * @param services - Array of services with sequence, runParallel, and durationMinutes
 * @param appointmentStartTime - Start time of the appointment
 * @param gapMinutes - Optional gap between sequential services (default: 0)
 * @returns Array of services with scheduledStartTime and scheduledEndTime
 */
export function calculateServiceScheduledTimes<T extends ServiceForDurationCalculation>(
  services: T[],
  appointmentStartTime: Date,
  gapMinutes: number = 0
): (T & { scheduledStartTime: Date; scheduledEndTime: Date })[] {
  if (services.length === 0) {
    return [];
  }

  // Group services by sequence number
  const sequenceGroups = new Map<number, (T & { index: number })[]>();

  services.forEach((service, index) => {
    const existing = sequenceGroups.get(service.sequence) || [];
    existing.push({ ...service, index });
    sequenceGroups.set(service.sequence, existing);
  });

  // Sort sequence numbers
  const sortedSequences = Array.from(sequenceGroups.keys()).sort((a, b) => a - b);

  const result: (T & { scheduledStartTime: Date; scheduledEndTime: Date })[] = new Array(
    services.length
  );
  let currentStartTime = new Date(appointmentStartTime);

  for (let i = 0; i < sortedSequences.length; i++) {
    const sequence = sortedSequences[i];
    const group = sequenceGroups.get(sequence)!;

    // All services in the same sequence group start at the same time
    const groupStartTime = new Date(currentStartTime);

    // Calculate end time for each service in the group
    for (const service of group) {
      const endTime = new Date(groupStartTime.getTime() + service.durationMinutes * 60 * 1000);
      result[service.index] = {
        ...service,
        scheduledStartTime: groupStartTime,
        scheduledEndTime: endTime,
      };
    }

    // Next group starts after the longest service in this group
    const maxDuration = Math.max(...group.map((s) => s.durationMinutes));
    currentStartTime = new Date(groupStartTime.getTime() + maxDuration * 60 * 1000);

    // Add gap between sequential groups (not after the last one)
    if (i < sortedSequences.length - 1 && gapMinutes > 0) {
      currentStartTime = new Date(currentStartTime.getTime() + gapMinutes * 60 * 1000);
    }
  }

  return result;
}

/**
 * Helper to convert Decimal or number to number
 */
function toNumber(value: number | { toNumber(): number }): number {
  return typeof value === 'number' ? value : value.toNumber();
}

/**
 * Calculate total price for multi-service appointments
 *
 * Property 4: Total price = sum of (unitPrice × quantity - discountAmount + taxAmount)
 *
 * @param services - Array of services with pricing information
 * @returns Object with subtotal, taxAmount, and totalAmount
 */
export function calculateTotalPrice(services: ServiceForPriceCalculation[]): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
} {
  let subtotal = 0;
  let taxAmount = 0;

  for (const service of services) {
    const unitPrice = toNumber(service.unitPrice);
    const discount = toNumber(service.discountAmount);
    const tax = toNumber(service.taxAmount);

    const serviceSubtotal = unitPrice * service.quantity - discount;
    subtotal += serviceSubtotal;
    taxAmount += tax;
  }

  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
  };
}

/**
 * Validate parallel services have different stylists
 *
 * Property 14: Parallel services (same sequence number) must have different assignedStylistId values
 *
 * @param services - Array of services with sequence and assignedStylistId
 * @returns Object with isValid flag and error details if invalid
 */
export function validateParallelServiceStylists(
  services: { sequence: number; assignedStylistId?: string | null }[]
): { isValid: boolean; errorCode?: string; errorMessage?: string; conflictingSequence?: number } {
  // Group services by sequence number
  const sequenceGroups = new Map<number, (string | null | undefined)[]>();

  for (const service of services) {
    const existing = sequenceGroups.get(service.sequence) || [];
    existing.push(service.assignedStylistId);
    sequenceGroups.set(service.sequence, existing);
  }

  // Check each group with more than one service (parallel services)
  for (const [sequence, stylistIds] of sequenceGroups) {
    if (stylistIds.length > 1) {
      // Filter out null/undefined (unassigned stylists are allowed)
      const assignedStylists = stylistIds.filter((id) => id != null) as string[];

      // Check for duplicates
      const uniqueStylists = new Set(assignedStylists);
      if (uniqueStylists.size < assignedStylists.length) {
        return {
          isValid: false,
          errorCode: 'PARALLEL_SERVICES_SAME_STYLIST',
          errorMessage: `Parallel services in sequence ${sequence} cannot have the same assigned stylist`,
          conflictingSequence: sequence,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Get services summary counts by status
 *
 * @param services - Array of services with status
 * @returns Summary object with counts
 */
export function getServicesSummary(services: ServiceForStatusDerivation[]): {
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
  skipped: number;
} {
  const summary = {
    total: services.length,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    skipped: 0,
  };

  for (const service of services) {
    switch (service.status) {
      case 'waiting':
        summary.waiting++;
        break;
      case 'in_progress':
        summary.inProgress++;
        break;
      case 'completed':
        summary.completed++;
        break;
      case 'skipped':
        summary.skipped++;
        break;
    }
  }

  return summary;
}

/**
 * Check if a service can be started based on sequential prerequisites
 *
 * Property 24: Cannot start service with sequence N > 1 if any service with sequence N-1
 * has status "waiting" or "in_progress"
 *
 * @param serviceToStart - The service to be started
 * @param allServices - All services in the appointment
 * @returns Object with canStart flag and error details if not
 */
export function canStartService(
  serviceToStart: { id: string; sequence: number },
  allServices: { id: string; sequence: number; status: string }[]
): { canStart: boolean; errorCode?: string; errorMessage?: string } {
  // Sequence 1 can always start (no prerequisites)
  if (serviceToStart.sequence <= 1) {
    return { canStart: true };
  }

  // Check if any service with sequence N-1 is still waiting or in_progress
  const previousSequence = serviceToStart.sequence - 1;
  const previousServices = allServices.filter(
    (s) => s.sequence === previousSequence && s.id !== serviceToStart.id
  );

  const hasIncompletePrerequisite = previousServices.some(
    (s) => s.status === 'waiting' || s.status === 'in_progress'
  );

  if (hasIncompletePrerequisite) {
    return {
      canStart: false,
      errorCode: 'PREREQUISITE_NOT_COMPLETE',
      errorMessage: `Cannot start service: previous service(s) in sequence ${previousSequence} must be completed first`,
    };
  }

  return { canStart: true };
}

/**
 * Detect gaps between sequential services
 *
 * @param services - Array of services with scheduled times
 * @returns Array of gap warnings
 */
export function detectServiceGaps(
  services: {
    sequence: number;
    scheduledStartTime: Date;
    scheduledEndTime: Date;
    serviceName?: string;
  }[]
): { afterServiceIndex: number; gapMinutes: number; suggestion: string }[] {
  if (services.length <= 1) {
    return [];
  }

  // Sort by sequence
  const sorted = [...services].sort((a, b) => a.sequence - b.sequence);
  const gaps: { afterServiceIndex: number; gapMinutes: number; suggestion: string }[] = [];

  // Group by sequence to find gaps between sequence groups
  const sequenceGroups = new Map<number, (typeof sorted)[0][]>();
  for (const service of sorted) {
    const existing = sequenceGroups.get(service.sequence) || [];
    existing.push(service);
    sequenceGroups.set(service.sequence, existing);
  }

  const sortedSequences = Array.from(sequenceGroups.keys()).sort((a, b) => a - b);

  for (let i = 0; i < sortedSequences.length - 1; i++) {
    const currentSequence = sortedSequences[i];
    const nextSequence = sortedSequences[i + 1];

    const currentGroup = sequenceGroups.get(currentSequence)!;
    const nextGroup = sequenceGroups.get(nextSequence)!;

    // Find the latest end time in current group
    const latestEndTime = Math.max(...currentGroup.map((s) => s.scheduledEndTime.getTime()));

    // Find the earliest start time in next group
    const earliestStartTime = Math.min(...nextGroup.map((s) => s.scheduledStartTime.getTime()));

    const gapMs = earliestStartTime - latestEndTime;
    const gapMinutes = Math.round(gapMs / (60 * 1000));

    if (gapMinutes > 0) {
      // Find the index of the last service in the current group
      const lastServiceInGroup = currentGroup[currentGroup.length - 1];
      const afterServiceIndex = services.findIndex(
        (s) =>
          s.sequence === lastServiceInGroup.sequence &&
          s.scheduledEndTime.getTime() === lastServiceInGroup.scheduledEndTime.getTime()
      );

      gaps.push({
        afterServiceIndex,
        gapMinutes,
        suggestion: `Consider moving the next service earlier to close the ${gapMinutes} minute gap`,
      });
    }
  }

  return gaps;
}

/**
 * Service data needed for stylist availability validation
 */
export interface ServiceForStylistValidation {
  serviceId: string;
  serviceName?: string;
  assignedStylistId?: string | null;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
}

/**
 * Result of stylist availability validation
 */
export interface StylistAvailabilityResult {
  isValid: boolean;
  conflicts: StylistConflict[];
}

export interface StylistConflict {
  serviceId: string;
  serviceName?: string;
  stylistId: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  conflictType: 'appointment' | 'blocked_slot' | 'break';
  conflictDetails?: string;
}

/**
 * Station availability check result
 */
export interface StationAvailabilityResult {
  isAvailable: boolean;
  errorCode?: string;
  errorMessage?: string;
  occupyingServiceId?: string;
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

/**
 * Convert Date to time string (HH:mm)
 */
export function dateToTimeString(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const mins = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  // Convert to comparable values
  const s1 = start1 instanceof Date ? start1.getTime() : timeToMinutes(start1);
  const e1 = end1 instanceof Date ? end1.getTime() : timeToMinutes(end1);
  const s2 = start2 instanceof Date ? start2.getTime() : timeToMinutes(start2);
  const e2 = end2 instanceof Date ? end2.getTime() : timeToMinutes(end2);

  return s1 < e2 && e1 > s2;
}

/**
 * Get the effective stylist ID for commission calculation
 *
 * Property 11: Commission SHALL be calculated based on actualStylistId when present,
 * falling back to assignedStylistId when actualStylistId is null.
 *
 * @param service - Service with stylist assignments
 * @returns The effective stylist ID for commission
 */
export function getEffectiveStylistForCommission(service: {
  actualStylistId?: string | null;
  assignedStylistId?: string | null;
}): string | null {
  return service.actualStylistId || service.assignedStylistId || null;
}

/**
 * Calculate per-service commission amounts
 *
 * Property 25: Each service's commission SHALL be calculated independently
 * Property 26: Total appointment commission = sum of individual service commissions
 *
 * @param services - Array of services with pricing and stylist info
 * @param commissionRules - Commission rules by service ID
 * @returns Array of services with commission amounts
 */
export function calculateServiceCommissions<
  T extends {
    serviceId: string;
    actualStylistId?: string | null;
    assignedStylistId?: string | null;
    netAmount: number | { toNumber(): number };
    quantity: number;
  },
>(
  services: T[],
  commissionRules: Map<
    string,
    {
      commissionType: 'percentage' | 'flat';
      commissionValue: number;
    }
  >
): (T & { effectiveStylistId: string | null; commissionAmount: number })[] {
  return services.map((service) => {
    const effectiveStylistId = getEffectiveStylistForCommission(service);
    const rule = commissionRules.get(service.serviceId);

    let commissionAmount = 0;
    if (rule && effectiveStylistId) {
      const netAmount =
        typeof service.netAmount === 'number' ? service.netAmount : service.netAmount.toNumber();

      if (rule.commissionType === 'percentage') {
        commissionAmount = (netAmount * rule.commissionValue) / 100;
      } else {
        commissionAmount = rule.commissionValue * service.quantity;
      }
    }

    return {
      ...service,
      effectiveStylistId,
      commissionAmount,
    };
  });
}

/**
 * Calculate total commission for a multi-service appointment
 *
 * @param services - Array of services with commission amounts
 * @returns Total commission amount
 */
export function calculateTotalCommission(
  services: { commissionAmount: number | { toNumber(): number } }[]
): number {
  return services.reduce((total, service) => {
    const amount =
      typeof service.commissionAmount === 'number'
        ? service.commissionAmount
        : service.commissionAmount.toNumber();
    return total + amount;
  }, 0);
}
