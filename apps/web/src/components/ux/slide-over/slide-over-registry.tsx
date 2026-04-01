'use client';

/**
 * SlideOver Panel Registry
 *
 * Registers panel components and provides typed hooks to open them.
 */

import { useEffect } from 'react';
import { useSlideOverStore, registerPanelComponent } from '@/stores/slide-over-store';

export const PANEL_IDS = {
  APPOINTMENT_DETAILS: 'appointment-details',
  NEW_APPOINTMENT: 'new-appointment',
  CUSTOMER_PEEK: 'customer-peek',
  CHECKOUT: 'checkout',
  UNASSIGNED_APPOINTMENTS: 'unassigned-appointments',
  STATION_ASSIGNMENT: 'station-assignment',
  ADD_SERVICE: 'add-service',
  NEW_INVOICE: 'new-invoice',
  INVOICE_PEEK: 'invoice-peek',
  EDIT_INVOICE: 'edit-invoice',
} as const;

export type PanelId = (typeof PANEL_IDS)[keyof typeof PANEL_IDS];

// Lazy load panel components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const panelLoaders: Record<PanelId, () => Promise<React.ComponentType<any>>> = {
  [PANEL_IDS.APPOINTMENT_DETAILS]: () =>
    import('@/components/ux/panels/appointment-details-panel').then(
      (m) => m.AppointmentDetailsPanel
    ),
  [PANEL_IDS.NEW_APPOINTMENT]: () =>
    import('@/components/ux/panels/new-appointment-panel').then((m) => m.NewAppointmentPanel),
  [PANEL_IDS.CUSTOMER_PEEK]: () =>
    import('@/components/ux/panels/customer-peek-panel').then((m) => m.CustomerPeekPanel),
  [PANEL_IDS.CHECKOUT]: () =>
    import('@/app/(protected)/appointments/calendar/components/checkout-panel').then(
      (m) => m.CheckoutPanel
    ),
  [PANEL_IDS.UNASSIGNED_APPOINTMENTS]: () =>
    import('@/components/ux/panels/unassigned-appointments-panel').then(
      (m) => m.UnassignedAppointmentsPanel
    ),
  [PANEL_IDS.STATION_ASSIGNMENT]: () =>
    import('@/components/ux/panels/station-assignment-panel').then((m) => m.StationAssignmentPanel),
  [PANEL_IDS.ADD_SERVICE]: () =>
    import('@/components/ux/panels/add-service-panel').then((m) => m.AddServicePanel),
  [PANEL_IDS.NEW_INVOICE]: () =>
    import('@/components/ux/panels/new-invoice-panel').then((m) => m.NewInvoicePanel),
  [PANEL_IDS.INVOICE_PEEK]: () =>
    import('@/components/ux/panels/invoice-peek-panel').then((m) => m.InvoicePeekPanel),
  [PANEL_IDS.EDIT_INVOICE]: () =>
    import('@/components/ux/panels/edit-invoice-panel').then((m) => m.EditInvoicePanel),
};

/**
 * Registers all panel components. Add this once in your layout.
 */
export function SlideOverRegistry() {
  useEffect(() => {
    Object.entries(panelLoaders).forEach(([id, loader]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loader().then((Component) => registerPanelComponent(id, Component as any));
    });
  }, []);

  return null;
}

/**
 * Hook to open panels with type safety
 */
export function useOpenPanel() {
  const openPanel = useSlideOverStore((s) => s.open);

  return {
    openAppointmentDetails: (appointmentId: string, options?: { isCheckoutMode?: boolean }) =>
      openPanel(
        PANEL_IDS.APPOINTMENT_DETAILS,
        { appointmentId, ...options },
        { title: 'Appointment Details', width: 'wide' }
      ),

    openNewAppointment: (options?: {
      stylistId?: string;
      date?: string;
      time?: string;
      customerId?: string;
    }) =>
      openPanel(PANEL_IDS.NEW_APPOINTMENT, options || {}, {
        title: 'New Appointment',
        width: 'wide',
      }),

    openCustomerPeek: (customerId: string) =>
      openPanel(
        PANEL_IDS.CUSTOMER_PEEK,
        { customerId },
        { title: 'Customer Profile', width: 'medium' }
      ),

    openCheckout: (appointmentId: string) =>
      openPanel(PANEL_IDS.CHECKOUT, { appointmentId }, { title: 'Checkout', width: 'wide' }),

    openUnassignedAppointments: () =>
      openPanel(
        PANEL_IDS.UNASSIGNED_APPOINTMENTS,
        {},
        { title: 'Unassigned Appointments', width: 'medium' }
      ),

    openStationAssignment: (stationId: string) =>
      openPanel(
        PANEL_IDS.STATION_ASSIGNMENT,
        { stationId },
        { title: 'Assign Station', width: 'narrow' }
      ),

    openAddService: (appointmentId: string) =>
      openPanel(
        PANEL_IDS.ADD_SERVICE,
        { appointmentId },
        { title: 'Add Service', width: 'medium' }
      ),

    openNewInvoice: (options?: { customerId?: string }) =>
      openPanel(PANEL_IDS.NEW_INVOICE, options || {}, {
        title: 'New Invoice',
        width: 'wide',
      }),

    openInvoicePeek: (invoiceId: string) =>
      openPanel(PANEL_IDS.INVOICE_PEEK, { invoiceId }, { title: 'Invoice', width: 'medium' }),

    openEditInvoice: (invoiceId: string) =>
      openPanel(PANEL_IDS.EDIT_INVOICE, { invoiceId }, { title: 'Edit Invoice', width: 'wide' }),
  };
}
