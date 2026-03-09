'use client';

/**
 * Checkout Panel Component
 * Simplified checkout flow - displays appointment services and captures payment.
 * Calls quickBill API to create invoice and mark appointment as completed.
 */

import { useState, useCallback, useMemo } from 'react';
import { useClosePanel } from '@/components/ux/slide-over';
import { SlideOverContent } from '@/components/ux/slide-over/slide-over-content';
import { SlideOverFooter } from '@/components/ux/slide-over/slide-over-footer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointment } from '@/hooks/queries/use-appointments';
import { useQuickBill } from '@/hooks/queries/use-invoices';
import { useBranchContext } from '@/hooks/use-branch-context';
import { toast } from 'sonner';
import { User, Banknote, CreditCard, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types/billing';

// ============================================
// Props
// ============================================

interface CheckoutPanelProps {
  appointmentId: string;
  onComplete?: (invoiceId: string) => void;
}

// ============================================
// Sub-Components
// ============================================

function CustomerInfoCard({ name, phone }: { name?: string; phone?: string }) {
  if (!name) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
        <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Guest Checkout</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-semibold">{name}</h3>
      {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
    </div>
  );
}

interface ServiceItemProps {
  name: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  totalAmount: number;
}

function ServiceItem({ name, unitPrice, quantity, taxRate, totalAmount }: ServiceItemProps) {
  return (
    <div className="flex justify-between items-start py-2">
      <div className="flex-1">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">
          ₹{unitPrice.toFixed(2)} × {quantity}
          {taxRate > 0 && ` + ${taxRate}% GST`}
        </p>
      </div>
      <p className="font-medium">₹{totalAmount.toFixed(2)}</p>
    </div>
  );
}

function TotalsSection({
  subtotal,
  taxAmount,
  taxRate,
  grandTotal,
}: {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  grandTotal: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tax (GST {taxRate}%)</span>
        <span>₹{taxAmount.toFixed(2)}</span>
      </div>

      <Separator className="my-2" />

      <div className="flex justify-between font-semibold text-lg">
        <span>Total</span>
        <span>₹{grandTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PaymentMethodButton({
  icon: Icon,
  label,
  selected,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      className={cn('flex-1 flex-col h-auto py-3 gap-1', selected && 'ring-2 ring-primary')}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Button>
  );
}

// ============================================
// Main Component
// ============================================

export function CheckoutPanel({ appointmentId, onComplete }: CheckoutPanelProps) {
  const closePanel = useClosePanel();
  const { branchId } = useBranchContext();

  // State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Queries
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(appointmentId);
  const quickBill = useQuickBill();

  // Calculate totals from appointment services
  const totals = useMemo(() => {
    if (!appointment?.services) {
      return { subtotal: 0, taxAmount: 0, taxRate: 18, grandTotal: 0 };
    }

    const subtotal = appointment.services.reduce(
      (sum, s) => sum + Number(s.unitPrice) * s.quantity,
      0
    );
    const taxAmount = appointment.services.reduce((sum, s) => sum + Number(s.taxAmount), 0);
    // Get the most common tax rate (usually all services have same rate)
    const taxRates = appointment.services.map((s) => Number(s.taxRate));
    const taxRate = taxRates.length > 0 ? taxRates[0] : 18;
    const grandTotal = subtotal + taxAmount;

    return { subtotal, taxAmount, taxRate, grandTotal };
  }, [appointment?.services]);

  // Handle complete checkout
  const handleComplete = useCallback(() => {
    if (!branchId || !selectedPaymentMethod || !appointment) return;

    // Build items from appointment services
    const items = (appointment.services || []).map((service) => ({
      itemType: 'service' as const,
      referenceId: service.serviceId,
      quantity: service.quantity,
      stylistId: service.stylistId || undefined,
    }));

    quickBill.mutate(
      {
        branchId,
        customerId: appointment.customerId || undefined,
        customerName: appointment.customerName || undefined,
        customerPhone: appointment.customerPhone || undefined,
        appointmentId,
        items,
        payments: [
          {
            paymentMethod: selectedPaymentMethod,
            amount: totals.grandTotal,
          },
        ],
      },
      {
        onSuccess: (invoice) => {
          toast.success('Payment completed!', {
            description: `Invoice #${invoice.invoiceNumber} created.`,
          });
          onComplete?.(invoice.id);
          closePanel();
        },
        onError: (error) => {
          toast.error('Failed to complete checkout', {
            description: error.message,
          });
        },
      }
    );
  }, [
    branchId,
    selectedPaymentMethod,
    appointment,
    appointmentId,
    totals.grandTotal,
    quickBill,
    onComplete,
    closePanel,
  ]);

  // Loading state
  if (!branchId) {
    return (
      <div className="flex flex-col h-full">
        <SlideOverContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">
              No branch selected. Please select a branch first.
            </p>
            <Button variant="outline" onClick={() => closePanel()}>
              Close
            </Button>
          </div>
        </SlideOverContent>
      </div>
    );
  }

  if (isLoadingAppointment) {
    return (
      <div className="flex flex-col h-full">
        <SlideOverContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </SlideOverContent>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col h-full">
        <SlideOverContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">Appointment not found</p>
            <Button variant="outline" onClick={() => closePanel()}>
              Close
            </Button>
          </div>
        </SlideOverContent>
      </div>
    );
  }

  const canComplete = selectedPaymentMethod && (appointment.services || []).length > 0;

  return (
    <div className="flex flex-col h-full">
      <SlideOverContent className="space-y-6">
        {/* Customer Info */}
        <CustomerInfoCard
          name={appointment.customerName || undefined}
          phone={appointment.customerPhone || undefined}
        />

        {/* Services */}
        <div>
          <h3 className="font-semibold mb-3">Services</h3>
          <div className="divide-y">
            {(appointment.services || []).map((service) => (
              <ServiceItem
                key={service.id}
                name={service.serviceName}
                unitPrice={Number(service.unitPrice)}
                quantity={service.quantity}
                taxRate={Number(service.taxRate)}
                totalAmount={Number(service.totalAmount)}
              />
            ))}
          </div>
        </div>

        {/* Totals */}
        <TotalsSection
          subtotal={totals.subtotal}
          taxAmount={totals.taxAmount}
          taxRate={totals.taxRate}
          grandTotal={totals.grandTotal}
        />

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <h3 className="font-semibold">Payment Method</h3>
          <div className="flex gap-2">
            <PaymentMethodButton
              icon={Banknote}
              label="Cash"
              selected={selectedPaymentMethod === 'cash'}
              onClick={() => setSelectedPaymentMethod('cash')}
            />
            <PaymentMethodButton
              icon={CreditCard}
              label="Card"
              selected={selectedPaymentMethod === 'card'}
              onClick={() => setSelectedPaymentMethod('card')}
            />
            <PaymentMethodButton
              icon={Smartphone}
              label="UPI"
              selected={selectedPaymentMethod === 'upi'}
              onClick={() => setSelectedPaymentMethod('upi')}
            />
          </div>
        </div>
      </SlideOverContent>

      <SlideOverFooter>
        <Button variant="outline" onClick={() => closePanel()}>
          Cancel
        </Button>
        <Button onClick={handleComplete} disabled={!canComplete || quickBill.isPending}>
          {quickBill.isPending
            ? 'Processing...'
            : `Complete Payment - ₹${totals.grandTotal.toFixed(2)}`}
        </Button>
      </SlideOverFooter>
    </div>
  );
}
