-- Migration: Add Branch-Level Subscriptions
-- This migration implements per-branch subscription management with billing flow tracking

-- ============================================
-- Enums
-- ============================================

CREATE TYPE "SubscriptionPlanTier" AS ENUM ('basic', 'professional', 'enterprise');
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'annual');
CREATE TYPE "BranchSubscriptionStatus" AS ENUM ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired');
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('draft', 'pending', 'paid', 'failed', 'refunded', 'cancelled');
CREATE TYPE "PaymentGateway" AS ENUM ('razorpay', 'stripe', 'manual');

-- ============================================
-- Subscription Plans
-- ============================================

CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "tier" "SubscriptionPlanTier" NOT NULL,
    "description" TEXT,
    
    -- Pricing
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "annual_price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Feature limits
    "max_users" INTEGER NOT NULL,
    "max_appointments_per_day" INTEGER NOT NULL,
    "max_services" INTEGER NOT NULL,
    "max_products" INTEGER NOT NULL,
    
    -- Feature flags
    "features" JSONB NOT NULL DEFAULT '{}',
    
    -- Trial settings
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    
    -- Grace period settings
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    
    -- Display
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");
CREATE INDEX "subscription_plans_is_active_is_public_idx" ON "subscription_plans"("is_active", "is_public");

-- ============================================
-- Branch Subscriptions
-- ============================================

CREATE TABLE "branch_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    
    -- Billing cycle
    "billing_cycle" "BillingCycle" NOT NULL,
    
    -- Status
    "status" "BranchSubscriptionStatus" NOT NULL DEFAULT 'trial',
    
    -- Trial period
    "trial_start_date" DATE,
    "trial_end_date" DATE,
    
    -- Current billing period
    "current_period_start" DATE NOT NULL,
    "current_period_end" DATE NOT NULL,
    
    -- Grace period tracking
    "grace_period_end_date" DATE,
    
    -- Pricing
    "price_per_period" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Discount
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_reason" VARCHAR(255),
    
    -- Payment method
    "payment_gateway" "PaymentGateway",
    "payment_method_id" VARCHAR(255),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    
    -- Cancellation
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    
    -- Suspension tracking
    "suspended_at" TIMESTAMP(3),
    "suspension_count" INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "branch_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branch_subscriptions_branch_id_key" ON "branch_subscriptions"("branch_id");
CREATE INDEX "branch_subscriptions_tenant_id_idx" ON "branch_subscriptions"("tenant_id");
CREATE INDEX "branch_subscriptions_status_idx" ON "branch_subscriptions"("status");
CREATE INDEX "branch_subscriptions_current_period_end_idx" ON "branch_subscriptions"("current_period_end");
CREATE INDEX "branch_subscriptions_grace_period_end_date_idx" ON "branch_subscriptions"("grace_period_end_date");

-- ============================================
-- Subscription Invoices
-- ============================================

CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    
    -- Invoice details
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    
    -- Billing period
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    
    -- Amounts
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(10,2) NOT NULL,
    "cgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(10,2) NOT NULL,
    "grand_total" DECIMAL(10,2) NOT NULL,
    
    -- GST details
    "gstin" VARCHAR(20),
    "place_of_supply" VARCHAR(50),
    "is_igst" BOOLEAN NOT NULL DEFAULT false,
    
    -- Status
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'pending',
    
    -- Payment tracking
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMP(3),
    
    -- Retry tracking
    "payment_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_payment_attempt" TIMESTAMP(3),
    "next_retry_date" DATE,
    
    -- PDF storage
    "pdf_url" VARCHAR(500),
    
    -- Notes
    "notes" TEXT,
    
    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_invoices_tenant_id_invoice_number_key" ON "subscription_invoices"("tenant_id", "invoice_number");
CREATE INDEX "subscription_invoices_subscription_id_status_idx" ON "subscription_invoices"("subscription_id", "status");
CREATE INDEX "subscription_invoices_due_date_status_idx" ON "subscription_invoices"("due_date", "status");

-- ============================================
-- Subscription Payments
-- ============================================

CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    
    -- Payment details
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "gateway" "PaymentGateway" NOT NULL,
    
    -- Gateway details
    "gateway_payment_id" VARCHAR(255),
    "gateway_order_id" VARCHAR(255),
    "gateway_signature" VARCHAR(500),
    "gateway_response" JSONB,
    
    -- Status
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Failure tracking
    "failure_reason" TEXT,
    "failure_code" VARCHAR(50),
    
    -- Refund tracking
    "refunded_at" TIMESTAMP(3),
    "refund_amount" DECIMAL(10,2),
    "refund_reason" TEXT,
    "refund_id" VARCHAR(255),
    
    -- Metadata
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments"("subscription_id");
CREATE INDEX "subscription_payments_invoice_id_idx" ON "subscription_payments"("invoice_id");
CREATE INDEX "subscription_payments_gateway_payment_id_idx" ON "subscription_payments"("gateway_payment_id");

-- ============================================
-- Subscription History
-- ============================================

CREATE TABLE "subscription_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    
    -- Event type
    "event_type" VARCHAR(50) NOT NULL,
    
    -- Event details
    "from_status" "BranchSubscriptionStatus",
    "to_status" "BranchSubscriptionStatus",
    "from_plan_id" TEXT,
    "to_plan_id" TEXT,
    
    -- Additional data
    "metadata" JSONB DEFAULT '{}',
    "notes" TEXT,
    
    -- Actor
    "performed_by" TEXT,
    
    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_history_subscription_id_created_at_idx" ON "subscription_history"("subscription_id", "created_at" DESC);
CREATE INDEX "subscription_history_event_type_idx" ON "subscription_history"("event_type");

-- ============================================
-- Update Branches Table
-- ============================================

ALTER TABLE "branches" ADD COLUMN "subscription_status" "BranchSubscriptionStatus";
ALTER TABLE "branches" ADD COLUMN "subscription_plan_id" TEXT;
ALTER TABLE "branches" ADD COLUMN "is_accessible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "branches" ADD COLUMN "access_restricted_at" TIMESTAMP(3);
ALTER TABLE "branches" ADD COLUMN "access_restricted_reason" VARCHAR(255);

-- ============================================
-- Update Tenants Table
-- ============================================

ALTER TABLE "tenants" ADD COLUMN "billing_email" VARCHAR(255);
ALTER TABLE "tenants" ADD COLUMN "billing_address" TEXT;
ALTER TABLE "tenants" ADD COLUMN "gstin" VARCHAR(20);
ALTER TABLE "tenants" ADD COLUMN "volume_discount_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "volume_discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN "volume_discount_min_branches" INTEGER NOT NULL DEFAULT 3;

-- ============================================
-- Foreign Keys
-- ============================================

ALTER TABLE "branch_subscriptions" ADD CONSTRAINT "branch_subscriptions_branch_id_fkey" 
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "branch_subscriptions" ADD CONSTRAINT "branch_subscriptions_plan_id_fkey" 
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "branch_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "branch_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_invoice_id_fkey" 
    FOREIGN KEY ("invoice_id") REFERENCES "subscription_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "branch_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Seed Default Subscription Plans
-- ============================================

INSERT INTO "subscription_plans" (
    "id", "name", "code", "tier", "description",
    "monthly_price", "annual_price", "currency",
    "max_users", "max_appointments_per_day", "max_services", "max_products",
    "features", "trial_days", "grace_period_days",
    "display_order", "is_active", "is_public",
    "created_at", "updated_at"
) VALUES 
(
    'plan_basic_001',
    'Basic',
    'basic',
    'basic',
    'Perfect for small salons just getting started',
    999.00, 9990.00, 'INR',
    3, 50, 20, 50,
    '{"onlineBooking": false, "smsReminders": false, "emailReminders": true, "reports": "basic", "inventory": false, "memberships": false, "multiStaff": false, "api": false}',
    14, 7,
    1, true, true,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'plan_professional_001',
    'Professional',
    'professional',
    'professional',
    'For growing salons that need more features',
    2499.00, 24990.00, 'INR',
    10, 200, 100, 500,
    '{"onlineBooking": true, "smsReminders": true, "emailReminders": true, "reports": "advanced", "inventory": true, "memberships": true, "multiStaff": true, "api": false}',
    14, 7,
    2, true, true,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'plan_enterprise_001',
    'Enterprise',
    'enterprise',
    'enterprise',
    'For large salons and chains with unlimited needs',
    4999.00, 49990.00, 'INR',
    -1, -1, -1, -1,
    '{"onlineBooking": true, "smsReminders": true, "emailReminders": true, "reports": "advanced", "inventory": true, "memberships": true, "multiStaff": true, "api": true, "prioritySupport": true, "customBranding": true}',
    30, 14,
    3, true, true,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
