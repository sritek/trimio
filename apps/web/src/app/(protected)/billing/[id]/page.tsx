'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  CreditCard,
  Phone,
  User,
  XCircle,
  CheckCircle,
  Banknote,
  Mail,
  Smartphone,
  Calendar,
  Hash,
  Star,
  Tag,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { PERMISSIONS } from '@trimio/shared';

import { useInvoice, useFinalizeInvoice, useCancelInvoice } from '@/hooks/queries/use-invoices';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/format';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  LoadingSpinner,
  StatusBadge,
  SplitPaymentInput,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { PaymentMethod, PaymentInput } from '@/types/billing';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('billing');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.BILLS_WRITE);

  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [payments, setPayments] = useState<PaymentInput[]>([{ paymentMethod: 'cash', amount: 0 }]);

  const id = params.id as string;
  const { data: invoice, isLoading, refetch } = useInvoice(id);

  const finalizeInvoice = useFinalizeInvoice();
  const cancelInvoice = useCancelInvoice();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (!invoice) {
    return (
      <PageContainer>
        <PageContent>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold">{t('detail.notFound')}</h2>
            <p className="text-muted-foreground mt-2">{t('detail.notFoundDesc')}</p>
            <Button className="mt-4" onClick={() => router.push('/billing')}>
              {t('detail.backToList')}
            </Button>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  const isDraft = invoice.status === 'draft';
  const canFinalize = isDraft;
  const canCancel = isDraft;

  // Reset payments when dialog opens
  const handleOpenFinalizeDialog = () => {
    setPayments([{ paymentMethod: 'cash', amount: invoice.amountDue }]);
    setShowFinalizeDialog(true);
  };

  const handleFinalize = async () => {
    const validPayments = payments.filter((p) => p.amount > 0);
    const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);

    if (Math.abs(totalPaid - invoice.amountDue) > 0.01) {
      toast.error('Payment amount must match the amount due');
      return;
    }

    try {
      await finalizeInvoice.mutateAsync({ invoiceId: id, payments: validPayments });
      toast.success('Invoice finalized successfully');
      setShowFinalizeDialog(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to finalize invoice');
    }
  };

  const handleCancelConfirm = async () => {
    if (cancelReason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    try {
      await cancelInvoice.mutateAsync({ invoiceId: id, reason: cancelReason });
      toast.success('Invoice cancelled');
      setShowCancelDialog(false);
      setCancelReason('');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel invoice');
    }
  };

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

  return (
    <PermissionGuard permission={PERMISSIONS.BILLS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={invoice.invoiceNumber || 'Draft Invoice'}
          description={`Created on ${format(parseISO(invoice.createdAt), 'PPP')}`}
          backHref="/billing"
          actions={
            canWrite &&
            isDraft && (
              <div className="flex gap-2">
                {canFinalize && (
                  <Button size="sm" onClick={handleOpenFinalizeDialog}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalize & Pay
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={cancelInvoice.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            )
          }
        />

        <PageContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-4">
              {/* Invoice Header + Customer - Combined Row */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Invoice Details */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Invoice Details
                      </h3>
                      <div className="flex gap-1.5">
                        <StatusBadge status={invoice.status} size="sm" />
                        <StatusBadge status={invoice.paymentStatus} size="sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(parseISO(invoice.invoiceDate), 'PPP')}</span>
                      </div>
                      {invoice.invoiceNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">{invoice.invoiceNumber}</span>
                        </div>
                      )}
                      {invoice.gstin && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>GSTIN: {invoice.gstin}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                      Customer
                    </h3>
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
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Items
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%]">Item</TableHead>
                        <TableHead className="w-[15%]">Staff</TableHead>
                        <TableHead className="text-center w-[8%]">Qty</TableHead>
                        <TableHead className="text-right w-[12%]">Price</TableHead>
                        <TableHead className="text-right w-[10%]">Discount</TableHead>
                        <TableHead className="text-right w-[8%]">Tax</TableHead>
                        <TableHead className="text-right w-[12%]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span className="font-medium">{item.name}</span>
                            {item.variantName && (
                              <span className="text-muted-foreground ml-1">
                                ({item.variantName})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.stylistName ? (
                              <span className="text-sm">{item.stylistName}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.discountAmount > 0 ? (
                              <span className="text-green-600">
                                -{formatCurrency(item.discountAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.totalTax)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.netAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Totals - Right aligned */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-64 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      {invoice.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Discount
                          </span>
                          <span>-{formatCurrency(invoice.discountAmount)}</span>
                        </div>
                      )}
                      {invoice.loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Loyalty ({invoice.loyaltyPointsRedeemed} pts)
                          </span>
                          <span>-{formatCurrency(invoice.loyaltyDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxable Amount</span>
                        <span>{formatCurrency(invoice.taxableAmount)}</span>
                      </div>
                      {invoice.isIgst ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IGST</span>
                          <span>{formatCurrency(invoice.igstAmount)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CGST</span>
                            <span>{formatCurrency(invoice.cgstAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SGST</span>
                            <span>{formatCurrency(invoice.sgstAmount)}</span>
                          </div>
                        </>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold text-base">
                        <span>Grand Total</span>
                        <span>{formatCurrency(invoice.grandTotal)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Amount Paid</span>
                        <span>{formatCurrency(invoice.amountPaid)}</span>
                      </div>
                      {invoice.amountDue > 0 && (
                        <div className="flex justify-between text-red-600 font-medium">
                          <span>Amount Due</span>
                          <span>{formatCurrency(invoice.amountDue)}</span>
                        </div>
                      )}
                      {invoice.loyaltyPointsEarned > 0 && (
                        <div className="flex justify-between text-amber-600 pt-1">
                          <span>Loyalty Points Earned</span>
                          <span>+{invoice.loyaltyPointsEarned} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes - Only if present */}
              {(invoice.notes || invoice.internalNotes) && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                      Notes
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {invoice.notes && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Customer Notes
                          </div>
                          <p className="text-sm">{invoice.notes}</p>
                        </div>
                      )}
                      {invoice.internalNotes && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Internal Notes
                          </div>
                          <p className="text-sm">{invoice.internalNotes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Staff & Commission Section */}
              {invoice.items &&
                invoice.items.some(
                  (item) => item.stylistName && item.commissionAmount && item.commissionAmount > 0
                ) && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Staff & Commission
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Staff</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead className="text-right">Service Amount</TableHead>
                            <TableHead className="text-center">Commission Rate</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.items
                            .filter(
                              (item) =>
                                item.stylistName &&
                                item.commissionAmount &&
                                item.commissionAmount > 0
                            )
                            .map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.stylistName}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.netAmount)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.commissionType === 'percentage'
                                    ? `${item.commissionRate}%`
                                    : formatCurrency(item.commissionRate || 0)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {formatCurrency(item.commissionAmount || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                      <div className="mt-3 pt-3 border-t flex justify-end">
                        <div className="text-sm">
                          <span className="text-muted-foreground mr-2">Total Commission:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(
                              invoice.items
                                .filter((item) => item.commissionAmount)
                                .reduce((sum, item) => sum + (item.commissionAmount || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>

            <div>
              {/* Payments - Horizontal layout */}
              {invoice.payments && invoice.payments.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                      Payments
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                      {invoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                        >
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm capitalize">
                              {payment.paymentMethod}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(parseISO(payment.paymentDate), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div className="font-semibold">{formatCurrency(payment.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </PageContent>
      </PageContainer>

      {/* Finalize & Pay Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Finalize & Record Payment
            </DialogTitle>
            <DialogDescription>
              Record payment and finalize the invoice. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Amount Summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Grand Total</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Already Paid</span>
                  <span>{formatCurrency(invoice.amountPaid)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Amount Due</span>
                <span>{formatCurrency(invoice.amountDue)}</span>
              </div>
            </div>

            {/* Payment Input */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Payment Method</Label>
              <SplitPaymentInput
                payments={payments}
                onChange={setPayments}
                totalAmount={invoice.amountDue}
                mode="full"
                showAdditionalFields
              />
            </div>

            {/* Validation Message */}
            {(() => {
              const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
              const isFullyPaid = Math.abs(totalPaid - invoice.amountDue) < 0.01;
              if (!isFullyPaid && totalPaid > 0) {
                return (
                  <p className="text-sm text-destructive">
                    Payment amount ({formatCurrency(totalPaid)}) doesn&apos;t match amount due (
                    {formatCurrency(invoice.amountDue)})
                  </p>
                );
              }
              return null;
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={
                finalizeInvoice.isPending ||
                Math.abs(
                  payments.reduce((sum, p) => sum + (p.amount || 0), 0) - invoice.amountDue
                ) > 0.01
              }
            >
              {finalizeInvoice.isPending ? 'Processing...' : 'Confirm & Finalize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </PermissionGuard>
  );
}
