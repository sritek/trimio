'use client';

/**
 * Checkout Panel Component
 * Checkout flow with customer/stylist details, split payments, and confirmation.
 * Calls quickBill API to create invoice and mark appointment as completed.
 */

import { useState, useCallback, useMemo } from 'react';
import { useClosePanel } from '@/components/ux/slide-over';
import { SlideOverContent } from '@/components/ux/slide-over/slide-over-content';
import { SlideOverFooter } from '@/components/ux/slide-over/slide-over-footer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SplitPaymentInput } from '@/components/common';
import { useAppointment } from '@/hooks/queries/use-appointments';
import { useQuickBill } from '@/hooks/queries/use-invoices';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { toast } from 'sonner';
import {
  User,
  Phone,
  Mail,
  Banknote,
  Scissors,
  CheckCircle,
  Calendar,
  Clock,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import type { PaymentInput } from '@/types/billing';

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

interface CustomerInfoCardProps {
  name?: string;
  phone?: string;
  email?: string | null;
  gender?: string | null;
  loyaltyPoints?: number;
  walletBalance?: number;
}

function CustomerInfoCard({
  name,
  phone,
  email,
  gender,
  loyaltyPoints,
  walletBalance,
}: CustomerInfoCardProps) {
  if (!name) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
        <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Guest Checkout</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            {gender && (
              <Badge variant="outline" className="text-xs mt-0.5">
                {gender}
              </Badge>
            )}
            {loyaltyPoints !== undefined && loyaltyPoints > 0 && (
              <Badge variant="secondary" className="text-xs mt-0.5 ml-1">
                <Star className="size-3 text-amber-500 mr-1" />
                {loyaltyPoints} pts
              </Badge>
            )}
            {walletBalance !== undefined && walletBalance > 0 && (
              <Badge variant="outline" className="text-xs mt-0.5 ml-1">
                <Banknote className="size-3 text-green-600 mr-1" />₹{walletBalance.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ServiceItemProps {
  name: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  stylistName?: string;
}

function ServiceItem({
  name,
  unitPrice,
  quantity,
  taxRate,
  taxAmount,
  totalAmount,
  stylistName,
}: ServiceItemProps) {
  return (
    <div className="flex justify-between items-start p-3">
      <div className="flex-1 space-y-1">
        <p className="font-medium">{name}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            ₹{unitPrice.toFixed(2)} × {quantity}
          </span>
          {taxAmount > 0 && (
            <span className="text-xs">
              (+ ₹{taxAmount.toFixed(2)} GST {taxRate}%)
            </span>
          )}
        </div>
        {stylistName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scissors className="h-3 w-3" />
            <span>{stylistName}</span>
          </div>
        )}
      </div>
      <p className="font-medium">₹{totalAmount.toFixed(2)}</p>
    </div>
  );
}

function TotalsSection({
  subtotal,
  taxAmount,
  grandTotal,
}: {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>

      {taxAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax (GST)</span>
          <span>₹{taxAmount.toFixed(2)}</span>
        </div>
      )}

      <Separator className="my-2" />

      <div className="flex justify-between font-semibold text-lg">
        <span>Total</span>
        <span>₹{grandTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  customerName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  services: { name: string; stylistName?: string }[];
  payments: PaymentInput[];
  grandTotal: number;
}

function PaymentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  customerName,
  appointmentDate,
  appointmentTime,
  services,
  payments,
  grandTotal,
}: PaymentConfirmDialogProps) {
  const totalPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const isFullyPaid = Math.abs(totalPayment - grandTotal) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription>Review the details before completing the payment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer & Appointment */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{customerName || 'Guest'}</span>
            </div>
            {appointmentDate && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{appointmentDate}</span>
                </div>
                {appointmentTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{appointmentTime}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <Label className="text-xs text-muted-foreground">Services</Label>
            <div className="mt-1 space-y-1">
              {services.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  {s.stylistName && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Scissors className="h-3 w-3" />
                      {s.stylistName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment Breakdown */}
          <div>
            <Label className="text-xs text-muted-foreground">Payment</Label>
            <div className="mt-1 space-y-1">
              {payments
                .filter((p) => p.amount > 0)
                .map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{p.paymentMethod.replace('_', ' ')}</span>
                    <span>₹{p.amount.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between font-semibold">
            <span>Total Amount</span>
            <span className="text-lg">₹{grandTotal.toFixed(2)}</span>
          </div>

          {!isFullyPaid && (
            <p className="text-sm text-destructive">
              Payment amount (₹{totalPayment.toFixed(2)}) doesn't match total (₹
              {grandTotal.toFixed(2)})
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!isFullyPaid || isLoading}>
            {isLoading ? 'Processing...' : 'Confirm & Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Component
// ============================================

export function CheckoutPanel({ appointmentId, onComplete }: CheckoutPanelProps) {
  const closePanel = useClosePanel();
  const { branchId } = useBranchContext();
  const { handleError } = useErrorHandler();

  // State
  const [payments, setPayments] = useState<PaymentInput[]>([{ paymentMethod: 'cash', amount: 0 }]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Queries
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(appointmentId);
  const quickBill = useQuickBill();

  // Calculate totals from appointment services
  const totals = useMemo(() => {
    if (!appointment?.services) {
      return { subtotal: 0, taxAmount: 0, grandTotal: 0 };
    }

    const subtotal = appointment.services.reduce(
      (sum, s) => sum + Number(s.unitPrice) * s.quantity,
      0
    );
    const taxAmount = appointment.services.reduce((sum, s) => sum + Number(s.taxAmount), 0);
    const grandTotal = subtotal + taxAmount;

    return { subtotal, taxAmount, grandTotal };
  }, [appointment?.services]);

  // Auto-fill first payment amount when totals change
  useMemo(() => {
    if (totals.grandTotal > 0 && payments.length === 1 && payments[0].amount === 0) {
      setPayments([{ ...payments[0], amount: totals.grandTotal }]);
    }
  }, [totals.grandTotal]);

  // Calculate remaining amount
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingAmount = totals.grandTotal - totalPaid;
  const isFullyPaid = Math.abs(remainingAmount) < 0.01;

  // Handle complete checkout
  const handleComplete = useCallback(() => {
    if (!branchId || !appointment) return;

    // Build items from appointment services
    const items = (appointment.services || []).map((service) => ({
      itemType: 'service' as const,
      referenceId: service.serviceId,
      quantity: service.quantity,
      stylistId: service.stylistId || undefined,
    }));

    // Filter out zero-amount payments
    const validPayments = payments.filter((p) => p.amount > 0);

    quickBill.mutate(
      {
        branchId,
        customerId: appointment.customerId || undefined,
        customerName: appointment.customerName || undefined,
        customerPhone: appointment.customerPhone || undefined,
        appointmentId,
        items,
        payments: validPayments,
      },
      {
        onSuccess: (invoice) => {
          toast.success('Payment completed!', {
            description: `Invoice #${invoice.invoiceNumber} created.`,
          });
          setShowConfirmDialog(false);
          onComplete?.(invoice.id);
          closePanel();
        },
        onError: (error) => {
          handleError(error, {
            customMessage: 'Failed to complete checkout. Please try again.',
          });
        },
      }
    );
  }, [branchId, appointment, appointmentId, payments, quickBill, onComplete, closePanel]);

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
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
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

  const canComplete = isFullyPaid && (appointment.services || []).length > 0;

  // Get stylist names map
  const stylistMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (appointment.stylist) {
      map[appointment.stylistId || ''] = appointment.stylist.name;
    }
    return map;
  }, [appointment]);

  return (
    <div className="flex flex-col h-full">
      <SlideOverContent className="space-y-6">
        {/* Customer Info */}
        <CustomerInfoCard
          name={appointment.customer?.name || appointment.customerName || undefined}
          phone={appointment.customer?.phone || appointment.customerPhone || undefined}
          email={appointment.customer?.email}
          gender={appointment.customer?.gender}
          loyaltyPoints={appointment.customer?.loyaltyPoints}
          walletBalance={appointment.customer?.walletBalance}
        />

        {/* Services */}
        <div>
          <h3 className="font-semibold mb-2">Services</h3>
          <div className="divide-y rounded-lg border">
            {(appointment.services || []).map((service) => (
              <ServiceItem
                key={service.id}
                name={service.serviceName}
                unitPrice={Number(service.unitPrice)}
                quantity={service.quantity}
                taxRate={Number(service.taxRate)}
                taxAmount={Number(service.taxAmount)}
                totalAmount={Number(service.totalAmount)}
                stylistName={
                  service.stylistId
                    ? stylistMap[service.stylistId] || appointment.stylist?.name
                    : appointment.stylist?.name
                }
              />
            ))}
          </div>
        </div>

        {/* Totals */}
        <TotalsSection
          subtotal={totals.subtotal}
          taxAmount={totals.taxAmount}
          grandTotal={totals.grandTotal}
        />

        {/* Split Payments */}
        <SplitPaymentInput
          payments={payments}
          onChange={setPayments}
          totalAmount={totals.grandTotal}
          mode="compact"
        />
      </SlideOverContent>

      <SlideOverFooter>
        <Button variant="outline" onClick={() => closePanel()}>
          Cancel
        </Button>
        <Button onClick={() => setShowConfirmDialog(true)} disabled={!canComplete}>
          Complete Payment - ₹{totals.grandTotal.toFixed(2)}
        </Button>
      </SlideOverFooter>

      {/* Confirmation Dialog */}
      <PaymentConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleComplete}
        isLoading={quickBill.isPending}
        customerName={appointment.customer?.name || appointment.customerName || undefined}
        appointmentDate={
          appointment.scheduledDate
            ? format(new Date(appointment.scheduledDate), 'dd MMM yyyy')
            : undefined
        }
        appointmentTime={appointment.scheduledTime}
        services={(appointment.services || []).map((s) => ({
          name: s.serviceName,
          stylistName: s.stylistId
            ? stylistMap[s.stylistId] || appointment.stylist?.name
            : appointment.stylist?.name,
        }))}
        payments={payments}
        grandTotal={totals.grandTotal}
      />
    </div>
  );
}
