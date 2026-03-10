'use client';

/**
 * Split Payment Input Component
 * Reusable component for managing split payments across the application.
 *
 * Features:
 * - Multiple payment methods (Cash, Card, UPI, etc.)
 * - Add/remove payment splits
 * - Optional additional fields (card last 4, UPI ID, transaction ref)
 * - Payment summary with remaining amount
 * - Compact mode for panels, full mode for dialogs
 */

import { useCallback } from 'react';
import { Plus, X, Banknote, CreditCard, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { PaymentMethod, PaymentInput } from '@/types/billing';

// ============================================
// Types
// ============================================

export interface SplitPaymentInputProps {
  /** Array of payment entries */
  payments: PaymentInput[];
  /** Callback when payments change */
  onChange: (payments: PaymentInput[]) => void;
  /** Total amount to be paid */
  totalAmount: number;
  /** Amount already paid (for partial payments on existing invoices) */
  amountPaid?: number;
  /** Display mode - compact for panels, full for dialogs */
  mode?: 'compact' | 'full';
  /** Whether to show additional fields (card last 4, UPI ID, etc.) */
  showAdditionalFields?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export interface SplitPaymentRowProps {
  payment: PaymentInput;
  index: number;
  onUpdate: (index: number, payment: PaymentInput) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  maxAmount: number;
  mode?: 'compact' | 'full';
  showAdditionalFields?: boolean;
  disabled?: boolean;
}

// ============================================
// Constants
// ============================================

const COMPACT_PAYMENT_METHODS: { method: PaymentMethod; icon: React.ElementType; label: string }[] =
  [
    { method: 'cash', icon: Banknote, label: 'Cash' },
    { method: 'card', icon: CreditCard, label: 'Card' },
    { method: 'upi', icon: Smartphone, label: 'UPI' },
  ];

const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'card',
  'upi',
  'wallet',
  'bank_transfer',
  'cheque',
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  wallet: 'Wallet',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  loyalty: 'Loyalty Points',
};

// ============================================
// SplitPaymentRow Component
// ============================================

export function SplitPaymentRow({
  payment,
  index,
  onUpdate,
  onRemove,
  canRemove,
  maxAmount,
  mode = 'compact',
  showAdditionalFields = false,
  disabled = false,
}: SplitPaymentRowProps) {
  if (mode === 'compact') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="flex flex-wrap gap-1">
            {COMPACT_PAYMENT_METHODS.map(({ method, icon: Icon, label }) => (
              <Button
                key={method}
                type="button"
                variant={payment.paymentMethod === method ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2"
                onClick={() => onUpdate(index, { ...payment, paymentMethod: method })}
                disabled={disabled}
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
              disabled={disabled}
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
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Full mode with additional fields
  return (
    <div className="space-y-3 p-3 border rounded-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Payment {index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={payment.paymentMethod}
            onValueChange={(value) =>
              onUpdate(index, { ...payment, paymentMethod: value as PaymentMethod })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={maxAmount}
            value={payment.amount || ''}
            onChange={(e) =>
              onUpdate(index, {
                ...payment,
                amount: Math.min(parseFloat(e.target.value) || 0, maxAmount),
              })
            }
            placeholder="0.00"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Additional fields based on payment method */}
      {showAdditionalFields && (
        <>
          {payment.paymentMethod === 'card' && (
            <div className="space-y-2">
              <Label>Card Last 4 Digits</Label>
              <Input
                maxLength={4}
                value={payment.cardLastFour || ''}
                onChange={(e) => onUpdate(index, { ...payment, cardLastFour: e.target.value })}
                placeholder="1234"
                disabled={disabled}
              />
            </div>
          )}

          {payment.paymentMethod === 'upi' && (
            <div className="space-y-2">
              <Label>UPI ID / Transaction Ref</Label>
              <Input
                value={payment.upiId || ''}
                onChange={(e) => onUpdate(index, { ...payment, upiId: e.target.value })}
                placeholder="user@upi"
                disabled={disabled}
              />
            </div>
          )}

          {(payment.paymentMethod === 'bank_transfer' || payment.paymentMethod === 'cheque') && (
            <div className="space-y-2">
              <Label>Reference / Transaction ID</Label>
              <Input
                value={payment.transactionId || ''}
                onChange={(e) => onUpdate(index, { ...payment, transactionId: e.target.value })}
                placeholder="Transaction reference"
                disabled={disabled}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// SplitPaymentInput Component
// ============================================

export function SplitPaymentInput({
  payments,
  onChange,
  totalAmount,
  amountPaid = 0,
  mode = 'compact',
  showAdditionalFields = false,
  disabled = false,
  className,
}: SplitPaymentInputProps) {
  const amountDue = totalAmount - amountPaid;
  const totalPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingAmount = amountDue - totalPayment;
  const isFullyPaid = Math.abs(remainingAmount) < 0.01;

  const handleUpdatePayment = useCallback(
    (index: number, payment: PaymentInput) => {
      const newPayments = payments.map((p, i) => (i === index ? payment : p));
      onChange(newPayments);
    },
    [payments, onChange]
  );

  const handleRemovePayment = useCallback(
    (index: number) => {
      const newPayments = payments.filter((_, i) => i !== index);
      onChange(newPayments);
    },
    [payments, onChange]
  );

  const handleAddPayment = useCallback(() => {
    const remaining = Math.max(0, amountDue - totalPayment);
    onChange([...payments, { paymentMethod: 'cash', amount: remaining }]);
  }, [payments, onChange, amountDue, totalPayment]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Payment</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddPayment}
          disabled={disabled || isFullyPaid}
        >
          <Plus className="h-4 w-4 mr-1" />
          {mode === 'compact' ? 'Split Payment' : 'Add Split Payment'}
        </Button>
      </div>

      {/* Payment Rows */}
      <div className="space-y-2">
        {payments.map((payment, index) => (
          <SplitPaymentRow
            key={index}
            payment={payment}
            index={index}
            onUpdate={handleUpdatePayment}
            onRemove={handleRemovePayment}
            canRemove={payments.length > 1}
            maxAmount={amountDue}
            mode={mode}
            showAdditionalFields={showAdditionalFields}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Payment Summary */}
      <div className="flex items-center justify-between text-sm pt-2 border-t">
        <span className="text-muted-foreground">Total Payment</span>
        <span className={cn('font-medium', !isFullyPaid && 'text-destructive')}>
          {formatCurrency(totalPayment)}
          {!isFullyPaid && (
            <span className="text-xs ml-1">
              ({formatCurrency(Math.abs(remainingAmount))}{' '}
              {remainingAmount > 0 ? 'remaining' : 'overpaid'})
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
