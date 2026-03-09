'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  CreditCard,
  Phone,
  User,
  XCircle,
  CheckCircle,
  Banknote,
  Plus,
  Mail,
  Smartphone,
  Calendar,
  Hash,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  useInvoice,
  useFinalizeInvoice,
  useCancelInvoice,
  useAddPayment,
} from '@/hooks/queries/use-invoices';
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
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { AddPaymentDialog } from './components/add-payment-dialog';
import type { PaymentMethod, PaymentInput } from '@/types/billing';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('billing');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.BILLS_WRITE);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const id = params.id as string;
  const { data: invoice, isLoading, refetch } = useInvoice(id);

  const finalizeInvoice = useFinalizeInvoice();
  const cancelInvoice = useCancelInvoice();
  const addPayment = useAddPayment();

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
  const canFinalize = isDraft && invoice.amountDue <= 0.01;
  const canAddPayment = isDraft && invoice.amountDue > 0;
  const canCancel = isDraft;

  const handleFinalize = async () => {
    try {
      await finalizeInvoice.mutateAsync({ invoiceId: id });
      toast.success('Invoice finalized successfully');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to finalize invoice');
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please enter a reason for cancellation:');
    if (reason && reason.length >= 10) {
      try {
        await cancelInvoice.mutateAsync({ invoiceId: id, reason });
        toast.success('Invoice cancelled');
        refetch();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to cancel invoice');
      }
    } else if (reason) {
      toast.error('Reason must be at least 10 characters');
    }
  };

  const handleAddPayment = async (payments: PaymentInput[]) => {
    try {
      await addPayment.mutateAsync({ invoiceId: id, payments });
      toast.success('Payment added successfully');
      setShowPaymentDialog(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add payment');
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
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/billing')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Button>
              {canWrite && isDraft && (
                <>
                  {canAddPayment && (
                    <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Payment
                    </Button>
                  )}
                  {canFinalize && (
                    <Button size="sm" onClick={handleFinalize} disabled={finalizeInvoice.isPending}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finalize
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancel}
                      disabled={cancelInvoice.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>
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
                        <TableHead className="w-[40%]">Item</TableHead>
                        <TableHead className="text-center w-[10%]">Qty</TableHead>
                        <TableHead className="text-right w-[15%]">Price</TableHead>
                        <TableHead className="text-right w-[10%]">Discount</TableHead>
                        <TableHead className="text-right w-[10%]">Tax</TableHead>
                        <TableHead className="text-right w-[15%]">Total</TableHead>
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

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        amountDue={invoice.amountDue}
        onSubmit={handleAddPayment}
        isLoading={addPayment.isPending}
      />
    </PermissionGuard>
  );
}
