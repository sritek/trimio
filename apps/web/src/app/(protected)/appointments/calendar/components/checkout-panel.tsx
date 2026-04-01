'use client';

/**
 * Checkout Panel Component
 * Checkout flow with customer/stylist details, split payments, and confirmation.
 * Calls quickBill API to create invoice and mark appointment as completed.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useClosePanel } from '@/components/ux/slide-over';
import { SlideOverContent } from '@/components/ux/slide-over/slide-over-content';
import { SlideOverFooter } from '@/components/ux/slide-over/slide-over-footer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SplitPaymentInput } from '@/components/common';
import { useAppointment } from '@/hooks/queries/use-appointments';
import { useQuickBill, useCalculateTotals } from '@/hooks/queries/use-invoices';
import { useLoyaltyConfig } from '@/hooks/queries/use-customers';
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
  ChevronDown,
  Tag,
  Gift,
} from 'lucide-react';
import { format } from 'date-fns';
import type { PaymentInput, DiscountInput } from '@/types/billing';

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
  discountAmount,
  loyaltyDiscount,
  grandTotal,
}: {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  loyaltyDiscount: number;
  grandTotal: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>

      {discountAmount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Discount</span>
          <span>-₹{discountAmount.toFixed(2)}</span>
        </div>
      )}

      {loyaltyDiscount > 0 && (
        <div className="flex justify-between text-sm text-amber-600">
          <span>Loyalty Points</span>
          <span>-₹{loyaltyDiscount.toFixed(2)}</span>
        </div>
      )}

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
  discountAmount: number;
  loyaltyDiscount: number;
  loyaltyPointsRedeemed: number;
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
  discountAmount,
  loyaltyDiscount,
  loyaltyPointsRedeemed,
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
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Discount Applied</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex items-center justify-between text-sm text-amber-600">
                  <span>Loyalty Points ({loyaltyPointsRedeemed} pts)</span>
                  <span>-₹{loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
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
              Payment amount (₹{totalPayment.toFixed(2)}) doesn&apos;t match total (₹
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
  const [isCompletingAppointment, setIsCompletingAppointment] = useState(false);

  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [showDiscountSection, setShowDiscountSection] = useState(false);

  // Loyalty state
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState<number>(0);
  const [showLoyaltySection, setShowLoyaltySection] = useState(false);

  // Completion time state
  const [completionTime, setCompletionTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  );

  // Queries
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(appointmentId);
  const { data: loyaltyConfig } = useLoyaltyConfig();
  const quickBill = useQuickBill();
  const calculateTotals = useCalculateTotals();

  // Customer loyalty info
  const customerLoyaltyPoints = appointment?.customer?.loyaltyPoints || 0;
  const customerWalletBalance = appointment?.customer?.walletBalance || 0;
  // Get redemption value from loyalty config (default to 1 if not configured)
  const loyaltyPointValue = loyaltyConfig?.redemptionValuePerPoint ?? 1;
  const isLoyaltyEnabled = loyaltyConfig?.isEnabled ?? false;
  const maxLoyaltyDiscount = customerLoyaltyPoints * loyaltyPointValue;

  // Backend-calculated totals state
  const [calculatedTotals, setCalculatedTotals] = useState<{
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    loyaltyDiscount: number;
    grandTotal: number;
  } | null>(null);

  // Calculate totals using backend API when inputs change
  useEffect(() => {
    if (!branchId || !appointment?.services || appointment.services.length === 0) {
      setCalculatedTotals(null);
      return;
    }

    const items = appointment.services.map((service) => ({
      itemType: 'service' as const,
      referenceId: service.serviceId,
      quantity: service.quantity,
      stylistId: service.stylistId || undefined,
    }));

    const discounts: DiscountInput[] = [];
    if (discountValue > 0) {
      discounts.push({
        discountType: 'manual',
        calculationType: discountType,
        calculationValue: discountValue,
        appliedTo: 'subtotal',
        reason: discountReason || undefined,
      });
    }

    calculateTotals.mutate(
      {
        branchId,
        items,
        discounts: discounts.length > 0 ? discounts : undefined,
        redeemLoyaltyPoints: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
      },
      {
        onSuccess: (data: any) => {
          setCalculatedTotals({
            subtotal: data.subtotal || 0,
            taxAmount: data.totalTax || 0,
            discountAmount: data.discountAmount || 0,
            loyaltyDiscount: data.loyaltyDiscount || 0,
            grandTotal: data.grandTotal || 0,
          });
        },
        onError: () => {
          // Fallback to local calculation if API fails
          setCalculatedTotals(null);
        },
      }
    );
  }, [branchId, appointment?.services, discountType, discountValue, loyaltyPointsToRedeem]);

  // Use backend-calculated totals or fallback to local calculation
  const totals = useMemo(() => {
    // If we have backend-calculated totals, use them
    if (calculatedTotals) {
      return calculatedTotals;
    }

    // Fallback to local calculation (for initial render before API responds)
    if (!appointment?.services) {
      return { subtotal: 0, taxAmount: 0, discountAmount: 0, loyaltyDiscount: 0, grandTotal: 0 };
    }

    const subtotal = appointment.services.reduce(
      (sum, s) => sum + Number(s.unitPrice) * s.quantity,
      0
    );
    const taxAmount = appointment.services.reduce((sum, s) => sum + Number(s.taxAmount), 0);

    // Calculate discount
    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
      // Cap discount at subtotal
      discountAmount = Math.min(discountAmount, subtotal);
    }

    // Calculate loyalty discount
    const loyaltyDiscount = Math.min(loyaltyPointsToRedeem * loyaltyPointValue, maxLoyaltyDiscount);

    const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount - loyaltyDiscount);

    return { subtotal, taxAmount, discountAmount, loyaltyDiscount, grandTotal };
  }, [
    calculatedTotals,
    appointment?.services,
    discountType,
    discountValue,
    loyaltyPointsToRedeem,
    loyaltyPointValue,
    maxLoyaltyDiscount,
  ]);

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
  const handleComplete = useCallback(async () => {
    if (!branchId || !appointment) return;

    try {
      setIsCompletingAppointment(true);

      // Build items from appointment services
      const items = (appointment.services || []).map((service) => ({
        itemType: 'service' as const,
        referenceId: service.serviceId,
        quantity: service.quantity,
        stylistId: service.stylistId || undefined,
      }));

      // Build discounts array if discount applied
      const discounts: DiscountInput[] = [];
      if (discountValue > 0 && totals.discountAmount > 0) {
        discounts.push({
          discountType: 'manual',
          calculationType: discountType,
          calculationValue: discountValue,
          appliedTo: 'subtotal',
          reason: discountReason || undefined,
        });
      }

      // Filter out zero-amount payments
      const validPayments = payments.filter((p) => p.amount > 0);

      // Build completedAt datetime from scheduled date and completion time
      const scheduledDate = appointment.scheduledDate.split('T')[0]; // Get YYYY-MM-DD
      const completedAtDateTime = new Date(`${scheduledDate}T${completionTime}:00`).toISOString();

      // Create invoice and complete appointment (quickBill handles both)
      quickBill.mutate(
        {
          branchId,
          customerId: appointment.customerId || undefined,
          customerName: appointment.customerName || undefined,
          customerPhone: appointment.customerPhone || undefined,
          appointmentId,
          completedAt: completedAtDateTime,
          items,
          discounts: discounts.length > 0 ? discounts : undefined,
          redeemLoyaltyPoints: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
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
          onSettled: () => {
            setIsCompletingAppointment(false);
          },
        }
      );
    } catch (error) {
      handleError(error, {
        customMessage: 'Failed to complete checkout. Please try again.',
      });
      setIsCompletingAppointment(false);
    }
  }, [
    branchId,
    appointment,
    appointmentId,
    completionTime,
    discountType,
    discountValue,
    discountReason,
    totals.discountAmount,
    loyaltyPointsToRedeem,
    payments,
    quickBill,
    onComplete,
    closePanel,
    handleError,
  ]);

  // Get stylist names map (must be before early returns per rules-of-hooks)
  const stylistMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (appointment?.stylist) {
      map[appointment.stylistId || ''] = appointment.stylist.name;
    }
    return map;
  }, [appointment]);

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

  const canComplete =
    isFullyPaid && (appointment.services || []).length > 0 && !calculateTotals.isPending;

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
          discountAmount={totals.discountAmount}
          loyaltyDiscount={totals.loyaltyDiscount}
          grandTotal={totals.grandTotal}
        />

        {/* Discount Section */}
        <Collapsible open={showDiscountSection} onOpenChange={setShowDiscountSection}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Apply Discount
                {totals.discountAmount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    -₹{totals.discountAmount.toFixed(2)}
                  </Badge>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDiscountSection ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="rounded-lg border p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as 'percentage' | 'flat')}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Value</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      min={0}
                      max={discountType === 'percentage' ? 100 : totals.subtotal}
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {discountType === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason (optional)</Label>
                <Input
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g., First visit, Loyalty reward"
                  className="mt-1"
                />
              </div>
              {discountValue > 0 && (
                <div className="text-sm text-green-600 font-medium">
                  Discount: -₹
                  {(() => {
                    // Show local preview calculation while backend calculates
                    if (calculatedTotals?.discountAmount) {
                      return calculatedTotals.discountAmount.toFixed(2);
                    }
                    // Local preview calculation
                    const subtotal =
                      appointment?.services?.reduce(
                        (sum, s) => sum + Number(s.unitPrice) * s.quantity,
                        0
                      ) || 0;
                    if (discountType === 'percentage') {
                      return ((subtotal * discountValue) / 100).toFixed(2);
                    }
                    return Math.min(discountValue, subtotal).toFixed(2);
                  })()}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Loyalty Points Section - Only show if loyalty is enabled and customer has points */}
        {isLoyaltyEnabled && customerLoyaltyPoints > 0 && (
          <Collapsible open={showLoyaltySection} onOpenChange={setShowLoyaltySection}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Redeem Loyalty Points
                  <Badge variant="secondary" className="ml-2">
                    <Star className="h-3 w-3 mr-1 text-amber-500" />
                    {customerLoyaltyPoints} pts available
                  </Badge>
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showLoyaltySection ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="rounded-lg border p-3 space-y-3">
                <div>
                  <Label className="text-xs">Points to Redeem</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min={0}
                      max={customerLoyaltyPoints}
                      value={loyaltyPointsToRedeem || ''}
                      onChange={(e) =>
                        setLoyaltyPointsToRedeem(
                          Math.min(Number(e.target.value) || 0, customerLoyaltyPoints)
                        )
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLoyaltyPointsToRedeem(customerLoyaltyPoints)}
                    >
                      Use All
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    1 point = ₹{Number(loyaltyPointValue).toFixed(2)}
                  </p>
                </div>
                {loyaltyPointsToRedeem > 0 && (
                  <div className="text-sm text-amber-600 font-medium">
                    Discount: -₹
                    {(
                      calculatedTotals?.loyaltyDiscount ?? loyaltyPointsToRedeem * loyaltyPointValue
                    ).toFixed(2)}{' '}
                    ({loyaltyPointsToRedeem} points)
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Completion Time */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Completion Time</h3>
          </div>
          <div>
            <Label htmlFor="completion-time" className="text-xs text-muted-foreground">
              Actual completion time
            </Label>
            <Input
              id="completion-time"
              type="time"
              value={completionTime}
              onChange={(e) => setCompletionTime(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

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
        <Button
          onClick={() => setShowConfirmDialog(true)}
          disabled={!canComplete || isCompletingAppointment}
        >
          {isCompletingAppointment
            ? 'Completing...'
            : `Complete Payment - ₹${totals.grandTotal.toFixed(2)}`}
        </Button>
      </SlideOverFooter>

      {/* Confirmation Dialog */}
      <PaymentConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleComplete}
        isLoading={quickBill.isPending || isCompletingAppointment}
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
        discountAmount={totals.discountAmount}
        loyaltyDiscount={totals.loyaltyDiscount}
        loyaltyPointsRedeemed={loyaltyPointsToRedeem}
      />
    </div>
  );
}
