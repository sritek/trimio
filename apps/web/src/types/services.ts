/**
 * Services Module Types
 */

// ============================================
// Category Types
// ============================================

export interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  parentId?: string;
  level: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  parent?: ServiceCategory;
  subCategories?: ServiceCategory[];
  _count?: {
    services: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface ReorderCategoriesInput {
  categories: Array<{
    id: string;
    displayOrder: number;
  }>;
}

// ============================================
// Service Types
// ============================================

export interface Service {
  id: string;
  tenantId: string;
  categoryId: string;
  sku: string;
  name: string;
  description?: string;
  basePrice: number;
  taxRate: number;
  isTaxInclusive: boolean;
  durationMinutes: number;
  activeTimeMinutes: number;
  processingTimeMinutes: number;
  genderApplicable: 'all' | 'male' | 'female';
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  displayOrder: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  category?: ServiceCategory;
  variants?: ServiceVariant[];
  branchPrices?: BranchServicePrice[];
  _count?: {
    variants: number;
  };
}

export interface CreateServiceInput {
  categoryId: string;
  sku?: string; // Auto-generated if not provided
  name: string;
  description?: string;
  basePrice: number;
  taxRate?: number;
  isTaxInclusive?: boolean;
  durationMinutes: number;
  activeTimeMinutes: number;
  processingTimeMinutes?: number;
  genderApplicable?: 'all' | 'male' | 'female';
  commissionType?: 'percentage' | 'fixed';
  commissionValue?: number;
  displayOrder?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export type UpdateServiceInput = Partial<CreateServiceInput>;

export interface ServiceFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  isActive?: boolean;
  genderApplicable?: 'all' | 'male' | 'female';
  sortBy?: 'name' | 'basePrice' | 'displayOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Variant Types
// ============================================

export interface ServiceVariant {
  id: string;
  tenantId: string;
  serviceId: string;
  name: string;
  priceAdjustmentType: 'absolute' | 'percentage';
  priceAdjustment: number;
  durationAdjustment: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateVariantInput {
  name: string;
  priceAdjustmentType?: 'absolute' | 'percentage';
  priceAdjustment: number;
  durationAdjustment?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateVariantInput = Partial<CreateVariantInput>;

// ============================================
// Branch Pricing Types
// ============================================

export interface BranchServicePrice {
  id: string;
  tenantId: string;
  branchId: string;
  serviceId: string;
  price?: number;
  commissionType?: 'percentage' | 'fixed';
  commissionValue?: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface BranchServicePriceView {
  service: {
    id: string;
    sku: string;
    name: string;
    basePrice: number;
    categoryId: string;
  };
  branchPrice: BranchServicePrice | null;
  effectivePrice: number;
  isAvailable: boolean;
}

export interface UpdateBranchPriceInput {
  price?: number | null;
  commissionType?: 'percentage' | 'fixed' | null;
  commissionValue?: number | null;
  isAvailable?: boolean;
}

export interface BulkUpdateBranchPricesInput {
  prices: Array<{
    serviceId: string;
    price?: number | null;
    commissionType?: 'percentage' | 'fixed' | null;
    commissionValue?: number | null;
    isAvailable?: boolean;
  }>;
}

// ============================================
// Add-on Types
// ============================================

export interface ServiceAddOn {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  taxRate: number;
  durationMinutes: number;
  applicableTo: 'all' | 'category' | 'service';
  applicableCategoryId?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  applicableCategory?: ServiceCategory;
  _count?: {
    serviceMappings: number;
  };
}

export interface CreateAddOnInput {
  name: string;
  description?: string;
  price: number;
  taxRate?: number;
  durationMinutes?: number;
  applicableTo?: 'all' | 'category' | 'service';
  applicableCategoryId?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export type UpdateAddOnInput = Partial<CreateAddOnInput>;

export interface MapAddOnsToServiceInput {
  addOns: Array<{
    addOnId: string;
    overridePrice?: number | null;
    isDefault?: boolean;
  }>;
}

// ============================================
// Combo Service Types
// ============================================

export interface ComboService {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  comboPrice: number;
  originalPrice: number;
  taxRate: number;
  totalDurationMinutes: number;
  validFrom?: string;
  validUntil?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  items: ComboServiceItem[];
}

export interface ComboServiceItem {
  id: string;
  tenantId: string;
  comboId: string;
  serviceId: string;
  quantity: number;
  displayOrder: number;
  createdAt: string;
  service: {
    id: string;
    sku: string;
    name: string;
    basePrice: number;
    durationMinutes: number;
  };
}

export interface CreateComboInput {
  sku: string;
  name: string;
  description?: string;
  comboPrice: number;
  taxRate?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  items: Array<{
    serviceId: string;
    quantity?: number;
    displayOrder?: number;
  }>;
}

export interface UpdateComboInput extends Partial<Omit<CreateComboInput, 'items'>> {
  items?: Array<{
    serviceId: string;
    quantity?: number;
    displayOrder?: number;
  }>;
}

// ============================================
// Price Calculation Types
// ============================================

export interface CalculatePriceInput {
  branchId: string;
  services: Array<{
    serviceId: string;
    variantId?: string;
    quantity?: number;
    addOnIds?: string[];
  }>;
  comboIds?: string[];
}

export interface PriceCalculationResult {
  services: ServicePriceBreakdown[];
  combos: ComboPriceBreakdown[];
  servicesSubtotal: number;
  combosSubtotal: number;
  subtotal: number;
  taxBreakdown: TaxBreakdown[];
  totalTax: number;
  grandTotal: number;
}

export interface ServicePriceBreakdown {
  serviceId: string;
  serviceName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  basePrice: number;
  variantAdjustment: number;
  branchAdjustment: number;
  effectiveUnitPrice: number;
  subtotal: number;
  addOns: Array<{
    addOnId: string;
    addOnName: string;
    price: number;
  }>;
  addOnsTotal: number;
  total: number;
}

export interface ComboPriceBreakdown {
  comboId: string;
  comboName: string;
  originalPrice: number;
  comboPrice: number;
  savings: number;
  services: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
  }>;
}

export interface TaxBreakdown {
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

// ============================================
// Catalog Types
// ============================================

export interface ServiceCatalog {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color: string;
  displayOrder: number;
  services: ServiceCatalogItem[];
  subCategories?: ServiceCatalog[];
}

export interface ServiceCatalogItem extends Service {
  effectivePrice?: number;
  isAvailable?: boolean;
}
