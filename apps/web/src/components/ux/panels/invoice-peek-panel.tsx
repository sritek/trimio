'use client';

/**
 * Invoice Peek Panel
 * Quick preview panel for invoices from the list view.
 * Shows summary info and quick actions.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Hash,
  CreditCard,
  Banknote,
  Smartphone,
  XCircle,
  CheckCircle,
  Plus,
  Edit,
  Star,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/common';
import { useClosePanel, useOpenPanel } from '@/components/ux/slide-over';
import { useInvoice, useFinalizeInvoice, useCancelInvoice } from '@/hooks/queries/use-invoices';
import { formatCurrency } from '@/lib/format';
import type { PaymentMethod } from '@/types/billing';

interface InvoicePeekPanelProps {
  invoiceId: string;
}

export function InvoicePeekPanel({ invoiceId }: InvoicePeekPanelProps) {
  const router = useRouter();
  const closePanel = useClosePanel();
  const { openEditInvoice } = useOpenPanel();
  const { data: invoice, isLoading, refetch } = useInvoice(invoiceId);

  // Cancel dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const finalizeInvoice = useFinalizeInvoice();
  const cancelInvoice = useCancelInvoice();

  const handleEdit = useCallback(() => {
    closePanel();
    openEditInvoice(invoiceId);
  }, [closePanel, openEditInvoice, invoiceId]);

  const handleAddPayment = useCallback(() => {
    closePanel();
    router.push(`/billing/${invoiceId}`);
  }, [closePanel, router, invoiceId]);

  const handleFinalize = useCallback(async () => {
    try {
      await finalizeInvoice.mutateAsync({ invoiceId });
      toast.success('Invoice finalized');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to finalize');
    }
  }, [finalizeInvoice, invoiceId, refetch]);

  const handleCancelConfirm = useCallback(async () => {
    if (cancelReason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    try {
      await cancelInvoice.mutateAsync({ invoiceId, reason: cancelReason });
      toast.success('Invoice cancelled');
      setShowCancelDialog(false);
      setCancelReason('');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel');
    }
  }, [cancelInvoice, invoiceId, cancelReason, refetch]);

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4 text-green-600" />;
      case 'card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'upi':
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="outline" className="mt-4" onClick={() => closePanel()}>
          Close
        </Button>
      </div>
    );
  }

  const isDraft = invoice.status === 'draft';
  const canFinalize = isDraft && invoice.amountDue <= 0.01;
  const canEdit = isDraft;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold">{invoice.invoiceNumber || 'Draft Invoice'}</h2>
              <StatusBadge status={invoice.status} size="sm" />
              <StatusBadge status={invoice.paymentStatus} size="sm" />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(parseISO(invoice.invoiceDate), 'PPP')}
              </span>
              {invoice.invoiceNumber && (
                <span className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  {invoice.invoiceNumber}
                </span>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Customer</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{invoice.customerName || 'Guest'}</span>
              </div>
              {invoice.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{invoice.customerPhone}</span>
                </div>
              )}
              {invoice.customerEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{invoice.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Summary */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Items ({invoice.items?.length || 0})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {invoice.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="truncate flex-1">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="ml-2 font-medium">{formatCurrency(item.netAmount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Discount
                </span>
                <span>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            {invoice.loyaltyDiscount > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Loyalty ({invoice.loyaltyPointsRedeemed} pts)
                </span>
                <span>-{formatCurrency(invoice.loyaltyDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(invoice.totalTax)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Paid</span>
              <span>{formatCurrency(invoice.amountPaid)}</span>
            </div>
            {invoice.amountDue > 0 && (
              <div className="flex justify-between text-sm text-red-600 font-medium">
                <span>Due</span>
                <span>{formatCurrency(invoice.amountDue)}</span>
              </div>
            )}
            {invoice.loyaltyPointsEarned > 0 && (
              <div className="flex justify-between text-sm text-amber-600 pt-1 border-t mt-2">
                <span>Points Earned</span>
                <span>+{invoice.loyaltyPointsEarned} pts</span>
              </div>
            )}
          </div>

          {/* Payments */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Payments</h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                    {getPaymentMethodIcon(payment.paymentMethod)}
                    <span className="flex-1 text-sm capitalize">{payment.paymentMethod}</span>
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="border-t p-4 space-y-3 bg-background">
        {/* Primary Actions */}
        <div className="flex gap-2">
          {canEdit && (
            <Button className="flex-1" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Draft
            </Button>
          )}
          {canFinalize && (
            <Button
              className="flex-1"
              onClick={handleFinalize}
              disabled={finalizeInvoice.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize
            </Button>
          )}
          {isDraft && invoice.amountDue > 0 && (
            <Button className="flex-1" onClick={handleAddPayment}>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          {isDraft && (
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => setShowCancelDialog(true)}
              disabled={cancelInvoice.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Invoice Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="cancel-reason">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please provide a reason (minimum 10 characters)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
            {cancelReason.length > 0 && cancelReason.length < 10 && (
              <p className="text-sm text-destructive">
                {10 - cancelReason.length} more characters required
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
              }}
            >
              Keep Invoice
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancelReason.length < 10 || cancelInvoice.isPending}
            >
              {cancelInvoice.isPending ? 'Cancelling...' : 'Cancel Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
