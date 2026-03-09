'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Phone,
  Printer,
  User,
  XCircle,
  CheckCircle,
  Banknote,
  Plus,
  Star,
  Wallet,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        return <Banknote className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.BILLS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={invoice.invoiceNumber || `Draft Invoice`}
          description={`Created on ${format(parseISO(invoice.createdAt), 'PPP')}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/billing')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('detail.backToList')}
              </Button>
              {invoice.status === 'finalized' && (
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  {t('actions.print')}
                </Button>
              )}
            </div>
          }
        />

        <PageContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {t('detail.invoiceInfo')}
                    </CardTitle>
                    <div className="flex gap-2">
                      <StatusBadge status={invoice.status} label={t(`status.${invoice.status}`)} />
                      <StatusBadge
                        status={invoice.paymentStatus}
                        label={t(`payment.${invoice.paymentStatus}`)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">{t('table.date')}</div>
                        <div className="font-medium">
                          {format(parseISO(invoice.invoiceDate), 'PPP')}
                        </div>
                      </div>
                    </div>
                    {invoice.invoiceNumber && (
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {t('table.invoiceNumber')}
                        </div>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('detail.customerInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium text-lg">{invoice.customerName || 'Guest'}</div>
                    {invoice.customerPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {invoice.customerPhone}
                      </div>
                    )}
                    {invoice.customerEmail && (
                      <div className="text-muted-foreground">{invoice.customerEmail}</div>
                    )}
                    {invoice.gstin && (
                      <div className="text-sm text-muted-foreground">GSTIN: {invoice.gstin}</div>
                    )}

                    {/* Loyalty & Wallet Balance */}
                    {invoice.customer && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Star className="h-4 w-4 text-yellow-500" />
                            Loyalty Points
                          </span>
                          <span className="font-medium">
                            {invoice.customer.loyaltyPoints.toLocaleString()} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Wallet className="h-4 w-4 text-green-500" />
                            Wallet Balance
                          </span>
                          <span className="font-medium">
                            {formatCurrency(invoice.customer.walletBalance)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('detail.items')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            {item.variantName && (
                              <div className="text-sm text-muted-foreground">
                                {item.variantName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.discountAmount > 0 ? (
                              <span className="text-green-600">
                                -{formatCurrency(item.discountAmount)}
                              </span>
                            ) : (
                              '-'
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

                  <Separator className="my-4" />

                  {/* Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('detail.subtotal')}</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t('detail.discount')}</span>
                        <span>-{formatCurrency(invoice.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('detail.taxable')}</span>
                      <span>{formatCurrency(invoice.taxableAmount)}</span>
                    </div>
                    {invoice.isIgst ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('detail.igst')}</span>
                        <span>{formatCurrency(invoice.igstAmount)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('detail.cgst')}</span>
                          <span>{formatCurrency(invoice.cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('detail.sgst')}</span>
                          <span>{formatCurrency(invoice.sgstAmount)}</span>
                        </div>
                      </>
                    )}
                    {invoice.roundOff !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('detail.roundOff')}</span>
                        <span>{formatCurrency(invoice.roundOff)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t('detail.grandTotal')}</span>
                      <span>{formatCurrency(invoice.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('detail.amountPaid')}</span>
                      <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    {invoice.amountDue > 0 && (
                      <div className="flex justify-between font-medium text-red-600">
                        <span>{t('detail.amountDue')}</span>
                        <span>{formatCurrency(invoice.amountDue)}</span>
                      </div>
                    )}
                  </div>

                  {/* Loyalty & Wallet Info */}
                  {(invoice.loyaltyPointsEarned > 0 ||
                    invoice.loyaltyPointsRedeemed > 0 ||
                    invoice.walletAmountUsed > 0) && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2 text-sm">
                        {invoice.loyaltyPointsEarned > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {t('detail.loyaltyEarned')}
                            </span>
                            <span className="text-green-600">
                              +{invoice.loyaltyPointsEarned} pts
                            </span>
                          </div>
                        )}
                        {invoice.loyaltyPointsRedeemed > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {t('detail.loyaltyRedeemed')}
                            </span>
                            <span>{invoice.loyaltyPointsRedeemed} pts</span>
                          </div>
                        )}
                        {invoice.walletAmountUsed > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('detail.walletUsed')}</span>
                            <span>{formatCurrency(invoice.walletAmountUsed)}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payments */}
              {invoice.payments && invoice.payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('detail.payments')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {invoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            {getPaymentMethodIcon(payment.paymentMethod)}
                            <div>
                              <div className="font-medium">
                                {t(`paymentMethods.${payment.paymentMethod}`)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(parseISO(payment.paymentDate), 'PPP')} at{' '}
                                {payment.paymentTime}
                              </div>
                              {payment.transactionId && (
                                <div className="text-xs text-muted-foreground">
                                  Ref: {payment.transactionId}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              {canWrite && isDraft && (
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {canAddPayment && (
                      <Button className="w-full" onClick={() => setShowPaymentDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('actions.addPayment')}
                      </Button>
                    )}
                    {canFinalize && (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={handleFinalize}
                        disabled={finalizeInvoice.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('actions.finalize')}
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleCancel}
                        disabled={cancelInvoice.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('actions.cancel')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Invoice Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('detail.summary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('detail.grandTotal')}</span>
                    <span className="font-semibold">{formatCurrency(invoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('detail.amountPaid')}</span>
                    <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  {invoice.amountDue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('detail.amountDue')}</span>
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(invoice.amountDue)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {(invoice.notes || invoice.internalNotes) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {invoice.notes && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Customer Notes
                        </div>
                        <div className="mt-1">{invoice.notes}</div>
                      </div>
                    )}
                    {invoice.internalNotes && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Internal Notes
                        </div>
                        <div className="mt-1">{invoice.internalNotes}</div>
                      </div>
                    )}
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
