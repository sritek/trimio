/**
 * Customer Module Types
 */

// ============================================
// Customer Types
// ============================================

export interface Customer {
  id: string;
  tenantId: string;
  phone: string;
  name: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  dateOfBirth?: string | null;
  anniversaryDate?: string | null;
  address?: string | null;
  notes?: string | null;
  preferences: CustomerPreferences;
  allergies: string[];
  tags: string[];
  loyaltyPoints: number;
  walletBalance: number;
  noShowCount: number;
  bookingStatus: BookingStatus;
  firstVisitBranchId?: string | null;
  marketingConsent: boolean;
  source: CustomerSource;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  // Extended fields from API
  hasAllergyWarning?: boolean;
  customerNotes?: CustomerNote[];
  // Stats fields (may be populated by API)
  visitCount?: number;
  totalSpend?: number;
  lastVisitDate?: string | null;
  preferredStylist?: string | null;
}

export interface CustomerPreferences {
  preferredStylist?: string;
  preferredServices?: string[];
  preferredTimeSlots?: string[];
  preferredLanguage?: 'en' | 'hi';
  [key: string]: unknown;
}

export type BookingStatus = 'normal' | 'prepaid_only' | 'blocked';

export type CustomerSource = 'manual' | 'walk_in' | 'online_booking' | 'phone' | 'import';

export const CUSTOMER_SOURCE_LABELS: Record<CustomerSource, string> = {
  manual: 'Manual Entry',
  walk_in: 'Walk-in',
  online_booking: 'Online Booking',
  phone: 'Phone Booking',
  import: 'Imported',
};

export interface CreateCustomerInput {
  phone: string;
  name: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  dateOfBirth?: string | null;
  anniversaryDate?: string | null;
  address?: string | null;
  preferences?: CustomerPreferences;
  allergies?: string[];
  marketingConsent?: boolean;
  referredBy?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  dateOfBirth?: string | null;
  anniversaryDate?: string | null;
  address?: string | null;
  preferences?: CustomerPreferences;
  allergies?: string[];
  marketingConsent?: boolean;
}

export interface UpdateCustomerPhoneInput {
  phone: string;
  reason: string;
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string;
  gender?: 'male' | 'female' | 'other';
  bookingStatus?: BookingStatus;
  branchId?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'loyaltyPoints' | 'walletBalance';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerSearchFilters {
  q: string;
  limit?: number;
}

// ============================================
// Customer Note Types
// ============================================

export interface CustomerNote {
  id: string;
  tenantId: string;
  customerId: string;
  content: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface CreateNoteInput {
  content: string;
}

export interface NotesFilters {
  page?: number;
  limit?: number;
}

// ============================================
// Custom Tag Types
// ============================================

export interface CustomTag {
  id: string;
  tenantId: string;
  name: string;
  color?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
}

export interface AddTagsInput {
  tags: string[];
}

// System tags that are auto-managed
export const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'] as const;
export type SystemTag = (typeof SYSTEM_TAGS)[number];

// ============================================
// Loyalty Types
// ============================================

export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'adjusted' | 'expired';

export interface LoyaltyTransaction {
  id: string;
  tenantId: string;
  customerId: string;
  type: LoyaltyTransactionType;
  points: number;
  balance: number;
  reference?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface LoyaltyConfig {
  id: string;
  tenantId: string;
  pointsPerUnit: number;
  redemptionValuePerPoint: number;
  expiryDays?: number | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLoyaltyConfigInput {
  pointsPerUnit?: number;
  redemptionValuePerPoint?: number;
  expiryDays?: number | null;
  isEnabled?: boolean;
}

export interface AdjustLoyaltyInput {
  type: 'credit' | 'debit';
  points: number;
  reason: string;
}

export interface LoyaltyFilters {
  page?: number;
  limit?: number;
}

export interface LoyaltyBalanceResponse {
  balance: number;
  transactions: {
    data: LoyaltyTransaction[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface AdjustLoyaltyResponse {
  newBalance: number;
  transaction: LoyaltyTransaction;
}

// ============================================
// Wallet Types
// ============================================

export type WalletTransactionType = 'credit' | 'debit' | 'adjustment' | 'refund';

export interface WalletTransaction {
  id: string;
  tenantId: string;
  customerId: string;
  type: WalletTransactionType;
  amount: number;
  balance: number;
  reference?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface AdjustWalletInput {
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
}

export interface WalletFilters {
  page?: number;
  limit?: number;
}

export interface WalletBalanceResponse {
  balance: number;
  transactions: {
    data: WalletTransaction[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface AdjustWalletResponse {
  newBalance: number;
  transaction: WalletTransaction;
}

// ============================================
// Customer Stats Types
// ============================================

export interface CustomerStats {
  totalSpend: number;
  visitCount: number;
  avgTicketSize: number;
  firstVisitDate?: string | null;
  lastVisitDate?: string | null;
  firstVisitBranchId?: string | null;
  mostVisitedBranchId?: string | null;
  loyaltyPoints: number;
  walletBalance: number;
  noShowCount: number;
}
