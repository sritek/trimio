'use client';

/**
 * Edit Invoice Panel
 * Side panel for editing draft invoices.
 * Allows modifying items, customer, and finalizing with payment.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  User,
  Package,
  Scissors,
  X,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ServiceCombobox, ConfirmDialog, SplitPaymentInput } from '@/components/common';
import type { ServiceOption } from '@/components/common';
import { useClosePanel, useOpenPanel } from '@/components/ux/slide-over';
import { useServices } from '@/hooks/queries/use-services';
import { useProductsForBilling } from '@/hooks/queries/use-inventory';
import {
  useInvoice,
  useFinalizeInvoice,
  useAddInvoiceItem,
  useRemoveInvoiceItem,
  useDeleteInvoice,
} from '@/hooks/queries/use-invoices';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { formatCurrency } from '@/lib/format';
import type { PaymentInput } from '@/types/billing';

// ============================================
// Types
// ============================================

interface EditInvoicePanelProps {
  invoiceId: string;
  onSuccess?: () => void;
}

// ============================================
// Main Component
// ============================================

export function EditInvoicePanel({ invoiceId, onSuccess }: EditInvoicePanelProps) {
  const closePanel = useClosePanel();
  const { openNewAppointment } = useOpenPanel();
  const { branchId } = useBranchContext();
  const { handleError } = useErrorHandler();

  // Fetch invoice data
  const { data: invoice, isLoading: invoiceLoading, refetch } = useInvoice(invoiceId);

  // State for new items to add
  const [showAddService, setShowAddService] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [payments, setPayments] = useState<PaymentInput[]>([{ paymentMethod: 'cash', amount: 0 }]);

  // Queries
  const { data: servicesData } = useServices({});
  const { data: productsData } = useProductsForBilling(branchId || '', '');

  // Mutations
  const finalizeInvoice = useFinalizeInvoice();
  const addItem = useAddInvoiceItem();
  const removeItem = useRemoveInvoiceItem();
  const deleteInvoice = useDeleteInvoice();

  // Derived data
  const services: ServiceOption[] = useMemo(() => {
    if (!servicesData?.data) return [];
    return servicesData.data.map((s) => ({
      id: s.id,
      name: s.name,
      basePrice: s.basePrice,
      categoryId: s.categoryId,
      categoryName: s.category?.name,
      duration: s.durationMinutes,
    }));
  }, [servicesData?.data]);

  const products = useMemo(() => {
    if (!productsData) return [];
    return productsData.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.sellingPrice),
      sku: p.sku,
    }));
  }, [productsData]);

  // Check if invoice has services (for warning)
  const hasServicesWithoutAppointment = useMemo(() => {
    if (!invoice?.items) return false;
    return invoice.items.some((item) => item.itemType === 'service') && !invoice.appointmentId;
  }, [invoice]);

  // Auto-fill payment amount
  useEffect(() => {
    if (invoice && invoice.amountDue > 0 && payments.length === 1 && payments[0].amount === 0) {
      setPayments([{ ...payments[0], amount: Math.round(invoice.amountDue) }]);
    }
  }, [invoice?.amountDue]);

  // Handlers
  const handleAddService = useCallback(
    async (serviceIds: string[]) => {
      if (!invoice) return;

      for (const serviceId of serviceIds) {
        // Check if already in invoice
        const exists = invoice.items?.some(
          (item) => item.referenceId === serviceId && item.itemType === 'service'
        );
        if (exists) continue;

        try {
          await addItem.mutateAsync({
            invoiceId,
            item: { itemType: 'service', referenceId: serviceId, quantity: 1 },
          });
        } catch (error) {
          handleError(error, {
            customMessage: 'Failed to add service. Please try again.',
          });
        }
      }
      refetch();
      setShowAddService(false);
    },
    [invoice, invoiceId, addItem, refetch, handleError]
  );

  const handleAddProduct = useCallback(
    async (productId: string) => {
      if (!invoice) return;

      try {
        await addItem.mutateAsync({
          invoiceId,
          item: { itemType: 'product', referenceId: productId, quantity: 1 },
        });
        refetch();
      } catch (error) {
        handleError(error, {
          customMessage: 'Failed to add product. Please try again.',
        });
      }
      setShowAddProduct(false);
    },
    [invoice, invoiceId, addItem, refetch, handleError]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      try {
        await removeItem.mutateAsync({ invoiceId, itemId });
        refetch();
        toast.success('Item removed');
      } catch (error) {
        handleError(error, {
          customMessage: 'Failed to remove item. Please try again.',
        });
      }
    },
    [invoiceId, removeItem, refetch, handleError]
  );

  const handleFinalize = useCallback(async () => {
    if (!invoice) return;

    const validPayments = payments.filter((p) => p.amount > 0);
    try {
      await finalizeInvoice.mutateAsync({
        invoiceId,
        payments: validPayments.length > 0 ? validPayments : undefined,
      });
      toast.success('Invoice finalized');
      setShowFinalizeDialog(false);
      onSuccess?.();
      closePanel();
    } catch (error) {
      handleError(error, {
        customMessage: 'Failed to finalize invoice. Please try again.',
      });
    }
  }, [invoice, invoiceId, payments, finalizeInvoice, onSuccess, closePanel, handleError]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteInvoice.mutateAsync(invoiceId);
      toast.success('Invoice deleted');
      setShowDeleteDialog(false);
      onSuccess?.();
      closePanel();
    } catch (error) {
      handleError(error, {
        customMessage: 'Failed to delete invoice. Please try again.',
      });
    }
  }, [invoiceId, deleteInvoice, onSuccess, closePanel, handleError]);

  const handleCreateAppointmentInstead = useCallback(() => {
    closePanel();
    openNewAppointment({
      customerId: invoice?.customerId || undefined,
    });
  }, [closePanel, openNewAppointment, invoice?.customerId]);

  // Validation
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const isFullyPaid = invoice ? Math.abs(totalPaid - invoice.amountDue) < 0.01 : false;
  const canFinalize = invoice && invoice.items && invoice.items.length > 0 && isFullyPaid;

  // Loading state
  if (invoiceLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Not found
  if (!invoice) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Invoice not found</p>
        <Button variant="outline" onClick={() => closePanel()}>
          Close
        </Button>
      </div>
    );
  }

  // Not a draft
  if (invoice.status !== 'draft') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Only draft invoices can be edited</p>
        <Button variant="outline" onClick={() => closePanel()}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Customer Info (read-only for now) */}
          <div className="rounded-lg border p-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              Customer
            </Label>
            <div className="font-medium">{invoice.customerName || 'Guest'}</div>
            {invoice.customerPhone && (
              <div className="text-sm text-muted-foreground">{invoice.customerPhone}</div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Items ({invoice.items?.length || 0})</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddService(true)}
                >
                  <Scissors className="h-4 w-4 mr-1" />
                  Service
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProduct(true)}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Product
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {invoice.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.itemType === 'service' ? (
                        <Scissors className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(item.netAmount)}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={removeItem.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {(!invoice.items || invoice.items.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No items. Add services or products above.
                </div>
              )}
            </div>
          </div>

          {/* Warning for services without appointment */}
          {hasServicesWithoutAppointment && (
            <Alert
              variant="default"
              className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <span className="font-medium">Services without appointment</span>
                <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                  This invoice isn't linked to an appointment.
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1 text-amber-700 dark:text-amber-300"
                  onClick={handleCreateAppointmentInstead}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Create appointment instead
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Totals */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(invoice.totalTax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Already Paid</span>
                  <span>{formatCurrency(invoice.amountPaid)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-medium">
                <span>Amount Due</span>
                <span>{formatCurrency(invoice.amountDue)}</span>
              </div>
            </div>
          )}

          {/* Payment Section (for finalization) */}
          {invoice.items && invoice.items.length > 0 && invoice.amountDue > 0 && (
            <SplitPaymentInput
              payments={payments}
              onChange={setPayments}
              totalAmount={invoice.grandTotal}
              amountPaid={invoice.amountPaid}
              mode="compact"
            />
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 space-y-2 bg-background">
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => closePanel()}>
            Close
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => setShowFinalizeDialog(true)}
            disabled={!canFinalize}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Finalize Invoice
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Draft
        </Button>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
          </DialogHeader>
          <ServiceCombobox
            value={[]}
            onChange={handleAddService}
            services={services}
            showTotal={false}
          />
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <Select onValueChange={handleAddProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Select a product..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation */}
      <ConfirmDialog
        open={showFinalizeDialog}
        onOpenChange={setShowFinalizeDialog}
        title="Finalize Invoice"
        description={`This will finalize the invoice for ${formatCurrency(invoice.grandTotal)}. This action cannot be undone.`}
        confirmText="Finalize"
        onConfirm={handleFinalize}
        isLoading={finalizeInvoice.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Draft Invoice"
        description="Are you sure you want to delete this draft invoice? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteInvoice.isPending}
      />
    </div>
  );
}
