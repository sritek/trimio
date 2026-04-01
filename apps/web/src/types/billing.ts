/**
 * Billing Types
 * TypeScript types for invoice management and billing operations
 */

// ============================================
// Enums
// ============================================

export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'upi'
  | 'wallet'
  | 'loyalty'
  | 'bank_transfer'
  | 'cheque';
export type ItemType = 'service' | 'product' | 'combo' | 'package';
export type DiscountType =
  | 'auto_promo'
  | 'manual'
  | 'coupon'
  | 'membership'
  | 'loyalty'
  | 'referral';

// ============================================
// Invoice Types
// ============================================

export interface InvoiceItem {
  id: string;
  tenantId: string;
  invoiceId: string;
  itemType: ItemType;
  referenceId: string;
  referenceSku?: string;
  name: string;
  description?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  grossAmount: number;
  discountType?: string;
  discountValue: number;
  discountAmount: number;
  discountReason?: string;
  hsnSacCode?: string;
  taxRate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  netAmount: number;
  stylistId?: string;
  stylistName?: string;
  assistantId?: string;
  commissionType?: string;
  commissionRate?: number;
  commissionAmount?: number;
  assistantCommissionAmount?: number;
  isPackageRedemption: boolean;
  packageRedemptionId?: string;
  displayOrder: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  branchId: string;
  invoiceId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  cardLastFour?: string;
  cardType?: string;
  upiId?: string;
  transactionId?: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  status: string;
  isRefund: boolean;
  originalPaymentId?: string;
  refundReason?: string;
  paymentDate: string;
  paymentTime: string;
  createdAt: string;
  createdBy?: string;
}

export interface InvoiceDiscount {
  id: string;
  tenantId: string;
  invoiceId: string;
  discountType: DiscountType;
  discountSource?: string;
  discountName: string;
  calculationType: string;
  calculationValue: number;
  appliedTo: string;
  appliedItemId?: string;
  discountAmount: number;
  requiresApproval: boolean;
  approvedBy?: string;
  approvalNotes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  branchId: string;
  invoiceNumber?: string;
  invoiceDate: string;
  invoiceTime: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  appointmentId?: string;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  amountDue: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscount: number;
  walletAmountUsed: number;
  packageRedemptionIds: string[];
  membershipDiscountApplied: boolean;
  membershipId?: string;
  gstin?: string;
  placeOfSupply?: string;
  isIgst: boolean;
  status: InvoiceStatus;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  discounts?: InvoiceDiscount[];
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    loyaltyPoints: number;
    walletBalance: number;
  } | null;
}

// ============================================
// Input Types
// ============================================

export interface InvoiceItemInput {
  itemType: ItemType;
  referenceId: string;
  variantId?: string;
  quantity?: number;
  stylistId?: string;
  assistantId?: string;
  isPackageRedemption?: boolean;
  packageRedemptionId?: string;
}

export interface DiscountInput {
  discountType: DiscountType;
  discountSource?: string;
  calculationType: 'percentage' | 'flat';
  calculationValue: number;
  appliedTo: 'subtotal' | 'item';
  appliedItemIndex?: number;
  reason?: string;
}

export interface PaymentInput {
  paymentMethod: PaymentMethod;
  amount: number;
  cardLastFour?: string;
  cardType?: 'visa' | 'mastercard' | 'rupay' | 'amex';
  upiId?: string;
  transactionId?: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
}

export interface CreateInvoiceInput {
  branchId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  appointmentId?: string;
  items: InvoiceItemInput[];
  discounts?: DiscountInput[];
  redeemLoyaltyPoints?: number;
  useWalletAmount?: number;
  gstin?: string;
  placeOfSupply?: string;
  notes?: string;
}

export interface QuickBillInput extends CreateInvoiceInput {
  payments: PaymentInput[];
  completedAt?: string; // ISO datetime for appointment completion
}

// ============================================
// Query Types
// ============================================

export interface ListInvoicesQuery {
  branchId?: string;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'invoiceDate' | 'grandTotal' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
