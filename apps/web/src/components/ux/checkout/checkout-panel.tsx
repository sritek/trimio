'use client';

/**
 * Checkout Panel Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.2, 6.6, 6.7, 6.9, 6.10, 6.11
 *
 * Slide-over panel for checkout workflow.
 * Pre-populates with appointment services.
 * Displays customer info, membership status, wallet balance.
 * Shows running total with tax breakdown.
 * Includes tip selector, outstanding balance warning, and completion flow.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useClosePanel, useSlideOverUnsavedChanges } from '@/components/ux/slide-over';
import { SlideOverContent } from '@/components/ux/slide-over/slide-over-content';
import { SlideOverFooter } from '@/components/ux/slide-over/slide-over-footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceList } from './service-list';
import { ProductSearch } from './product-search';
import { TipSelector } from './tip-selector';
import { OutstandingBalanceWarning } from './outstanding-balance-warning';
import { CheckoutCompletion } from './checkout-completion';
import {
  useStartCheckout,
  useCheckoutSession,
  useRemoveCheckoutItem,
  useAddCheckoutItem,
  useProcessCheckoutPayment,
  useCompleteCheckout,
} from '@/hooks/queries/use-checkout';
import { useBranchContext } from '@/hooks/use-branch-context';
import { toast } from 'sonner';
import {
  User,
  CreditCard,
  Wallet,
  Star,
  Package,
  Banknote,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CheckoutSession } from '@/types/checkout';

// ============================================
// Props
// ============================================

interface CheckoutPanelProps {
  appointmentId?: string;
  customerId?: string;
  onComplete?: (invoiceId: string) => void;
}

// ============================================
// Sub-Components
// ============================================

function CustomerInfoCard({ session }: { session: CheckoutSession }) {
  if (!session.customer) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
        <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Guest Checkout</p>
      </div>
    );
  }

  const { customer, activeMemberships, activePackages } = session;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{customer.name}</h3>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
        </div>
        <div className="flex gap-1">
          {activeMemberships.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Member
            </Badge>
          )}
          {activePackages.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Package className="h-3 w-3 mr-1" />
              {activePackages.length} Package{activePackages.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Wallet</p>
            <p className="font-medium">₹{customer.walletBalance.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Loyalty Points</p>
            <p className="font-medium">
              {customer.loyaltyPoints}
              {customer.loyaltyPointValue > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  (₹{(customer.loyaltyPoints * customer.loyaltyPointValue).toFixed(2)})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalsSection({ session }: { session: CheckoutSession }) {
  const { totals } = session;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>₹{totals.subtotal.toFixed(2)}</span>
      </div>

      {totals.discountTotal > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Discount</span>
          <span>-₹{totals.discountTotal.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tax (GST)</span>
        <span>₹{totals.taxTotal.toFixed(2)}</span>
      </div>

      {(totals.cgstAmount > 0 || totals.sgstAmount > 0) && (
        <div className="pl-4 space-y-1 text-xs text-muted-foreground">
          {totals.cgstAmount > 0 && (
            <div className="flex justify-between">
              <span>CGST</span>
              <span>₹{totals.cgstAmount.toFixed(2)}</span>
            </div>
          )}
          {totals.sgstAmount > 0 && (
            <div className="flex justify-between">
              <span>SGST</span>
              <span>₹{totals.sgstAmount.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {totals.igstAmount > 0 && (
        <div className="pl-4 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>IGST</span>
            <span>₹{totals.igstAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {totals.tipAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tip</span>
          <span>₹{totals.tipAmount.toFixed(2)}</span>
        </div>
      )}

      <Separator className="my-2" />

      <div className="flex justify-between font-semibold text-lg">
        <span>Total</span>
        <span>₹{totals.grandTotal.toFixed(2)}</span>
      </div>

      {totals.amountPaid > 0 && (
        <>
          <div className="flex justify-between text-sm text-green-600">
            <span>Paid</span>
            <span>₹{totals.amountPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Due</span>
            <span className={totals.amountDue > 0 ? 'text-destructive' : 'text-green-600'}>
              ₹{totals.amountDue.toFixed(2)}
            </span>
          </div>
        </>
      )}
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

export function CheckoutPanel({ appointmentId, customerId, onComplete }: CheckoutPanelProps) {
  const closePanel = useClosePanel();
  const { setUnsavedChanges } = useSlideOverUnsavedChanges();
  const { branchId } = useBranchContext();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'cash' | 'card' | 'upi' | null
  >(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Ref to track if session has been initialized (prevents re-render loop)
  const sessionInitialized = useRef(false);

  // Queries and mutations
  const startCheckout = useStartCheckout();
  const { data: session, isLoading: isLoadingSession } = useCheckoutSession(sessionId);
  const removeItem = useRemoveCheckoutItem();
  const addItem = useAddCheckoutItem();
  const processPayment = useProcessCheckoutPayment();
  const completeCheckout = useCompleteCheckout();

  // Store mutation functions in refs to avoid re-render loops
  // These refs are updated on each render but don't cause re-renders themselves
  const removeItemRef = useRef(removeItem);
  const addItemRef = useRef(addItem);
  const processPaymentRef = useRef(processPayment);
  const completeCheckoutRef = useRef(completeCheckout);

  // Keep refs up to date
  useEffect(() => {
    removeItemRef.current = removeItem;
    addItemRef.current = addItem;
    processPaymentRef.current = processPayment;
    completeCheckoutRef.current = completeCheckout;
  });

  // Initialize checkout session ONLY ONCE
  // Uses ref to prevent re-initialization on re-renders
  // The startCheckout mutation is NOT in deps to avoid infinite loop
  useEffect(() => {
    // Guard: only run once
    if (sessionInitialized.current) return;
    if (!branchId) return;

    sessionInitialized.current = true;

    startCheckout.mutate(
      {
        appointmentId,
        customerId,
        branchId,
      },
      {
        onSuccess: (newSession) => {
          setSessionId(newSession.id);
        },
        onError: (error) => {
          // Reset flag on error to allow retry
          sessionInitialized.current = false;
          toast.error('Failed to start checkout', {
            description: error.message,
          });
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, customerId, branchId]); // Intentionally exclude startCheckout to prevent re-render loop

  // Track unsaved changes
  useEffect(() => {
    if (session && session.payments.length > 0) {
      setUnsavedChanges(true);
    }
  }, [session, setUnsavedChanges]);

  // Handle remove item - uses ref to avoid re-render on mutation change
  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (!sessionId) return;
      removeItemRef.current.mutate(
        { sessionId, itemId },
        {
          onError: (error) => {
            toast.error('Failed to remove item', {
              description: error.message,
            });
          },
        }
      );
    },
    [sessionId]
  );

  // Handle add product - uses ref to avoid re-render on mutation change
  const handleAddProduct = useCallback(
    (productId: string, quantity: number = 1) => {
      if (!sessionId) return;
      addItemRef.current.mutate(
        {
          sessionId,
          itemType: 'product',
          referenceId: productId,
          quantity,
        },
        {
          onSuccess: () => {
            toast.success('Product added');
          },
          onError: (error) => {
            toast.error('Failed to add product', {
              description: error.message,
            });
          },
        }
      );
    },
    [sessionId]
  );

  // Handle payment - uses ref to avoid re-render on mutation change
  const handleAddPayment = useCallback(() => {
    if (!sessionId || !selectedPaymentMethod || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    processPaymentRef.current.mutate(
      {
        sessionId,
        payments: [
          {
            paymentMethod: selectedPaymentMethod,
            amount,
          },
        ],
      },
      {
        onSuccess: () => {
          setPaymentAmount('');
          toast.success('Payment added');
        },
        onError: (error) => {
          toast.error('Failed to process payment', {
            description: error.message,
          });
        },
      }
    );
  }, [sessionId, selectedPaymentMethod, paymentAmount]);

  // Handle complete checkout
  const handleComplete = useCallback(() => {
    if (!sessionId) return;
    setShowCompletionDialog(true);
  }, [sessionId]);

  // Handle completion with receipt options - uses ref to avoid re-render on mutation change
  const handleCompleteWithReceipt = useCallback(
    async (options: {
      sendReceipt: boolean;
      receiptMethod?: 'whatsapp' | 'email' | 'print' | 'none';
    }) => {
      if (!sessionId) return;

      completeCheckoutRef.current.mutate(
        {
          sessionId,
          sendReceipt: options.sendReceipt,
          receiptMethod: options.receiptMethod === 'none' ? undefined : options.receiptMethod,
          tipAmount,
        },
        {
          onSuccess: (result) => {
            toast.success('Checkout completed!', {
              description: 'Invoice has been generated.',
            });
            setUnsavedChanges(false);
            setShowCompletionDialog(false);
            onComplete?.(result.invoiceId);
            closePanel();
          },
          onError: (error) => {
            toast.error('Failed to complete checkout', {
              description: error.message,
            });
          },
        }
      );
    },
    [sessionId, tipAmount, onComplete, closePanel, setUnsavedChanges]
  );

  // Quick amount buttons
  const handleQuickAmount = useCallback(
    (type: 'exact' | 'round') => {
      if (!session) return;
      const due = session.totals.amountDue;
      if (type === 'exact') {
        setPaymentAmount(due.toFixed(2));
      } else {
        // Round up to nearest 10
        setPaymentAmount((Math.ceil(due / 10) * 10).toFixed(2));
      }
    },
    [session]
  );

  // Loading state
  if (startCheckout.isPending || isLoadingSession || !session) {
    return (
      <div className="flex flex-col h-full">
        <SlideOverContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </SlideOverContent>
      </div>
    );
  }

  const canComplete = session.totals.amountDue <= 0.01 && session.lineItems.length > 0;

  return (
    <div className="flex flex-col h-full">
      <SlideOverContent className="space-y-6">
        {/* Outstanding Balance Warning */}
        {session.customer && <OutstandingBalanceWarning customerId={session.customer.id} />}

        {/* Customer Info */}
        <CustomerInfoCard session={session} />

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Items</h3>
            <ProductSearch onAddProduct={handleAddProduct} isAdding={addItem.isPending} />
          </div>

          <ServiceList
            items={session.lineItems}
            onRemoveItem={handleRemoveItem}
            isLoading={removeItem.isPending}
          />
        </div>

        {/* Tip Selector */}
        {session.lineItems.length > 0 && (
          <TipSelector
            subtotal={session.totals.subtotal}
            currentTip={tipAmount}
            onTipChange={setTipAmount}
          />
        )}

        {/* Totals */}
        <TotalsSection session={session} />

        {/* Payment Section */}
        {session.totals.amountDue > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Payment</h3>

            {/* Payment Method Selection */}
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

            {/* Payment Amount */}
            {selectedPaymentMethod && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="flex-1 px-3 py-2 border rounded-md text-right font-medium"
                    min="0"
                    step="0.01"
                  />
                  <Button onClick={handleAddPayment} disabled={processPayment.isPending}>
                    Add
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleQuickAmount('exact')}
                  >
                    Exact (₹{session.totals.amountDue.toFixed(2)})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleQuickAmount('round')}
                  >
                    Round Up
                  </Button>
                </div>
              </div>
            )}

            {/* Payments Made */}
            {session.payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Payments Made</p>
                {session.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {payment.paymentMethod === 'cash' && <Banknote className="h-4 w-4" />}
                      {payment.paymentMethod === 'card' && <CreditCard className="h-4 w-4" />}
                      {payment.paymentMethod === 'upi' && <Smartphone className="h-4 w-4" />}
                      <span className="capitalize">{payment.paymentMethod}</span>
                    </div>
                    <span className="font-medium">₹{payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Complete Indicator */}
        {session.totals.amountDue <= 0.01 && session.payments.length > 0 && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Payment Complete</span>
          </div>
        )}
      </SlideOverContent>

      <SlideOverFooter>
        <Button variant="outline" onClick={() => closePanel()}>
          Cancel
        </Button>
        <Button onClick={handleComplete} disabled={!canComplete || completeCheckout.isPending}>
          {completeCheckout.isPending ? 'Processing...' : 'Complete Checkout'}
        </Button>
      </SlideOverFooter>

      {/* Checkout Completion Dialog */}
      <CheckoutCompletion
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        onComplete={handleCompleteWithReceipt}
        customerPhone={session.customer?.phone}
        customerEmail={session.customer?.email}
        isProcessing={completeCheckout.isPending}
      />
    </div>
  );
}
