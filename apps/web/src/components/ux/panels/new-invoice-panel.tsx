'use client';

/**
 * New Invoice Panel
 * Side panel for creating invoices with services, products, and split payments.
 *
 * Features:
 * - Customer combobox with search
 * - Service multi-select with stylist per service
 * - Product multi-select
 * - Live totals calculation
 * - Split payment support
 * - Save as Draft or Create & Finalize
 * - Confirmation dialog before finalize
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  User,
  Package,
  Scissors,
  Plus,
  X,
  Banknote,
  CreditCard,
  Smartphone,
  UserPlus,
  CheckCircle,
  FileText,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomerCombobox, ServiceCombobox } from '@/components/common';
import type { CustomerOption, ServiceOption } from '@/components/common';
import {
  useClosePanel,
  useSlideOverUnsavedChanges,
  useOpenPanel,
} from '@/components/ux/slide-over';
import { useCustomerSearch } from '@/hooks/queries/use-customers';
import { useServices } from '@/hooks/queries/use-services';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useProductsForBilling } from '@/hooks/queries/use-inventory';
import { useCreateInvoice, useQuickBill, useCalculateTotals } from '@/hooks/queries/use-invoices';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PaymentMethod, PaymentInput, InvoiceItemInput } from '@/types/billing';

// ============================================
// Types
// ============================================

interface InvoiceLineItem {
  id: string;
  type: 'service' | 'product';
  referenceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  stylistId?: string;
  stylistName?: string;
}

interface NewInvoicePanelProps {
  customerId?: string;
  onSuccess?: (invoiceId: string) => void;
}

// ============================================
// Constants
// ============================================

const PAYMENT_METHODS: { method: PaymentMethod; icon: React.ElementType; label: string }[] = [
  { method: 'cash', icon: Banknote, label: 'Cash' },
  { method: 'card', icon: CreditCard, label: 'Card' },
  { method: 'upi', icon: Smartphone, label: 'UPI' },
];

// ============================================
// Helper Components
// ============================================

interface LineItemRowProps {
  item: InvoiceLineItem;
  stylists: { userId: string; name: string }[];
  onUpdateStylist: (stylistId: string) => void;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function LineItemRow({
  item,
  stylists,
  onUpdateStylist,
  onUpdateQuantity,
  onRemove,
}: LineItemRowProps) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {item.type === 'service' ? (
            <Scissors className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium truncate">{item.name}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          ₹{item.unitPrice.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Stylist selector for services */}
      {item.type === 'service' && (
        <Select value={item.stylistId || ''} onValueChange={onUpdateStylist}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Stylist" />
          </SelectTrigger>
          <SelectContent>
            {stylists.map((s) => (
              <SelectItem key={s.userId} value={s.userId}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Quantity */}
      <Input
        type="number"
        value={item.quantity}
        onChange={(e) => onUpdateQuantity(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-16 h-8 text-center"
        min={1}
      />

      {/* Total */}
      <div className="w-20 text-right font-medium">
        ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
      </div>

      {/* Remove */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface SplitPaymentRowProps {
  payment: PaymentInput;
  index: number;
  onUpdate: (index: number, payment: PaymentInput) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  maxAmount: number;
}

function SplitPaymentRow({
  payment,
  index,
  onUpdate,
  onRemove,
  canRemove,
  maxAmount,
}: SplitPaymentRowProps) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <div className="flex flex-wrap gap-1">
          {PAYMENT_METHODS.map(({ method, icon: Icon, label }) => (
            <Button
              key={method}
              type="button"
              variant={payment.paymentMethod === method ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-2"
              onClick={() => onUpdate(index, { ...payment, paymentMethod: method })}
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">₹</span>
          <Input
            type="number"
            value={payment.amount || ''}
            onChange={(e) =>
              onUpdate(index, {
                ...payment,
                amount: Math.min(parseFloat(e.target.value) || 0, maxAmount),
              })
            }
            className="h-8"
            placeholder="Amount"
            min={0}
            max={maxAmount}
            step={0.01}
          />
        </div>
      </div>
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  customerName?: string;
  items: InvoiceLineItem[];
  payments: PaymentInput[];
  totals: {
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
  };
}

function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  customerName,
  items,
  payments,
  totals,
}: ConfirmDialogProps) {
  const totalPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const isFullyPaid = Math.abs(totalPayment - totals.grandTotal) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Confirm Invoice
          </DialogTitle>
          <DialogDescription>Review the details before creating the invoice.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{customerName || 'Guest'}</span>
          </div>

          {/* Items */}
          <div>
            <Label className="text-xs text-muted-foreground">Items ({items.length})</Label>
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="ml-2">
                    ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {totals.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (GST)</span>
                <span>₹{totals.taxAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Grand Total</span>
              <span>₹{totals.grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <Separator />

          {/* Payment Breakdown */}
          <div>
            <Label className="text-xs text-muted-foreground">Payment</Label>
            <div className="mt-1 space-y-1">
              {payments
                .filter((p) => p.amount > 0)
                .map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{p.paymentMethod}</span>
                    <span>₹{p.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
            </div>
          </div>

          {!isFullyPaid && (
            <p className="text-sm text-destructive">
              Payment amount (₹{totalPayment.toLocaleString('en-IN')}) doesn't match total (₹
              {totals.grandTotal.toLocaleString('en-IN')})
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!isFullyPaid || isLoading}>
            {isLoading ? 'Creating...' : 'Confirm & Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Component
// ============================================

export function NewInvoicePanel({
  customerId: _initialCustomerId,
  onSuccess,
}: NewInvoicePanelProps) {
  const closePanel = useClosePanel();
  const { setUnsavedChanges } = useSlideOverUnsavedChanges();
  const { openNewAppointment } = useOpenPanel();
  const { branchId } = useBranchContext();

  // State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [payments, setPayments] = useState<PaymentInput[]>([{ paymentMethod: 'cash', amount: 0 }]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [_productSearchQuery, _setProductSearchQuery] = useState('');

  // Queries
  const { data: customerSearchData } = useCustomerSearch({ q: customerSearchQuery, limit: 10 });
  const { data: servicesData, isLoading: servicesLoading } = useServices({});
  const { data: staffData, isLoading: _staffLoading } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
  });
  const { data: productsData, isLoading: productsLoading } = useProductsForBilling(
    branchId || '',
    _productSearchQuery
  );

  // Mutations
  const createInvoice = useCreateInvoice();
  const quickBill = useQuickBill();
  const calculateTotalsMutation = useCalculateTotals();

  // Calculated totals from API
  const [calculatedTotals, setCalculatedTotals] = useState<{
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
  } | null>(null);

  // Derived data
  const customerOptions: CustomerOption[] = useMemo(() => {
    if (!customerSearchData) return [];
    return customerSearchData.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      visitCount: c.visitCount,
      loyaltyPoints: c.loyaltyPoints,
      tags: c.tags,
    }));
  }, [customerSearchData]);

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

  const stylists = useMemo(() => {
    if (!staffData?.data) return [];
    return staffData.data.map((s) => ({
      userId: s.userId,
      name: s.user?.name || 'Unknown',
    }));
  }, [staffData?.data]);

  const products = useMemo(() => {
    if (!productsData) return [];
    return productsData.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.sellingPrice),
      sku: p.sku,
    }));
  }, [productsData]);

  // Calculate totals using API
  useEffect(() => {
    if (!branchId || lineItems.length === 0) {
      setCalculatedTotals(null);
      return;
    }

    const items = lineItems.map((item) => ({
      itemType: item.type,
      referenceId: item.referenceId,
      quantity: item.quantity,
      stylistId: item.stylistId,
    }));

    // Debounce the API call
    const timer = setTimeout(() => {
      calculateTotalsMutation.mutate(
        { branchId, items },
        {
          onSuccess: (data: any) => {
            setCalculatedTotals({
              subtotal: data.subtotal || 0,
              taxAmount: data.totalTax || 0,
              grandTotal: data.grandTotal || 0,
            });
          },
          onError: () => {
            // Fallback to simple calculation on error
            const subtotal = lineItems.reduce(
              (sum, item) => sum + item.unitPrice * item.quantity,
              0
            );
            const taxAmount = subtotal * 0.18;
            setCalculatedTotals({
              subtotal,
              taxAmount,
              grandTotal: subtotal + taxAmount,
            });
          },
        }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [branchId, lineItems, calculateTotalsMutation]);

  // Use calculated totals or fallback to simple calculation
  const totals = useMemo(() => {
    if (calculatedTotals) {
      return calculatedTotals;
    }
    // Fallback while loading or if no items
    const subtotal = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = subtotal * 0.18;
    const grandTotal = subtotal + taxAmount;
    return { subtotal, taxAmount, grandTotal };
  }, [calculatedTotals, lineItems]);

  // Check if there are services without appointments
  const hasServicesWithoutAppointment = useMemo(() => {
    return lineItems.some((item) => item.type === 'service');
  }, [lineItems]);

  // Handler to switch to appointment flow
  const handleCreateAppointmentInstead = useCallback(() => {
    closePanel();
    openNewAppointment({
      customerId: selectedCustomer?.id,
    });
  }, [closePanel, openNewAppointment, selectedCustomer?.id]);

  // Auto-fill payment amount when totals change
  useEffect(() => {
    if (totals.grandTotal > 0 && payments.length === 1 && payments[0].amount === 0) {
      setPayments([{ ...payments[0], amount: Math.round(totals.grandTotal) }]);
    }
  }, [totals.grandTotal]);

  // Track unsaved changes
  const hasChanges = lineItems.length > 0 || !!selectedCustomer || isNewCustomer;
  useEffect(() => {
    setUnsavedChanges(hasChanges);
    return () => setUnsavedChanges(false);
  }, [hasChanges, setUnsavedChanges]);

  // Handlers
  const handleCustomerSelect = useCallback((customer: CustomerOption | null) => {
    setSelectedCustomer(customer);
    setIsNewCustomer(false);
  }, []);

  const handleNewCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setIsNewCustomer(true);
    setNewCustomerName('');
    setNewCustomerPhone('');
  }, []);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  }, []);

  const handleAddServices = useCallback(
    (serviceIds: string[]) => {
      const newItems: InvoiceLineItem[] = serviceIds
        .filter(
          (id) => !lineItems.some((item) => item.referenceId === id && item.type === 'service')
        )
        .map((id) => {
          const service = services.find((s) => s.id === id);
          return {
            id: `service-${id}-${Date.now()}`,
            type: 'service' as const,
            referenceId: id,
            name: service?.name || 'Unknown Service',
            unitPrice: service?.basePrice || 0,
            quantity: 1,
          };
        });
      setLineItems((prev) => [...prev, ...newItems]);
    },
    [lineItems, services]
  );

  const handleAddProduct = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      // Check if already added
      const existing = lineItems.find(
        (item) => item.referenceId === productId && item.type === 'product'
      );
      if (existing) {
        // Increment quantity
        setLineItems((prev) =>
          prev.map((item) =>
            item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      } else {
        setLineItems((prev) => [
          ...prev,
          {
            id: `product-${productId}-${Date.now()}`,
            type: 'product',
            referenceId: productId,
            name: product.name,
            unitPrice: product.price,
            quantity: 1,
          },
        ]);
      }
    },
    [lineItems, products]
  );

  const handleUpdateItemStylist = useCallback(
    (itemId: string, stylistId: string) => {
      const stylist = stylists.find((s) => s.userId === stylistId);
      setLineItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, stylistId, stylistName: stylist?.name } : item
        )
      );
    },
    [stylists]
  );

  const handleUpdateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setLineItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)));
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleUpdatePayment = useCallback((index: number, payment: PaymentInput) => {
    setPayments((prev) => prev.map((p, i) => (i === index ? payment : p)));
  }, []);

  const handleRemovePayment = useCallback((index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddPayment = useCallback(() => {
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = Math.max(0, Math.round(totals.grandTotal) - totalPaid);
    setPayments((prev) => [...prev, { paymentMethod: 'cash', amount: remaining }]);
  }, [payments, totals.grandTotal]);

  // Build invoice input
  const buildInvoiceInput = useCallback(() => {
    const items: InvoiceItemInput[] = lineItems.map((item) => ({
      itemType: item.type,
      referenceId: item.referenceId,
      quantity: item.quantity,
      stylistId: item.stylistId,
    }));

    return {
      branchId: branchId || '',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || newCustomerName || 'Guest',
      customerPhone: selectedCustomer?.phone || newCustomerPhone || undefined,
      items,
    };
  }, [branchId, selectedCustomer, newCustomerName, newCustomerPhone, lineItems]);

  // Save as Draft
  const handleSaveDraft = useCallback(async () => {
    if (!branchId || lineItems.length === 0) return;

    try {
      const input = buildInvoiceInput();
      const result = await createInvoice.mutateAsync(input);
      toast.success('Invoice saved as draft');
      onSuccess?.(result.id);
      closePanel();
    } catch (error) {
      const isServerError =
        error instanceof Error &&
        (error.message?.includes('500') || error.message?.includes('Internal'));
      toast.error('Failed to save invoice', {
        description: isServerError
          ? 'Something went wrong. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Unknown error',
      });
    }
  }, [branchId, lineItems, buildInvoiceInput, createInvoice, onSuccess, closePanel]);

  // Create & Finalize
  const handleCreateInvoice = useCallback(async () => {
    if (!branchId || lineItems.length === 0) return;

    try {
      const input = buildInvoiceInput();
      const validPayments = payments.filter((p) => p.amount > 0);
      const result = await quickBill.mutateAsync({ ...input, payments: validPayments });
      toast.success('Invoice created successfully', {
        description: `Invoice #${result.invoiceNumber}`,
      });
      setShowConfirmDialog(false);
      onSuccess?.(result.id);
      closePanel();
    } catch (error) {
      const isServerError =
        error instanceof Error &&
        (error.message?.includes('500') || error.message?.includes('Internal'));
      toast.error('Failed to create invoice', {
        description: isServerError
          ? 'Something went wrong. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Unknown error',
      });
    }
  }, [branchId, lineItems, buildInvoiceInput, payments, quickBill, onSuccess, closePanel]);

  // Validation
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const isFullyPaid = Math.abs(totalPaid - Math.round(totals.grandTotal)) < 0.01;
  const canCreate = lineItems.length > 0 && isFullyPaid;
  const canSaveDraft = lineItems.length > 0;

  // No branch selected
  if (!branchId) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <p className="text-destructive mb-4">No branch selected. Please select a branch first.</p>
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
          {/* Customer Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Customer
            </Label>

            {isNewCustomer ? (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Customer</span>
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="p-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <Input
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <Input
                  placeholder="Phone number"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomerCombobox
                    value={selectedCustomer}
                    onChange={handleCustomerSelect}
                    customers={customerOptions}
                    onSearchChange={setCustomerSearchQuery}
                    placeholder="Search customer..."
                  />
                </div>
                {!selectedCustomer && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleNewCustomer}
                    className="shrink-0"
                    title="Add new customer"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Services Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              Services
            </Label>

            {servicesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <ServiceCombobox
                value={lineItems.filter((i) => i.type === 'service').map((i) => i.referenceId)}
                onChange={handleAddServices}
                services={services}
                showTotal={false}
              />
            )}
          </div>

          {/* Products Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Products
            </Label>

            {productsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select onValueChange={handleAddProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Add a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{product.name}</span>
                        <span className="text-muted-foreground ml-2">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Items ({lineItems.length})</Label>
              <div className="space-y-2">
                {lineItems.map((item) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    stylists={stylists}
                    onUpdateStylist={(stylistId) => handleUpdateItemStylist(item.id, stylistId)}
                    onUpdateQuantity={(qty) => handleUpdateItemQuantity(item.id, qty)}
                    onRemove={() => handleRemoveItem(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

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
                  This invoice won't be linked to an appointment. Stylist scheduling and time
                  tracking won't apply.
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1 text-amber-700 dark:text-amber-300 hover:text-amber-900"
                  onClick={handleCreateAppointmentInstead}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Create appointment instead
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (GST)</span>
                <span className={cn(calculateTotalsMutation.isPending && 'opacity-50')}>
                  ₹{Math.round(totals.taxAmount).toLocaleString('en-IN')}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className={cn(calculateTotalsMutation.isPending && 'opacity-50')}>
                  ₹{Math.round(totals.grandTotal).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Payment Section */}
          {lineItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Payment</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPayment}
                  disabled={isFullyPaid}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Split Payment
                </Button>
              </div>

              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <SplitPaymentRow
                    key={index}
                    payment={payment}
                    index={index}
                    onUpdate={handleUpdatePayment}
                    onRemove={handleRemovePayment}
                    canRemove={payments.length > 1}
                    maxAmount={Math.round(totals.grandTotal)}
                  />
                ))}
              </div>

              {/* Payment Summary */}
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Total Paid</span>
                <span className={cn('font-medium', !isFullyPaid && 'text-destructive')}>
                  ₹{totalPaid.toLocaleString('en-IN')}
                  {!isFullyPaid && (
                    <span className="text-xs ml-1">
                      (₹
                      {Math.abs(Math.round(totals.grandTotal) - totalPaid).toLocaleString(
                        'en-IN'
                      )}{' '}
                      {totalPaid < totals.grandTotal ? 'remaining' : 'overpaid'})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 flex gap-3 bg-background">
        <Button type="button" variant="outline" className="flex-1" onClick={() => closePanel()}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={!canSaveDraft || createInvoice.isPending}
        >
          <FileText className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => setShowConfirmDialog(true)}
          disabled={!canCreate}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleCreateInvoice}
        isLoading={quickBill.isPending}
        customerName={selectedCustomer?.name || newCustomerName || undefined}
        items={lineItems}
        payments={payments}
        totals={totals}
      />
    </div>
  );
}
