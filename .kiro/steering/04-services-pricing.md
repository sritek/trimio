---
# Services & Pricing module patterns - service catalog, gender/variant pricing, combos, branch overrides, add-ons, consumables, and commission structures
inclusion: fileMatch
fileMatchPattern: '**/service/**/*.ts, **/services/**/*.ts, **/pricing/**/*.ts, **/catalog/**/*.ts'
---

# Services & Pricing Module

## Overview

This module handles service catalog management including categories, services, pricing, variations, add-ons, combo services, and commission structures. Services are defined at the tenant level with optional branch-level price overrides.

**Related Requirements:** 4.1 - 4.16

---

## Database Schema

```sql
-- =====================================================
-- SERVICE CATEGORIES
-- =====================================================
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  icon VARCHAR(50),  -- Icon identifier
  color VARCHAR(7) DEFAULT '#6B7280',  -- Hex color

  parent_id UUID REFERENCES service_categories(id),  -- For sub-categories
  level INTEGER DEFAULT 1,  -- 1 = category, 2 = sub-category

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, slug),
  CONSTRAINT valid_level CHECK (level IN (1, 2))
);

CREATE INDEX idx_service_categories ON service_categories(tenant_id, parent_id, is_active);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_categories
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- SERVICES
-- =====================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Identity
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Categorization
  category_id UUID NOT NULL REFERENCES service_categories(id),

  -- Pricing (base price at tenant level)
  base_price DECIMAL(10, 2) NOT NULL,

  -- Tax
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,  -- GST rate
  hsn_sac_code VARCHAR(20),  -- SAC code for services
  is_tax_inclusive BOOLEAN DEFAULT false,

  -- Duration
  duration_minutes INTEGER NOT NULL,
  active_time_minutes INTEGER NOT NULL,  -- Time stylist is actively working
  processing_time_minutes INTEGER DEFAULT 0,  -- Drying/settling time

  -- Gender applicability
  gender_applicable VARCHAR(20) DEFAULT 'all',  -- male, female, all

  -- Skill requirement
  skill_level_required VARCHAR(20) DEFAULT 'any',  -- junior, senior, expert, any

  -- Commission
  commission_type VARCHAR(20) DEFAULT 'percentage',  -- percentage, flat
  commission_value DECIMAL(10, 2) DEFAULT 0,
  assistant_commission_value DECIMAL(10, 2) DEFAULT 0,

  -- Display
  display_order INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  image_url VARCHAR(500),

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_online_bookable BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, sku),
  CONSTRAINT valid_gender CHECK (gender_applicable IN ('male', 'female', 'all')),
  CONSTRAINT valid_skill CHECK (skill_level_required IN ('junior', 'senior', 'expert', 'any')),
  CONSTRAINT valid_commission_type CHECK (commission_type IN ('percentage', 'flat'))
);

CREATE INDEX idx_services_tenant ON services(tenant_id, is_active);
CREATE INDEX idx_services_category ON services(category_id, is_active);
CREATE INDEX idx_services_sku ON services(tenant_id, sku);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON services
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- SERVICE VARIANTS (e.g., Hair Length: Short/Medium/Long)
-- =====================================================
CREATE TABLE service_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,  -- e.g., "Short Hair", "Medium Hair", "Long Hair"

  -- Price adjustment
  price_adjustment_type VARCHAR(20) DEFAULT 'absolute',  -- absolute, percentage
  price_adjustment DECIMAL(10, 2) NOT NULL,  -- +500 or +20%

  -- Duration adjustment
  duration_adjustment INTEGER DEFAULT 0,  -- Additional minutes

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_variants ON service_variants(service_id, is_active);

ALTER TABLE service_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_variants
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- BRANCH PRICE OVERRIDES
-- =====================================================
CREATE TABLE branch_service_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  -- Override price (null means use base price)
  price DECIMAL(10, 2),

  -- Override commission (null means use service default)
  commission_type VARCHAR(20),
  commission_value DECIMAL(10, 2),

  -- Override availability
  is_available BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),

  UNIQUE(branch_id, service_id)
);

CREATE INDEX idx_branch_prices ON branch_service_prices(branch_id, service_id);

ALTER TABLE branch_service_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON branch_service_prices
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- SERVICE ADD-ONS
-- =====================================================
CREATE TABLE service_add_ons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),

  price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,

  duration_minutes INTEGER DEFAULT 0,

  -- Which services can have this add-on
  applicable_to VARCHAR(20) DEFAULT 'all',  -- all, category, specific
  applicable_category_id UUID REFERENCES service_categories(id),

  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_add_ons ON service_add_ons(tenant_id, is_active);

ALTER TABLE service_add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_add_ons
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Mapping table for specific service add-ons
CREATE TABLE service_add_on_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  add_on_id UUID NOT NULL REFERENCES service_add_ons(id) ON DELETE CASCADE,

  -- Override price for this specific service
  override_price DECIMAL(10, 2),

  is_default BOOLEAN DEFAULT false,  -- Pre-selected by default

  UNIQUE(service_id, add_on_id)
);

-- =====================================================
-- SERVICE CONSUMABLES (Inventory items used)
-- =====================================================
CREATE TABLE service_consumables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),

  quantity_used DECIMAL(10, 3) NOT NULL,  -- Amount consumed per service
  unit VARCHAR(20) NOT NULL,  -- ml, g, units

  is_optional BOOLEAN DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_consumables ON service_consumables(service_id);

ALTER TABLE service_consumables ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_consumables
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- COMBO SERVICES (Bundled packages)
-- =====================================================
CREATE TABLE combo_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pricing
  combo_price DECIMAL(10, 2) NOT NULL,  -- Discounted bundle price
  original_price DECIMAL(10, 2) NOT NULL,  -- Sum of individual prices
  discount_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    ROUND((1 - combo_price / NULLIF(original_price, 0)) * 100, 2)
  ) STORED,

  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,

  -- Duration
  total_duration_minutes INTEGER NOT NULL,

  -- Validity
  valid_from DATE,
  valid_until DATE,

  -- Display
  image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_online_bookable BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, sku)
);

CREATE INDEX idx_combo_services ON combo_services(tenant_id, is_active);

ALTER TABLE combo_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON combo_services
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- COMBO SERVICE ITEMS
-- =====================================================
CREATE TABLE combo_service_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  combo_id UUID NOT NULL REFERENCES combo_services(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),

  quantity INTEGER DEFAULT 1,

  -- For display purposes
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_combo_items ON combo_service_items(combo_id);

ALTER TABLE combo_service_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON combo_service_items
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- =====================================================
-- SERVICE PRICE HISTORY (Audit trail)
-- =====================================================
CREATE TABLE service_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  service_id UUID NOT NULL REFERENCES services(id),
  branch_id UUID REFERENCES branches(id),  -- NULL for base price changes

  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2) NOT NULL,

  change_reason VARCHAR(255),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history ON service_price_history(service_id, changed_at DESC);

ALTER TABLE service_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_price_history
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## TypeScript Types

```typescript
// =====================================================
// ENUMS
// =====================================================
export enum GenderApplicable {
  MALE = 'male',
  FEMALE = 'female',
  ALL = 'all',
}

export enum SkillLevel {
  JUNIOR = 'junior',
  SENIOR = 'senior',
  EXPERT = 'expert',
  ANY = 'any',
}

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FLAT = 'flat',
}

export enum PriceAdjustmentType {
  ABSOLUTE = 'absolute',
  PERCENTAGE = 'percentage',
}

export enum AddOnApplicability {
  ALL = 'all',
  CATEGORY = 'category',
  SPECIFIC = 'specific',
}

// =====================================================
// CORE TYPES
// =====================================================
export interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  parentId?: string;
  level: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;

  // Relations
  subCategories?: ServiceCategory[];
  services?: Service[];
  serviceCount?: number;
}

export interface Service {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;

  // Pricing
  basePrice: number;
  taxRate: number;
  hsnSacCode?: string;
  isTaxInclusive: boolean;

  // Duration
  durationMinutes: number;
  activeTimeMinutes: number;
  processingTimeMinutes: number;

  // Applicability
  genderApplicable: GenderApplicable;
  skillLevelRequired: SkillLevel;

  // Commission
  commissionType: CommissionType;
  commissionValue: number;
  assistantCommissionValue: number;

  // Display
  displayOrder: number;
  isPopular: boolean;
  isFeatured: boolean;
  imageUrl?: string;

  // Status
  isActive: boolean;
  isOnlineBookable: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;

  // Relations (populated)
  category?: ServiceCategory;
  variants?: ServiceVariant[];
  addOns?: ServiceAddOn[];
  consumables?: ServiceConsumable[];
}

export interface ServiceVariant {
  id: string;
  tenantId: string;
  serviceId: string;
  name: string;
  priceAdjustmentType: PriceAdjustmentType;
  priceAdjustment: number;
  durationAdjustment: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface BranchServicePrice {
  id: string;
  tenantId: string;
  branchId: string;
  serviceId: string;
  price?: number;
  commissionType?: CommissionType;
  commissionValue?: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export interface ServiceAddOn {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  taxRate: number;
  durationMinutes: number;
  applicableTo: AddOnApplicability;
  applicableCategoryId?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
}

export interface ServiceConsumable {
  id: string;
  tenantId: string;
  serviceId: string;
  productId: string;
  quantityUsed: number;
  unit: string;
  isOptional: boolean;
  createdAt: Date;

  // Populated
  product?: Product;
}

export interface ComboService {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  comboPrice: number;
  originalPrice: number;
  discountPercentage: number;
  taxRate: number;
  totalDurationMinutes: number;
  validFrom?: string;
  validUntil?: string;
  imageUrl?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  isOnlineBookable: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;

  // Relations
  items?: ComboServiceItem[];
}

export interface ComboServiceItem {
  id: string;
  tenantId: string;
  comboId: string;
  serviceId: string;
  quantity: number;
  displayOrder: number;
  createdAt: Date;

  // Populated
  service?: Service;
}

// Computed types for API responses
export interface ServiceWithPrice extends Service {
  effectivePrice: number; // After branch override
  effectiveCommission: {
    type: CommissionType;
    value: number;
  };
  priceWithTax: number;
}

export interface ServiceCatalog {
  categories: ServiceCategory[];
  services: ServiceWithPrice[];
  combos: ComboService[];
  addOns: ServiceAddOn[];
}

export interface CategoryWithServices {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color: string;
  subCategories?: CategoryWithServices[];
  services: ServiceWithPrice[];
}
```

---

## API Endpoints

### Categories

```
GET    /api/v1/service-categories           List categories (with hierarchy)
POST   /api/v1/service-categories           Create category
GET    /api/v1/service-categories/:id       Get category details
PATCH  /api/v1/service-categories/:id       Update category
DELETE /api/v1/service-categories/:id       Delete category (soft)
PATCH  /api/v1/service-categories/reorder   Reorder categories
```

### Services

```
GET    /api/v1/services                     List services (with filters)
POST   /api/v1/services                     Create service
GET    /api/v1/services/:id                 Get service details
PATCH  /api/v1/services/:id                 Update service
DELETE /api/v1/services/:id                 Delete service (soft)
POST   /api/v1/services/:id/duplicate       Duplicate service
GET    /api/v1/services/catalog             Get full catalog for branch
```

### Variants

```
GET    /api/v1/services/:id/variants        List variants
POST   /api/v1/services/:id/variants        Add variant
PATCH  /api/v1/services/:id/variants/:vid   Update variant
DELETE /api/v1/services/:id/variants/:vid   Delete variant
```

### Branch Pricing

```
GET    /api/v1/branches/:id/service-prices          Get branch price overrides
PATCH  /api/v1/branches/:id/service-prices          Bulk update prices
PATCH  /api/v1/branches/:id/services/:sid/price     Update single service price
```

### Add-Ons

```
GET    /api/v1/service-add-ons              List add-ons
POST   /api/v1/service-add-ons              Create add-on
PATCH  /api/v1/service-add-ons/:id          Update add-on
DELETE /api/v1/service-add-ons/:id          Delete add-on
POST   /api/v1/services/:id/add-ons         Map add-ons to service
```

### Combos

```
GET    /api/v1/combo-services               List combos
POST   /api/v1/combo-services               Create combo
GET    /api/v1/combo-services/:id           Get combo details
PATCH  /api/v1/combo-services/:id           Update combo
DELETE /api/v1/combo-services/:id           Delete combo
```

### Consumables

```
GET    /api/v1/services/:id/consumables     Get service consumables
POST   /api/v1/services/:id/consumables     Add consumable mapping
PATCH  /api/v1/services/:id/consumables/:cid Update consumable
DELETE /api/v1/services/:id/consumables/:cid Remove consumable
```

### Price Calculation

```
POST   /api/v1/services/calculate-price     Calculate total price
GET    /api/v1/services/:id/price-history   Get price history
```

---

## Request/Response Schemas

### Create Service

```typescript
// POST /api/v1/services
interface CreateServiceRequest {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;

  basePrice: number;
  taxRate?: number;
  hsnSacCode?: string;
  isTaxInclusive?: boolean;

  durationMinutes: number;
  activeTimeMinutes: number;
  processingTimeMinutes?: number;

  genderApplicable?: GenderApplicable;
  skillLevelRequired?: SkillLevel;

  commissionType?: CommissionType;
  commissionValue?: number;
  assistantCommissionValue?: number;

  isPopular?: boolean;
  isFeatured?: boolean;
  imageUrl?: string;
  isOnlineBookable?: boolean;

  // Initial variants
  variants?: {
    name: string;
    priceAdjustmentType: PriceAdjustmentType;
    priceAdjustment: number;
    durationAdjustment?: number;
  }[];

  // Consumables
  consumables?: {
    productId: string;
    quantityUsed: number;
    unit: string;
    isOptional?: boolean;
  }[];
}

interface CreateServiceResponse {
  success: boolean;
  data: {
    service: Service;
  };
}
```

### Get Service Catalog

```typescript
// GET /api/v1/services/catalog?branchId=xxx
interface GetCatalogRequest {
  branchId: string;
  includeInactive?: boolean;
  categoryId?: string;
  gender?: GenderApplicable;
}

interface GetCatalogResponse {
  success: boolean;
  data: {
    categories: CategoryWithServices[];
    combos: ComboService[];
    addOns: ServiceAddOn[];
  };
}
```

### Update Branch Prices

```typescript
// PATCH /api/v1/branches/:id/service-prices
interface UpdateBranchPricesRequest {
  prices: {
    serviceId: string;
    price?: number; // null to use base price
    commissionType?: CommissionType;
    commissionValue?: number;
    isAvailable?: boolean;
  }[];
}

interface UpdateBranchPricesResponse {
  success: boolean;
  data: {
    updated: number;
    prices: BranchServicePrice[];
  };
}
```

### Create Combo Service

```typescript
// POST /api/v1/combo-services
interface CreateComboRequest {
  sku: string;
  name: string;
  description?: string;
  comboPrice: number;
  taxRate?: number;
  validFrom?: string;
  validUntil?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  isOnlineBookable?: boolean;

  items: {
    serviceId: string;
    quantity?: number;
  }[];
}

interface CreateComboResponse {
  success: boolean;
  data: {
    combo: ComboService;
    originalPrice: number;
    discountPercentage: number;
  };
}
```

### Price Calculation

```typescript
// POST /api/v1/services/calculate-price
interface CalculatePriceRequest {
  branchId: string;
  items: {
    type: 'service' | 'combo';
    id: string;
    variantId?: string;
    addOnIds?: string[];
    quantity?: number;
  }[];
}

interface CalculatePriceResponse {
  success: boolean;
  data: {
    items: {
      type: string;
      id: string;
      name: string;
      basePrice: number;
      variantAdjustment: number;
      addOnsTotal: number;
      quantity: number;
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      total: number;
    }[];
    summary: {
      subtotal: number;
      totalTax: number;
      grandTotal: number;
      totalDuration: number;
    };
  };
}
```

---

## Business Logic

### 1. Price Resolution Engine

```typescript
class PriceResolutionEngine {
  /**
   * Get effective price for a service at a branch
   * Priority: Branch override > Base price
   */
  async getEffectivePrice(
    serviceId: string,
    branchId: string,
    variantId?: string
  ): Promise<{
    price: number;
    priceWithTax: number;
    taxRate: number;
    taxAmount: number;
    source: 'base' | 'branch';
  }> {
    const service = await this.getService(serviceId);

    // Check for branch override
    const branchPrice = await this.db.branchServicePrices.findFirst({
      where: { branchId, serviceId },
    });

    let basePrice = branchPrice?.price ?? service.basePrice;
    let source: 'base' | 'branch' = branchPrice?.price ? 'branch' : 'base';

    // Apply variant adjustment
    if (variantId) {
      const variant = await this.getVariant(variantId);
      if (variant.priceAdjustmentType === PriceAdjustmentType.ABSOLUTE) {
        basePrice += variant.priceAdjustment;
      } else {
        basePrice += basePrice * (variant.priceAdjustment / 100);
      }
    }

    // Calculate tax
    const taxRate = service.taxRate;
    let price: number;
    let taxAmount: number;

    if (service.isTaxInclusive) {
      // Price includes tax, extract it
      price = basePrice / (1 + taxRate / 100);
      taxAmount = basePrice - price;
    } else {
      // Price excludes tax, add it
      price = basePrice;
      taxAmount = price * (taxRate / 100);
    }

    return {
      price: Math.round(price * 100) / 100,
      priceWithTax: Math.round((price + taxAmount) * 100) / 100,
      taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      source,
    };
  }

  /**
   * Get effective commission for a service at a branch
   */
  async getEffectiveCommission(
    serviceId: string,
    branchId: string
  ): Promise<{
    type: CommissionType;
    value: number;
    assistantValue: number;
    source: 'base' | 'branch';
  }> {
    const service = await this.getService(serviceId);

    const branchPrice = await this.db.branchServicePrices.findFirst({
      where: { branchId, serviceId },
    });

    if (branchPrice?.commissionType && branchPrice?.commissionValue !== null) {
      return {
        type: branchPrice.commissionType,
        value: branchPrice.commissionValue,
        assistantValue: service.assistantCommissionValue,
        source: 'branch',
      };
    }

    return {
      type: service.commissionType,
      value: service.commissionValue,
      assistantValue: service.assistantCommissionValue,
      source: 'base',
    };
  }

  /**
   * Calculate commission amount for a service
   */
  calculateCommissionAmount(
    servicePrice: number,
    commissionType: CommissionType,
    commissionValue: number
  ): number {
    if (commissionType === CommissionType.PERCENTAGE) {
      return Math.round(servicePrice * (commissionValue / 100) * 100) / 100;
    }
    return commissionValue;
  }
}
```

### 2. Service Catalog Builder

```typescript
class ServiceCatalogBuilder {
  /**
   * Build complete catalog for a branch
   */
  async buildCatalog(
    branchId: string,
    options: {
      includeInactive?: boolean;
      categoryId?: string;
      gender?: GenderApplicable;
    } = {}
  ): Promise<ServiceCatalog> {
    // Get all categories
    const categories = await this.getCategories(options.categoryId);

    // Get all services with branch prices
    const services = await this.getServicesWithPrices(branchId, options);

    // Get combos
    const combos = await this.getCombos(branchId, options);

    // Get add-ons
    const addOns = await this.getAddOns();

    // Build hierarchical structure
    const categoryTree = this.buildCategoryTree(categories, services);

    return {
      categories: categoryTree,
      services,
      combos,
      addOns,
    };
  }

  /**
   * Get services with effective prices for a branch
   */
  private async getServicesWithPrices(
    branchId: string,
    options: { includeInactive?: boolean; gender?: GenderApplicable }
  ): Promise<ServiceWithPrice[]> {
    const whereClause: any = {};

    if (!options.includeInactive) {
      whereClause.isActive = true;
    }

    if (options.gender && options.gender !== GenderApplicable.ALL) {
      whereClause.genderApplicable = {
        in: [options.gender, GenderApplicable.ALL],
      };
    }

    const services = await this.db.services.findMany({
      where: whereClause,
      include: {
        category: true,
        variants: { where: { isActive: true } },
        addOns: true,
      },
    });

    // Get branch price overrides
    const branchPrices = await this.db.branchServicePrices.findMany({
      where: { branchId },
    });

    const priceMap = new Map(branchPrices.map((p) => [p.serviceId, p]));

    return services
      .map((service) => {
        const branchPrice = priceMap.get(service.id);

        // Check if service is available at this branch
        if (branchPrice?.isAvailable === false) {
          return null;
        }

        const effectivePrice = branchPrice?.price ?? service.basePrice;
        const taxAmount = effectivePrice * (service.taxRate / 100);

        return {
          ...service,
          effectivePrice,
          effectiveCommission: {
            type: branchPrice?.commissionType ?? service.commissionType,
            value: branchPrice?.commissionValue ?? service.commissionValue,
          },
          priceWithTax: effectivePrice + taxAmount,
        };
      })
      .filter(Boolean) as ServiceWithPrice[];
  }

  /**
   * Build category tree with nested services
   */
  private buildCategoryTree(
    categories: ServiceCategory[],
    services: ServiceWithPrice[]
  ): CategoryWithServices[] {
    const servicesByCategory = new Map<string, ServiceWithPrice[]>();

    for (const service of services) {
      const existing = servicesByCategory.get(service.categoryId) || [];
      existing.push(service);
      servicesByCategory.set(service.categoryId, existing);
    }

    // Get root categories (level 1)
    const rootCategories = categories.filter((c) => c.level === 1);

    return rootCategories.map((category) => {
      const subCategories = categories
        .filter((c) => c.parentId === category.id)
        .map((sub) => ({
          ...sub,
          services: servicesByCategory.get(sub.id) || [],
        }));

      return {
        ...category,
        subCategories,
        services: servicesByCategory.get(category.id) || [],
      };
    });
  }
}
```

### 3. Combo Service Manager

```typescript
class ComboServiceManager {
  /**
   * Create a combo service
   */
  async createCombo(request: CreateComboRequest): Promise<ComboService> {
    // Validate all services exist
    const services = await this.db.services.findMany({
      where: { id: { in: request.items.map((i) => i.serviceId) } },
    });

    if (services.length !== request.items.length) {
      throw new BadRequestError('INVALID_SERVICE', 'One or more services not found');
    }

    // Calculate original price and total duration
    let originalPrice = 0;
    let totalDuration = 0;

    for (const item of request.items) {
      const service = services.find((s) => s.id === item.serviceId)!;
      const quantity = item.quantity || 1;
      originalPrice += service.basePrice * quantity;
      totalDuration += service.durationMinutes * quantity;
    }

    // Validate combo price is less than original
    if (request.comboPrice >= originalPrice) {
      throw new BadRequestError(
        'INVALID_COMBO_PRICE',
        'Combo price must be less than sum of individual prices'
      );
    }

    // Create combo in transaction
    const combo = await this.db.transaction(async (tx) => {
      const combo = await tx.comboServices.create({
        tenantId: this.tenantId,
        sku: request.sku,
        name: request.name,
        description: request.description,
        comboPrice: request.comboPrice,
        originalPrice,
        taxRate: request.taxRate ?? 18,
        totalDurationMinutes: totalDuration,
        validFrom: request.validFrom,
        validUntil: request.validUntil,
        imageUrl: request.imageUrl,
        isFeatured: request.isFeatured ?? false,
        isOnlineBookable: request.isOnlineBookable ?? true,
      });

      // Create combo items
      for (let i = 0; i < request.items.length; i++) {
        const item = request.items[i];
        await tx.comboServiceItems.create({
          tenantId: this.tenantId,
          comboId: combo.id,
          serviceId: item.serviceId,
          quantity: item.quantity || 1,
          displayOrder: i,
        });
      }

      return combo;
    });

    return this.getComboWithItems(combo.id);
  }

  /**
   * Check if combo is valid (within validity period)
   */
  isComboValid(combo: ComboService): boolean {
    const today = new Date().toISOString().split('T')[0];

    if (combo.validFrom && combo.validFrom > today) {
      return false;
    }

    if (combo.validUntil && combo.validUntil < today) {
      return false;
    }

    return combo.isActive;
  }

  /**
   * Expand combo into individual services for billing
   */
  async expandCombo(
    comboId: string,
    branchId: string
  ): Promise<{
    services: ServiceWithPrice[];
    comboDiscount: number;
  }> {
    const combo = await this.getComboWithItems(comboId);

    if (!this.isComboValid(combo)) {
      throw new BadRequestError('COMBO_NOT_VALID', 'Combo is not currently valid');
    }

    const services: ServiceWithPrice[] = [];

    for (const item of combo.items!) {
      const serviceWithPrice = await this.priceEngine.getServiceWithPrice(item.serviceId, branchId);

      for (let i = 0; i < item.quantity; i++) {
        services.push(serviceWithPrice);
      }
    }

    const comboDiscount = combo.originalPrice - combo.comboPrice;

    return { services, comboDiscount };
  }
}
```

### 4. Price Change Tracker

```typescript
class PriceChangeTracker {
  /**
   * Update service price with audit trail
   */
  async updateServicePrice(
    serviceId: string,
    newPrice: number,
    reason: string,
    userId: string,
    branchId?: string
  ): Promise<void> {
    const service = await this.getService(serviceId);
    let oldPrice: number;

    if (branchId) {
      // Branch-level price change
      const branchPrice = await this.db.branchServicePrices.findFirst({
        where: { branchId, serviceId },
      });
      oldPrice = branchPrice?.price ?? service.basePrice;

      await this.db.branchServicePrices.upsert({
        where: { branchId_serviceId: { branchId, serviceId } },
        create: {
          tenantId: this.tenantId,
          branchId,
          serviceId,
          price: newPrice,
          updatedBy: userId,
        },
        update: {
          price: newPrice,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });
    } else {
      // Base price change
      oldPrice = service.basePrice;

      await this.db.services.update(serviceId, {
        basePrice: newPrice,
        updatedAt: new Date(),
      });
    }

    // Create price history record
    await this.db.servicePriceHistory.create({
      tenantId: this.tenantId,
      serviceId,
      branchId,
      oldPrice,
      newPrice,
      changeReason: reason,
      changedBy: userId,
    });

    // Create audit log
    await this.auditService.log({
      action: 'PRICE_CHANGE',
      entityType: 'service',
      entityId: serviceId,
      branchId,
      oldValue: { price: oldPrice },
      newValue: { price: newPrice },
      reason,
      userId,
    });
  }

  /**
   * Get price history for a service
   */
  async getPriceHistory(serviceId: string, branchId?: string): Promise<ServicePriceHistory[]> {
    return this.db.servicePriceHistory.findMany({
      where: {
        serviceId,
        branchId: branchId ?? null,
      },
      orderBy: { changedAt: 'desc' },
      include: {
        changedByUser: { select: { id: true, name: true } },
      },
    });
  }
}
```

---

## Validation Schemas

```typescript
import { z } from 'zod';

// =====================================================
// SERVICE CATEGORY
// =====================================================
export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#6B7280'),
  parentId: z.string().uuid().optional(),
  displayOrder: z.number().int().min(0).default(0),
});

// =====================================================
// SERVICE
// =====================================================
export const createServiceSchema = z
  .object({
    sku: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[A-Z0-9-]+$/),
    name: z.string().min(2).max(255),
    description: z.string().max(2000).optional(),
    categoryId: z.string().uuid(),

    basePrice: z.number().min(0).max(1000000),
    taxRate: z.number().min(0).max(100).default(18),
    hsnSacCode: z.string().max(20).optional(),
    isTaxInclusive: z.boolean().default(false),

    durationMinutes: z.number().int().min(5).max(480),
    activeTimeMinutes: z.number().int().min(5).max(480),
    processingTimeMinutes: z.number().int().min(0).max(240).default(0),

    genderApplicable: z.enum(['male', 'female', 'all']).default('all'),
    skillLevelRequired: z.enum(['junior', 'senior', 'expert', 'any']).default('any'),

    commissionType: z.enum(['percentage', 'flat']).default('percentage'),
    commissionValue: z.number().min(0).max(100).default(0),
    assistantCommissionValue: z.number().min(0).max(100).default(0),

    isPopular: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    imageUrl: z.string().url().optional(),
    isOnlineBookable: z.boolean().default(true),

    variants: z
      .array(
        z.object({
          name: z.string().min(2).max(100),
          priceAdjustmentType: z.enum(['absolute', 'percentage']),
          priceAdjustment: z.number(),
          durationAdjustment: z.number().int().default(0),
        })
      )
      .optional(),

    consumables: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantityUsed: z.number().min(0),
          unit: z.string().max(20),
          isOptional: z.boolean().default(false),
        })
      )
      .optional(),
  })
  .refine((data) => data.activeTimeMinutes <= data.durationMinutes, {
    message: 'Active time cannot exceed total duration',
  });

// =====================================================
// SERVICE VARIANT
// =====================================================
export const createVariantSchema = z.object({
  name: z.string().min(2).max(100),
  priceAdjustmentType: z.enum(['absolute', 'percentage']),
  priceAdjustment: z.number(),
  durationAdjustment: z.number().int().default(0),
  displayOrder: z.number().int().min(0).default(0),
});

// =====================================================
// BRANCH PRICE OVERRIDE
// =====================================================
export const updateBranchPriceSchema = z.object({
  price: z.number().min(0).max(1000000).nullable(),
  commissionType: z.enum(['percentage', 'flat']).nullable(),
  commissionValue: z.number().min(0).max(100).nullable(),
  isAvailable: z.boolean().default(true),
});

// =====================================================
// COMBO SERVICE
// =====================================================
export const createComboSchema = z.object({
  sku: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9-]+$/),
  name: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  comboPrice: z.number().min(0).max(1000000),
  taxRate: z.number().min(0).max(100).default(18),
  validFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  imageUrl: z.string().url().optional(),
  isFeatured: z.boolean().default(false),
  isOnlineBookable: z.boolean().default(true),

  items: z
    .array(
      z.object({
        serviceId: z.string().uuid(),
        quantity: z.number().int().min(1).default(1),
      })
    )
    .min(2), // Combo must have at least 2 services
});

// =====================================================
// SERVICE ADD-ON
// =====================================================
export const createAddOnSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  price: z.number().min(0).max(100000),
  taxRate: z.number().min(0).max(100).default(18),
  durationMinutes: z.number().int().min(0).max(120).default(0),
  applicableTo: z.enum(['all', 'category', 'specific']).default('all'),
  applicableCategoryId: z.string().uuid().optional(),
  displayOrder: z.number().int().min(0).default(0),
});
```

---

## Integration Points

### Inbound Dependencies (This module uses)

| Module            | Integration  | Purpose                 |
| ----------------- | ------------ | ----------------------- |
| Tenant Management | Branch list  | Branch-specific pricing |
| Inventory         | Product list | Consumable mapping      |

### Outbound Dependencies (Other modules use this)

| Module           | Integration        | Purpose                      |
| ---------------- | ------------------ | ---------------------------- |
| Appointments     | Service catalog    | Select services for booking  |
| Billing          | Price calculation  | Generate invoices            |
| Staff Management | Commission rates   | Calculate staff commissions  |
| Inventory        | Consumable mapping | Auto-deduct inventory        |
| Online Booking   | Service catalog    | Display services for booking |
| Reports          | Service analytics  | Revenue by service reports   |

### Event Emissions

```typescript
// Events emitted by this module
const SERVICE_EVENTS = {
  SERVICE_CREATED: 'service.created',
  SERVICE_UPDATED: 'service.updated',
  SERVICE_DELETED: 'service.deleted',
  SERVICE_PRICE_CHANGED: 'service.price_changed',

  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',

  COMBO_CREATED: 'combo.created',
  COMBO_UPDATED: 'combo.updated',
  COMBO_EXPIRED: 'combo.expired',
};

// Event payload examples
interface ServicePriceChangedEvent {
  serviceId: string;
  tenantId: string;
  branchId?: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  reason: string;
}
```

---

## Error Handling

```typescript
// Service-specific error codes
export const SERVICE_ERRORS = {
  // Service errors
  SERVICE_NOT_FOUND: {
    code: 'SVC_001',
    message: 'Service not found',
    httpStatus: 404,
  },
  SKU_ALREADY_EXISTS: {
    code: 'SVC_002',
    message: 'Service SKU already exists',
    httpStatus: 409,
  },
  SERVICE_HAS_APPOINTMENTS: {
    code: 'SVC_003',
    message: 'Cannot delete service with existing appointments',
    httpStatus: 400,
  },

  // Category errors
  CATEGORY_NOT_FOUND: {
    code: 'SVC_010',
    message: 'Category not found',
    httpStatus: 404,
  },
  CATEGORY_HAS_SERVICES: {
    code: 'SVC_011',
    message: 'Cannot delete category with services',
    httpStatus: 400,
  },
  CATEGORY_HAS_SUBCATEGORIES: {
    code: 'SVC_012',
    message: 'Cannot delete category with sub-categories',
    httpStatus: 400,
  },

  // Combo errors
  COMBO_NOT_FOUND: {
    code: 'SVC_020',
    message: 'Combo service not found',
    httpStatus: 404,
  },
  COMBO_NOT_VALID: {
    code: 'SVC_021',
    message: 'Combo is not currently valid',
    httpStatus: 400,
  },
  INVALID_COMBO_PRICE: {
    code: 'SVC_022',
    message: 'Combo price must be less than sum of individual prices',
    httpStatus: 400,
  },
  COMBO_MIN_SERVICES: {
    code: 'SVC_023',
    message: 'Combo must have at least 2 services',
    httpStatus: 400,
  },

  // Variant errors
  VARIANT_NOT_FOUND: {
    code: 'SVC_030',
    message: 'Service variant not found',
    httpStatus: 404,
  },

  // Add-on errors
  ADDON_NOT_FOUND: {
    code: 'SVC_040',
    message: 'Add-on not found',
    httpStatus: 404,
  },
  ADDON_NOT_APPLICABLE: {
    code: 'SVC_041',
    message: 'Add-on is not applicable to this service',
    httpStatus: 400,
  },

  // Price errors
  INVALID_PRICE: {
    code: 'SVC_050',
    message: 'Invalid price value',
    httpStatus: 400,
  },
  INVALID_COMMISSION: {
    code: 'SVC_051',
    message: 'Invalid commission value',
    httpStatus: 400,
  },
};
```

---

## Testing Considerations

### Unit Tests

```typescript
describe('PriceResolutionEngine', () => {
  describe('getEffectivePrice', () => {
    it('should return base price when no branch override');
    it('should return branch price when override exists');
    it('should apply absolute variant adjustment');
    it('should apply percentage variant adjustment');
    it('should calculate tax correctly for tax-inclusive prices');
    it('should calculate tax correctly for tax-exclusive prices');
  });

  describe('getEffectiveCommission', () => {
    it('should return base commission when no branch override');
    it('should return branch commission when override exists');
    it('should calculate percentage commission correctly');
    it('should return flat commission correctly');
  });
});

describe('ServiceCatalogBuilder', () => {
  describe('buildCatalog', () => {
    it('should build hierarchical category tree');
    it('should include services with effective prices');
    it('should filter by gender applicability');
    it('should exclude inactive services when requested');
    it('should exclude services not available at branch');
  });
});

describe('ComboServiceManager', () => {
  describe('createCombo', () => {
    it('should calculate original price from services');
    it('should calculate total duration');
    it('should reject if combo price >= original price');
    it('should reject if less than 2 services');
  });

  describe('isComboValid', () => {
    it('should return true for active combo within validity');
    it('should return false for inactive combo');
    it('should return false before valid_from date');
    it('should return false after valid_until date');
  });

  describe('expandCombo', () => {
    it('should return individual services with prices');
    it('should calculate combo discount');
    it('should handle quantity > 1');
  });
});

describe('PriceChangeTracker', () => {
  describe('updateServicePrice', () => {
    it('should update base price');
    it('should update branch price');
    it('should create price history record');
    it('should create audit log');
  });
});
```

### Integration Tests

```typescript
describe('Service Pricing Integration', () => {
  it('should apply correct price in appointment booking');
  it('should apply correct price in invoice generation');
  it('should calculate commission correctly for billing');
  it('should deduct consumables from inventory');
});
```

---

## Performance Considerations

1. **Catalog Caching**: Cache service catalog per branch, invalidate on price/service changes
2. **Price Lookups**: Index on (branch_id, service_id) for O(1) price resolution
3. **Category Tree**: Build and cache category hierarchy, invalidate on category changes
4. **Combo Validation**: Cache combo validity status, refresh daily
5. **Bulk Price Updates**: Use batch operations for branch-wide price changes

---

## Security Considerations

1. **Price Changes**: Require Branch_Manager or higher role for price modifications
2. **Audit Trail**: Log all price changes with old/new values and reason
3. **Commission Visibility**: Hide commission details from Receptionist role
4. **SKU Uniqueness**: Enforce unique SKUs at tenant level to prevent confusion
5. **Soft Deletes**: Never hard delete services with historical transactions
