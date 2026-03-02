/**
 * Entity Actions Configuration
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * Defines quick actions available for each entity type.
 */

import {
  Calendar,
  CalendarPlus,
  CreditCard,
  History,
  MessageSquare,
  Phone,
  Play,
  UserCheck,
  UserX,
  Wallet,
  X,
  Eye,
  Edit,
  type LucideIcon,
} from 'lucide-react';
import type { AppointmentStatus } from '@/types/appointments';

export interface ActionContext {
  openPanel: (
    componentId: string,
    props: Record<string, unknown>,
    options: { width?: 'narrow' | 'medium' | 'wide'; title: string }
  ) => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
  };
  api: {
    appointments: {
      checkIn: (id: string) => Promise<void>;
      start: (id: string) => Promise<void>;
      complete: (id: string) => Promise<void>;
      cancel: (id: string, reason?: string) => Promise<void>;
      markNoShow: (id: string) => Promise<void>;
    };
  };
}

export interface QuickAction<T = unknown> {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'success';
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
  isVisible?: (entity: T, permissions: string[]) => boolean;
  isDisabled?: (entity: T) => boolean;
  disabledReason?: (entity: T) => string | undefined;
  execute: (entity: T, context: ActionContext) => Promise<void> | void;
}

// Appointment entity type for actions
interface AppointmentEntity {
  id: string;
  status: AppointmentStatus;
  rescheduleCount: number;
  customerId?: string | null;
  customerName?: string | null;
}

// Customer entity type for actions
interface CustomerEntity {
  id: string;
  name: string;
  phone: string;
  walletBalance?: number;
}

// Invoice entity type for actions
interface InvoiceEntity {
  id: string;
  status: string;
  customerId?: string | null;
}

// Walk-in entity type for actions
interface WalkInEntity {
  id: string;
  status: string;
  tokenNumber: number;
  customerName: string;
}

/**
 * Appointment Quick Actions
 */
export const APPOINTMENT_ACTIONS: QuickAction<AppointmentEntity>[] = [
  {
    id: 'check-in',
    label: 'Check In',
    icon: UserCheck,
    variant: 'success',
    isVisible: (apt) => apt.status === 'confirmed' || apt.status === 'booked',
    execute: async (apt, ctx) => {
      await ctx.api.appointments.checkIn(apt.id);
      ctx.toast.success('Customer checked in');
    },
  },
  {
    id: 'start-service',
    label: 'Start',
    icon: Play,
    isVisible: (apt) => apt.status === 'checked_in',
    execute: async (apt, ctx) => {
      await ctx.api.appointments.start(apt.id);
      ctx.toast.success('Service started');
    },
  },
  {
    id: 'checkout',
    label: 'Checkout',
    icon: CreditCard,
    isVisible: (apt) => apt.status === 'in_progress' || apt.status === 'completed',
    execute: (apt, ctx) => {
      ctx.openPanel(
        'checkout-panel',
        { appointmentId: apt.id },
        { width: 'wide', title: 'Checkout' }
      );
    },
  },
  {
    id: 'reschedule',
    label: 'Reschedule',
    icon: Calendar,
    isVisible: (apt) => !['completed', 'cancelled', 'no_show'].includes(apt.status),
    isDisabled: (apt) => apt.rescheduleCount >= 3,
    disabledReason: (apt) =>
      apt.rescheduleCount >= 3 ? 'Maximum reschedules reached (3)' : undefined,
    execute: (apt, ctx) => {
      ctx.openPanel(
        'reschedule-form',
        { appointmentId: apt.id },
        { width: 'medium', title: 'Reschedule Appointment' }
      );
    },
  },
  {
    id: 'view-details',
    label: 'View Details',
    icon: Eye,
    execute: (apt, ctx) => {
      ctx.openPanel(
        'appointment-details',
        { appointmentId: apt.id },
        { width: 'medium', title: 'Appointment Details' }
      );
    },
  },
  {
    id: 'cancel',
    label: 'Cancel',
    icon: X,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationTitle: 'Cancel Appointment',
    confirmationMessage: 'Are you sure you want to cancel this appointment?',
    isVisible: (apt) => !['completed', 'cancelled', 'no_show'].includes(apt.status),
    execute: async (apt, ctx) => {
      await ctx.api.appointments.cancel(apt.id);
      ctx.toast.success('Appointment cancelled');
    },
  },
  {
    id: 'no-show',
    label: 'No Show',
    icon: UserX,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationTitle: 'Mark as No Show',
    confirmationMessage:
      'Are you sure you want to mark this customer as a no-show? This will affect their booking status.',
    isVisible: (apt) => apt.status === 'checked_in' || apt.status === 'booked',
    execute: async (apt, ctx) => {
      await ctx.api.appointments.markNoShow(apt.id);
      ctx.toast.warning('Marked as no-show');
    },
  },
];

/**
 * Customer Quick Actions
 */
export const CUSTOMER_ACTIONS: QuickAction<CustomerEntity>[] = [
  {
    id: 'book-appointment',
    label: 'Book Appointment',
    icon: CalendarPlus,
    execute: (customer, ctx) => {
      ctx.openPanel(
        'appointment-form',
        { customerId: customer.id },
        { width: 'wide', title: 'New Appointment' }
      );
    },
  },
  {
    id: 'view-history',
    label: 'View History',
    icon: History,
    execute: (customer, ctx) => {
      ctx.openPanel(
        'customer-history',
        { customerId: customer.id },
        { width: 'medium', title: 'Appointment History' }
      );
    },
  },
  {
    id: 'send-message',
    label: 'Send Message',
    icon: MessageSquare,
    execute: (customer, ctx) => {
      ctx.openPanel(
        'send-message',
        { customerId: customer.id, phone: customer.phone },
        { width: 'narrow', title: 'Send Message' }
      );
    },
  },
  {
    id: 'call',
    label: 'Call',
    icon: Phone,
    execute: (customer) => {
      window.location.href = `tel:${customer.phone}`;
    },
  },
  {
    id: 'add-to-wallet',
    label: 'Top Up Wallet',
    icon: Wallet,
    execute: (customer, ctx) => {
      ctx.openPanel(
        'wallet-topup',
        { customerId: customer.id },
        { width: 'narrow', title: 'Top Up Wallet' }
      );
    },
  },
  {
    id: 'view-details',
    label: 'View Details',
    icon: Eye,
    execute: (customer, ctx) => {
      ctx.openPanel(
        'customer-details',
        { customerId: customer.id },
        { width: 'medium', title: 'Customer Details' }
      );
    },
  },
];

/**
 * Invoice Quick Actions
 */
export const INVOICE_ACTIONS: QuickAction<InvoiceEntity>[] = [
  {
    id: 'view-invoice',
    label: 'View Invoice',
    icon: Eye,
    execute: (invoice, ctx) => {
      ctx.openPanel(
        'invoice-details',
        { invoiceId: invoice.id },
        { width: 'medium', title: 'Invoice Details' }
      );
    },
  },
  {
    id: 'edit-invoice',
    label: 'Edit',
    icon: Edit,
    isVisible: (invoice) => invoice.status === 'draft',
    execute: (invoice, ctx) => {
      ctx.openPanel(
        'invoice-form',
        { invoiceId: invoice.id },
        { width: 'wide', title: 'Edit Invoice' }
      );
    },
  },
];

/**
 * Walk-in Queue Quick Actions
 */
export const WALKIN_ACTIONS: QuickAction<WalkInEntity>[] = [
  {
    id: 'start-service',
    label: 'Start Service',
    icon: Play,
    variant: 'success',
    isVisible: (entry) => entry.status === 'waiting' || entry.status === 'called',
    execute: (entry, ctx) => {
      ctx.openPanel(
        'walkin-assign',
        { walkInId: entry.id },
        { width: 'medium', title: `Assign Walk-in #${entry.tokenNumber}` }
      );
    },
  },
  {
    id: 'mark-left',
    label: 'Mark as Left',
    icon: UserX,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationTitle: 'Mark as Left',
    confirmationMessage: 'Mark this walk-in customer as left?',
    isVisible: (entry) => entry.status === 'waiting' || entry.status === 'called',
    execute: async (_entry, ctx) => {
      // API call would go here
      ctx.toast.success('Walk-in marked as left');
    },
  },
];

/**
 * Entity action configurations map
 */
export const ENTITY_ACTIONS = {
  appointment: APPOINTMENT_ACTIONS,
  customer: CUSTOMER_ACTIONS,
  invoice: INVOICE_ACTIONS,
  walkIn: WALKIN_ACTIONS,
} as const;

export type EntityType = keyof typeof ENTITY_ACTIONS;

/**
 * Get visible actions for an entity
 */
export function getVisibleActions<T>(
  actions: QuickAction<T>[],
  entity: T,
  permissions: string[] = []
): QuickAction<T>[] {
  return actions.filter((action) => !action.isVisible || action.isVisible(entity, permissions));
}

/**
 * Get primary actions (first 3 visible actions)
 */
export function getPrimaryActions<T>(
  actions: QuickAction<T>[],
  entity: T,
  permissions: string[] = [],
  maxPrimary = 3
): { primary: QuickAction<T>[]; overflow: QuickAction<T>[] } {
  const visible = getVisibleActions(actions, entity, permissions);
  return {
    primary: visible.slice(0, maxPrimary),
    overflow: visible.slice(maxPrimary),
  };
}
