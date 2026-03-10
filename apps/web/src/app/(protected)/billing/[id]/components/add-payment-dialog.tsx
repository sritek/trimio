'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { formatCurrency } from '@/lib/format';
import type { PaymentInput } from '@/types/billing';
import { SplitPaymentInput } from '@/components/common';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  onSubmit: (payments: PaymentInput[]) => Promise<void>;
  isLoading: boolean;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  amountDue,
  onSubmit,
  isLoading,
}: AddPaymentDialogProps) {
  const t = useTranslations('billing');

  const [payments, setPayments] = useState<PaymentInput[]>([
    { paymentMethod: 'cash', amount: amountDue },
  ]);

  // Reset payments when dialog opens with new amount
  useEffect(() => {
    if (open) {
      setPayments([{ paymentMethod: 'cash', amount: amountDue }]);
    }
  }, [open, amountDue]);

  const totalPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleSubmit = async () => {
    const validPayments = payments.filter((p) => p.amount > 0);
    if (validPayments.length === 0) return;

    await onSubmit(validPayments);
    // Reset form
    setPayments([{ paymentMethod: 'cash', amount: amountDue }]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setPayments([{ paymentMethod: 'cash', amount: amountDue }]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('actions.addPayment')}</DialogTitle>
          <DialogDescription>Amount due: {formatCurrency(amountDue)}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <SplitPaymentInput
            payments={payments}
            onChange={setPayments}
            totalAmount={amountDue}
            mode="full"
            showAdditionalFields
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || totalPayment <= 0}>
            {isLoading ? 'Adding...' : 'Add Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
