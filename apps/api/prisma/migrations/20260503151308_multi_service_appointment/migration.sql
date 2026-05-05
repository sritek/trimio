-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_owner', 'regional_manager', 'branch_manager', 'receptionist', 'stylist', 'accountant');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('booked', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled', 'scheduled');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('online', 'phone', 'walk_in');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'finalized', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'partial', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'upi', 'wallet', 'loyalty', 'package', 'membership', 'bank_transfer', 'cheque');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('casual', 'sick', 'earned', 'unpaid', 'emergency', 'maternity', 'paternity', 'comp_off');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('receipt', 'consumption', 'transfer_out', 'transfer_in', 'adjustment', 'wastage', 'sale', 'return_stock', 'audit', 'return');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('consumable', 'retail', 'both');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'frozen', 'expired', 'cancelled', 'transferred', 'pending');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('active', 'depleted', 'exhausted', 'expired', 'cancelled', 'transferred', 'pending');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('manual', 'create_appointment', 'add_walk_in');

-- CreateEnum
CREATE TYPE "SubscriptionPlanTier" AS ENUM ('basic', 'professional', 'enterprise');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'annual');

-- CreateEnum
CREATE TYPE "BranchSubscriptionStatus" AS ENUM ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('draft', 'pending', 'paid', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('razorpay', 'stripe', 'manual');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "legal_name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "logo_url" VARCHAR(500),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "billing_email" VARCHAR(255),
    "billing_address" TEXT,
    "gstin" VARCHAR(20),
    "volume_discount_enabled" BOOLEAN NOT NULL DEFAULT false,
    "volume_discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "volume_discount_min_branches" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "gstin" VARCHAR(20),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "working_hours" JSONB,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "geo_fence_radius" INTEGER DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "subscription_status" "BranchSubscriptionStatus",
    "subscription_plan_id" TEXT,
    "is_accessible" BOOLEAN NOT NULL DEFAULT true,
    "access_restricted_at" TIMESTAMP(3),
    "access_restricted_reason" VARCHAR(255),
    "branchSubscriptionId" TEXT,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "gender" VARCHAR(10),
    "avatar_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_branches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "gender" VARCHAR(10),
    "date_of_birth" DATE,
    "anniversary_date" DATE,
    "address" TEXT,
    "notes" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "wallet_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "no_show_count" INTEGER NOT NULL DEFAULT 0,
    "booking_status" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "first_visit_branch_id" TEXT,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT true,
    "source" "CustomerSource" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "points_per_unit" DECIMAL(10,4) NOT NULL DEFAULT 0.01,
    "redemption_value_per_point" DECIMAL(10,4) NOT NULL DEFAULT 0.5,
    "expiry_days" INTEGER NOT NULL DEFAULT 365,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_leave_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leave_type" VARCHAR(20) NOT NULL,
    "annual_entitlement" DECIMAL(4,1) NOT NULL,
    "max_carry_forward" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "points" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reference" VARCHAR(100),
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "reference" VARCHAR(100),
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_tags" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "duration_minutes" INTEGER NOT NULL,
    "active_time_minutes" INTEGER NOT NULL,
    "processing_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "gender_applicable" VARCHAR(20) NOT NULL DEFAULT 'all',
    "default_run_parallel" VARCHAR(20) NOT NULL DEFAULT 'optional',
    "commission_type" VARCHAR(20) NOT NULL DEFAULT 'percentage',
    "commission_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_variants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price_adjustment_type" VARCHAR(20) NOT NULL DEFAULT 'absolute',
    "price_adjustment" DECIMAL(10,2) NOT NULL,
    "duration_adjustment" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_service_prices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "commission_type" VARCHAR(20),
    "commission_value" DECIMAL(10,2),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "branch_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_add_ons" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "price" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "applicable_to" VARCHAR(20) NOT NULL DEFAULT 'all',
    "applicable_category_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_add_on_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "add_on_id" TEXT NOT NULL,
    "override_price" DECIMAL(10,2),
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "service_add_on_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_services" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "combo_price" DECIMAL(10,2) NOT NULL,
    "original_price" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "total_duration_minutes" INTEGER NOT NULL,
    "valid_from" DATE,
    "valid_until" DATE,
    "image_url" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "combo_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_service_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "combo_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_price_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "old_price" DECIMAL(10,2),
    "new_price" DECIMAL(10,2) NOT NULL,
    "change_reason" VARCHAR(255),
    "changed_by" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" VARCHAR(5) NOT NULL,
    "scheduled_end_time" VARCHAR(5) NOT NULL,
    "total_duration" INTEGER NOT NULL,
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "stylist_id" TEXT,
    "stylist_gender_preference" VARCHAR(10),
    "booking_type" "AppointmentType" NOT NULL DEFAULT 'walk_in',
    "booking_source" VARCHAR(50),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'booked',
    "checked_in_at" TIMESTAMP(3),
    "token_number" INTEGER,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price_locked_at" TIMESTAMP(3),
    "prepayment_required" BOOLEAN NOT NULL DEFAULT false,
    "prepayment_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "prepayment_status" VARCHAR(20),
    "payment_id" VARCHAR(100),
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "original_appointment_id" TEXT,
    "rescheduled_to_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "is_salon_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "has_conflict" BOOLEAN NOT NULL DEFAULT false,
    "conflict_notes" TEXT,
    "conflict_marked_at" TIMESTAMP(3),
    "conflict_resolved_at" TIMESTAMP(3),
    "customer_notes" TEXT,
    "internal_notes" TEXT,
    "station_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_services" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "service_sku" VARCHAR(50),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "active_time_minutes" INTEGER NOT NULL,
    "processing_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "run_parallel" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_start_time" TIMESTAMP(3),
    "scheduled_end_time" TIMESTAMP(3),
    "assigned_stylist_id" TEXT,
    "actual_stylist_id" TEXT,
    "assistant_id" TEXT,
    "station_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'waiting',
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "commission_rate" DECIMAL(5,2),
    "commission_amount" DECIMAL(10,2),
    "added_mid_appointment" BOOLEAN NOT NULL DEFAULT false,
    "added_at" TIMESTAMP(3),
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20) NOT NULL,
    "changed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stylist_breaks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "stylist_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "day_of_week" INTEGER,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "stylist_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stylist_blocked_slots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "stylist_id" TEXT NOT NULL,
    "blocked_date" DATE NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "is_full_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "stylist_blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walk_in_queue" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "queue_date" DATE NOT NULL,
    "token_number" INTEGER NOT NULL,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20),
    "service_ids" TEXT[],
    "stylist_preference_id" TEXT,
    "gender_preference" VARCHAR(10),
    "status" VARCHAR(20) NOT NULL DEFAULT 'waiting',
    "position" INTEGER NOT NULL,
    "estimated_wait_minutes" INTEGER,
    "called_at" TIMESTAMP(3),
    "appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walk_in_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "invoice_number" VARCHAR(50),
    "invoice_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_time" TIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20),
    "customer_email" VARCHAR(255),
    "appointment_id" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "round_off" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loyalty_points_earned" INTEGER NOT NULL DEFAULT 0,
    "loyalty_points_redeemed" INTEGER NOT NULL DEFAULT 0,
    "loyalty_discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "wallet_amount_used" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "package_redemption_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "membership_discount_applied" BOOLEAN NOT NULL DEFAULT false,
    "membership_id" TEXT,
    "gstin" VARCHAR(20),
    "place_of_supply" VARCHAR(50),
    "is_igst" BOOLEAN NOT NULL DEFAULT false,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "finalized_at" TIMESTAMP(3),
    "finalized_by" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "item_type" VARCHAR(20) NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reference_sku" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "variant_name" VARCHAR(100),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "discount_type" VARCHAR(20),
    "discount_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_reason" VARCHAR(255),
    "hsn_sac_code" VARCHAR(20),
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "taxable_amount" DECIMAL(10,2) NOT NULL,
    "cgst_rate" DECIMAL(5,2) NOT NULL,
    "cgst_amount" DECIMAL(10,2) NOT NULL,
    "sgst_rate" DECIMAL(5,2) NOT NULL,
    "sgst_amount" DECIMAL(10,2) NOT NULL,
    "igst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(10,2) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "stylist_id" TEXT,
    "stylist_name" VARCHAR(255),
    "assistant_id" TEXT,
    "commission_type" VARCHAR(20),
    "commission_rate" DECIMAL(5,2),
    "commission_amount" DECIMAL(10,2),
    "assistant_commission_amount" DECIMAL(10,2),
    "is_package_redemption" BOOLEAN NOT NULL DEFAULT false,
    "package_redemption_id" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_discounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_source" VARCHAR(50),
    "discount_name" VARCHAR(100) NOT NULL,
    "calculation_type" VARCHAR(20) NOT NULL,
    "calculation_value" DECIMAL(10,2) NOT NULL,
    "applied_to" VARCHAR(20) NOT NULL,
    "applied_item_id" TEXT,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approval_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "invoice_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "card_last_four" VARCHAR(4),
    "card_type" VARCHAR(20),
    "upi_id" VARCHAR(100),
    "transaction_id" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "cheque_number" VARCHAR(50),
    "cheque_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "is_refund" BOOLEAN NOT NULL DEFAULT false,
    "original_payment_id" TEXT,
    "refund_reason" TEXT,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_time" TIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_of_birth" DATE,
    "blood_group" VARCHAR(5),
    "emergency_contact_name" VARCHAR(100),
    "emergency_contact_phone" VARCHAR(20),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "employee_code" VARCHAR(50),
    "designation" VARCHAR(100),
    "department" VARCHAR(100),
    "date_of_joining" DATE NOT NULL,
    "date_of_leaving" DATE,
    "employment_type" VARCHAR(20) NOT NULL DEFAULT 'full_time',
    "skill_level" VARCHAR(20),
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aadhar_number" VARCHAR(20),
    "pan_number" VARCHAR(20),
    "bank_account_number" VARCHAR(30),
    "bank_name" VARCHAR(100),
    "bank_ifsc" VARCHAR(20),
    "salary_type" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_commission_type" VARCHAR(20),
    "default_commission_rate" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "check_in_time" VARCHAR(8),
    "check_out_time" VARCHAR(8),
    "scheduled_hours" DECIMAL(4,2),
    "actual_hours" DECIMAL(4,2),
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'absent',
    "leave_id" TEXT,
    "notes" TEXT,
    "is_manual_entry" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "check_in_latitude" DECIMAL(10,8),
    "check_in_longitude" DECIMAL(11,8),
    "check_out_latitude" DECIMAL(10,8),
    "check_out_longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DECIMAL(4,1) NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_type" VARCHAR(20),
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "financial_year" VARCHAR(10) NOT NULL,
    "leave_type" VARCHAR(20) NOT NULL,
    "opening_balance" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "accrued" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "used" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "lapsed" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "carried_forward" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "invoice_item_id" TEXT NOT NULL,
    "service_id" TEXT,
    "service_name" VARCHAR(255) NOT NULL,
    "service_amount" DECIMAL(10,2) NOT NULL,
    "commission_type" VARCHAR(20) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "role_type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "payroll_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "commission_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_components" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "component_type" VARCHAR(20) NOT NULL,
    "calculation_type" VARCHAR(20) NOT NULL,
    "calculation_base" VARCHAR(50),
    "default_value" DECIMAL(10,2),
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_salary_structure" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "staff_salary_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_deductions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deduction_type" VARCHAR(20) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "monthly_deduction" DECIMAL(10,2) NOT NULL,
    "remaining_amount" DECIMAL(10,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "staff_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "payroll_month" VARCHAR(7) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "total_employees" INTEGER NOT NULL DEFAULT 0,
    "total_gross_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_commissions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_net_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "working_days" INTEGER NOT NULL,
    "present_days" DECIMAL(4,1) NOT NULL,
    "absent_days" DECIMAL(4,1) NOT NULL,
    "leave_days" DECIMAL(4,1) NOT NULL,
    "base_salary" DECIMAL(10,2) NOT NULL,
    "earnings_json" JSONB NOT NULL,
    "total_earnings" DECIMAL(10,2) NOT NULL,
    "total_commissions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commission_count" INTEGER NOT NULL DEFAULT 0,
    "deductions_json" JSONB NOT NULL,
    "total_deductions" DECIMAL(10,2) NOT NULL,
    "lop_days" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "lop_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gross_salary" DECIMAL(10,2) NOT NULL,
    "net_salary" DECIMAL(10,2) NOT NULL,
    "payment_mode" VARCHAR(20),
    "payment_reference" VARCHAR(100),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payslip_number" VARCHAR(50) NOT NULL,
    "payslip_month" VARCHAR(7) NOT NULL,
    "pdf_url" VARCHAR(500),
    "generated_at" TIMESTAMP(3),
    "emailed_at" TIMESTAMP(3),
    "email_status" VARCHAR(20),
    "whatsapp_sent_at" TIMESTAMP(3),
    "whatsapp_status" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "parent_id" TEXT,
    "expiry_tracking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "sku" VARCHAR(50),
    "barcode" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "product_type" "ProductType" NOT NULL,
    "unit_of_measure" VARCHAR(20) NOT NULL,
    "default_purchase_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "default_selling_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "hsn_code" VARCHAR(20),
    "expiry_tracking_enabled" BOOLEAN NOT NULL DEFAULT false,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_product_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reorder_level" INTEGER,
    "selling_price_override" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_product_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "gstin" VARCHAR(20),
    "payment_terms_days" INTEGER,
    "lead_time_days" INTEGER,
    "last_purchase_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_product_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "vendor_sku" VARCHAR(50),
    "last_purchase_price" DECIMAL(10,2),
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_product_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "po_number" VARCHAR(50) NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "order_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery_date" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "product_sku" VARCHAR(50),
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "pending_quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "grn_number" VARCHAR(50) NOT NULL,
    "purchase_order_id" TEXT,
    "vendor_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "receipt_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "goods_receipt_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "goods_receipt_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "purchase_order_item_id" TEXT,
    "received_quantity" INTEGER NOT NULL,
    "foc_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "batch_number" VARCHAR(50),
    "expiry_date" DATE,
    "quality_check_status" VARCHAR(20) NOT NULL DEFAULT 'accepted',
    "accepted_quantity" INTEGER NOT NULL,
    "rejected_quantity" INTEGER NOT NULL DEFAULT 0,
    "rejection_reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_number" VARCHAR(50),
    "quantity" INTEGER NOT NULL,
    "available_quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "total_value" DECIMAL(12,2) NOT NULL,
    "receipt_date" DATE NOT NULL,
    "expiry_date" DATE,
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "is_depleted" BOOLEAN NOT NULL DEFAULT false,
    "goods_receipt_item_id" TEXT,
    "transfer_item_id" TEXT,
    "adjustment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "movement_type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantity_before" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" TEXT,
    "reason" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transfer_number" VARCHAR(50) NOT NULL,
    "source_branch_id" TEXT NOT NULL,
    "destination_branch_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'requested',
    "request_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "dispatched_by" TEXT,
    "received_at" TIMESTAMP(3),
    "received_by" TEXT,
    "total_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "requested_quantity" INTEGER NOT NULL,
    "dispatched_quantity" INTEGER NOT NULL DEFAULT 0,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "discrepancy" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_audits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "audit_number" VARCHAR(50) NOT NULL,
    "audit_type" VARCHAR(20) NOT NULL,
    "category_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "posted_at" TIMESTAMP(3),
    "posted_by" TEXT,
    "total_variance_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_shrinkage_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "stock_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_audit_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "system_quantity" INTEGER NOT NULL,
    "physical_count" INTEGER,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "average_cost" DECIMAL(10,2) NOT NULL,
    "variance_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "counted_at" TIMESTAMP(3),
    "counted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_audit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_consumable_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_per_service" DECIMAL(10,3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_consumable_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_config" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "memberships_enabled" BOOLEAN NOT NULL DEFAULT true,
    "packages_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_validity_unit" VARCHAR(10) NOT NULL DEFAULT 'months',
    "default_validity_value" INTEGER NOT NULL DEFAULT 12,
    "refund_policy" VARCHAR(20) NOT NULL DEFAULT 'partial',
    "cancellation_fee_percentage" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "default_branch_scope" VARCHAR(20) NOT NULL DEFAULT 'all_branches',
    "membership_package_precedence" VARCHAR(30) NOT NULL DEFAULT 'package_first',
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "max_freeze_days_per_year" INTEGER NOT NULL DEFAULT 30,
    "expiry_reminder_days" INTEGER NOT NULL DEFAULT 7,
    "low_balance_threshold" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20),
    "description" TEXT,
    "tier" VARCHAR(20),
    "price" DECIMAL(10,2) NOT NULL,
    "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "validity_value" INTEGER NOT NULL,
    "validity_unit" VARCHAR(10) NOT NULL,
    "branch_scope" VARCHAR(20) NOT NULL DEFAULT 'all_branches',
    "terms_and_conditions" TEXT,
    "sale_commission_type" VARCHAR(20),
    "sale_commission_value" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plan_branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plan_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_benefits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "benefit_type" VARCHAR(30) NOT NULL,
    "service_id" TEXT,
    "category_id" TEXT,
    "discount_type" VARCHAR(20),
    "discount_value" DECIMAL(10,2),
    "complimentary_count" INTEGER,
    "complimentary_period" VARCHAR(20),
    "max_services_per_visit" INTEGER,
    "cooldown_days" INTEGER,
    "benefit_cap_amount" DECIMAL(10,2),
    "benefit_cap_period" VARCHAR(20),
    "priority_level" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "membership_number" VARCHAR(50) NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_branch_id" TEXT NOT NULL,
    "purchase_invoice_id" TEXT,
    "price_paid" DECIMAL(10,2) NOT NULL,
    "gst_paid" DECIMAL(10,2) NOT NULL,
    "total_paid" DECIMAL(10,2) NOT NULL,
    "activation_date" DATE NOT NULL,
    "original_expiry_date" DATE NOT NULL,
    "current_expiry_date" DATE NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "total_freeze_days_used" INTEGER NOT NULL DEFAULT 0,
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "total_discount_availed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_visit_date" DATE,
    "last_visit_branch_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "refund_amount" DECIMAL(10,2),
    "transferred_to_id" TEXT,
    "transferred_from_id" TEXT,
    "sale_commission_amount" DECIMAL(10,2),
    "sale_commission_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "customer_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_freezes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "freeze_start_date" DATE NOT NULL,
    "freeze_end_date" DATE NOT NULL,
    "freeze_days" INTEGER NOT NULL,
    "reason_code" VARCHAR(30) NOT NULL,
    "reason_description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_usage" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "usage_date" DATE NOT NULL,
    "usage_branch_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "invoice_item_id" TEXT,
    "service_id" TEXT,
    "service_name" VARCHAR(255) NOT NULL,
    "benefit_type" VARCHAR(30) NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "is_complimentary" BOOLEAN NOT NULL DEFAULT false,
    "complimentary_benefit_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "membership_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20),
    "description" TEXT,
    "package_type" VARCHAR(20) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "mrp" DECIMAL(10,2),
    "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "credit_value" DECIMAL(10,2),
    "validity_value" INTEGER NOT NULL,
    "validity_unit" VARCHAR(10) NOT NULL,
    "branch_scope" VARCHAR(20) NOT NULL DEFAULT 'all_branches',
    "allow_rollover" BOOLEAN NOT NULL DEFAULT false,
    "terms_and_conditions" TEXT,
    "sale_commission_type" VARCHAR(20),
    "sale_commission_value" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_services" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "credit_count" INTEGER NOT NULL,
    "locked_price" DECIMAL(10,2) NOT NULL,
    "variant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "package_number" VARCHAR(50) NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_branch_id" TEXT NOT NULL,
    "purchase_invoice_id" TEXT,
    "price_paid" DECIMAL(10,2) NOT NULL,
    "gst_paid" DECIMAL(10,2) NOT NULL,
    "total_paid" DECIMAL(10,2) NOT NULL,
    "initial_credit_value" DECIMAL(10,2),
    "remaining_credit_value" DECIMAL(10,2),
    "activation_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'active',
    "total_redemptions" INTEGER NOT NULL DEFAULT 0,
    "total_redeemed_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_redemption_date" DATE,
    "last_redemption_branch_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "refund_amount" DECIMAL(10,2),
    "transferred_to_id" TEXT,
    "transferred_from_id" TEXT,
    "sale_commission_amount" DECIMAL(10,2),
    "sale_commission_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "customer_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_credits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_package_id" TEXT NOT NULL,
    "package_service_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "initial_credits" INTEGER NOT NULL,
    "remaining_credits" INTEGER NOT NULL,
    "locked_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_redemptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_package_id" TEXT NOT NULL,
    "package_credit_id" TEXT,
    "redemption_date" DATE NOT NULL,
    "redemption_branch_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "invoice_item_id" TEXT,
    "service_id" TEXT NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "credits_used" INTEGER,
    "value_used" DECIMAL(10,2),
    "locked_price" DECIMAL(10,2) NOT NULL,
    "stylist_id" TEXT,
    "redemption_commission_amount" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "package_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20),
    "service_ids" TEXT[],
    "preferred_stylist_id" TEXT,
    "preferred_start_date" DATE NOT NULL,
    "preferred_end_date" DATE NOT NULL,
    "time_preferences" TEXT[],
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "appointment_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "station_type_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "tier" "SubscriptionPlanTier" NOT NULL,
    "description" TEXT,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "annual_price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "max_users" INTEGER NOT NULL,
    "max_appointments_per_day" INTEGER NOT NULL,
    "max_services" INTEGER NOT NULL,
    "max_products" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "status" "BranchSubscriptionStatus" NOT NULL DEFAULT 'trial',
    "trial_start_date" DATE,
    "trial_end_date" DATE,
    "current_period_start" DATE NOT NULL,
    "current_period_end" DATE NOT NULL,
    "grace_period_end_date" DATE,
    "trial_days_granted" INTEGER NOT NULL,
    "grace_period_days_granted" INTEGER NOT NULL,
    "price_per_period" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_reason" VARCHAR(255),
    "payment_gateway" "PaymentGateway",
    "payment_method_id" VARCHAR(255),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "suspended_at" TIMESTAMP(3),
    "suspension_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "branch_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(10,2) NOT NULL,
    "cgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(10,2) NOT NULL,
    "grand_total" DECIMAL(10,2) NOT NULL,
    "gstin" VARCHAR(20),
    "place_of_supply" VARCHAR(50),
    "is_igst" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'pending',
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMP(3),
    "payment_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_payment_attempt" TIMESTAMP(3),
    "next_retry_date" DATE,
    "pdf_url" VARCHAR(500),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "gateway" "PaymentGateway" NOT NULL,
    "gateway_payment_id" VARCHAR(255),
    "gateway_order_id" VARCHAR(255),
    "gateway_signature" VARCHAR(500),
    "gateway_response" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "failure_code" VARCHAR(50),
    "refunded_at" TIMESTAMP(3),
    "refund_amount" DECIMAL(10,2),
    "refund_reason" TEXT,
    "refund_id" VARCHAR(255),
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "from_status" "BranchSubscriptionStatus",
    "to_status" "BranchSubscriptionStatus",
    "from_plan_id" TEXT,
    "to_plan_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "notes" TEXT,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_slug_key" ON "branches"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_phone_key" ON "users"("tenant_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "user_branches_user_id_branch_id_key" ON "user_branches"("user_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_phone_idx" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_phone_key" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "customer_notes_customer_id_created_at_idx" ON "customer_notes"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_configs_tenant_id_key" ON "loyalty_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_leave_policies_tenant_id_is_active_idx" ON "tenant_leave_policies"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_leave_policies_tenant_id_leave_type_key" ON "tenant_leave_policies"("tenant_id", "leave_type");

-- CreateIndex
CREATE INDEX "loyalty_transactions_customer_id_created_at_idx" ON "loyalty_transactions"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_transactions_customer_id_created_at_idx" ON "wallet_transactions"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "custom_tags_tenant_id_idx" ON "custom_tags"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_tags_tenant_id_name_key" ON "custom_tags"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "service_categories_tenant_id_parent_id_is_active_idx" ON "service_categories"("tenant_id", "parent_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_tenant_id_slug_key" ON "service_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "services_tenant_id_is_active_idx" ON "services"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "services_category_id_is_active_idx" ON "services"("category_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "services_tenant_id_sku_key" ON "services"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "service_variants_service_id_is_active_idx" ON "service_variants"("service_id", "is_active");

-- CreateIndex
CREATE INDEX "branch_service_prices_branch_id_service_id_idx" ON "branch_service_prices"("branch_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_service_prices_branch_id_service_id_key" ON "branch_service_prices"("branch_id", "service_id");

-- CreateIndex
CREATE INDEX "service_add_ons_tenant_id_is_active_idx" ON "service_add_ons"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_add_on_mappings_service_id_add_on_id_key" ON "service_add_on_mappings"("service_id", "add_on_id");

-- CreateIndex
CREATE INDEX "combo_services_tenant_id_is_active_idx" ON "combo_services"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "combo_services_tenant_id_sku_key" ON "combo_services"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "combo_service_items_combo_id_idx" ON "combo_service_items"("combo_id");

-- CreateIndex
CREATE INDEX "service_price_history_service_id_changed_at_idx" ON "service_price_history"("service_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "appointments_tenant_id_idx" ON "appointments"("tenant_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_branch_id_idx" ON "appointments"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_scheduled_date_idx" ON "appointments"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "appointments_branch_id_scheduled_date_scheduled_time_idx" ON "appointments"("branch_id", "scheduled_date", "scheduled_time");

-- CreateIndex
CREATE INDEX "appointments_stylist_id_scheduled_date_idx" ON "appointments"("stylist_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "appointments_customer_id_idx" ON "appointments"("customer_id");

-- CreateIndex
CREATE INDEX "appointments_branch_id_status_scheduled_date_idx" ON "appointments"("branch_id", "status", "scheduled_date");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_scheduled_date_branch_id_idx" ON "appointments"("tenant_id", "scheduled_date", "branch_id");

-- CreateIndex
CREATE INDEX "appointments_customer_id_scheduled_date_idx" ON "appointments"("customer_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "appointment_services_appointment_id_idx" ON "appointment_services"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_services_tenant_id_idx" ON "appointment_services"("tenant_id");

-- CreateIndex
CREATE INDEX "appointment_services_assigned_stylist_id_scheduled_start_ti_idx" ON "appointment_services"("assigned_stylist_id", "scheduled_start_time");

-- CreateIndex
CREATE INDEX "appointment_services_station_id_status_idx" ON "appointment_services"("station_id", "status");

-- CreateIndex
CREATE INDEX "appointment_status_history_appointment_id_created_at_idx" ON "appointment_status_history"("appointment_id", "created_at");

-- CreateIndex
CREATE INDEX "appointment_status_history_tenant_id_idx" ON "appointment_status_history"("tenant_id");

-- CreateIndex
CREATE INDEX "stylist_breaks_stylist_id_day_of_week_idx" ON "stylist_breaks"("stylist_id", "day_of_week");

-- CreateIndex
CREATE INDEX "stylist_breaks_tenant_id_branch_id_idx" ON "stylist_breaks"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "stylist_blocked_slots_stylist_id_blocked_date_idx" ON "stylist_blocked_slots"("stylist_id", "blocked_date");

-- CreateIndex
CREATE INDEX "stylist_blocked_slots_tenant_id_branch_id_idx" ON "stylist_blocked_slots"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_queue_appointment_id_key" ON "walk_in_queue"("appointment_id");

-- CreateIndex
CREATE INDEX "walk_in_queue_branch_id_queue_date_status_idx" ON "walk_in_queue"("branch_id", "queue_date", "status");

-- CreateIndex
CREATE INDEX "walk_in_queue_tenant_id_idx" ON "walk_in_queue"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_queue_branch_id_queue_date_token_number_key" ON "walk_in_queue"("branch_id", "queue_date", "token_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_appointment_id_key" ON "invoices"("appointment_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_branch_id_idx" ON "invoices"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "invoices_branch_id_invoice_date_idx" ON "invoices"("branch_id", "invoice_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_branch_id_status_invoice_date_idx" ON "invoices"("branch_id", "status", "invoice_date");

-- CreateIndex
CREATE INDEX "invoices_customer_id_created_at_idx" ON "invoices"("customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_branch_id_invoice_number_key" ON "invoices"("branch_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_stylist_id_created_at_idx" ON "invoice_items"("stylist_id", "created_at");

-- CreateIndex
CREATE INDEX "invoice_discounts_invoice_id_idx" ON "invoice_discounts"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_branch_id_payment_date_idx" ON "payments"("branch_id", "payment_date");

-- CreateIndex
CREATE INDEX "payments_branch_id_payment_method_payment_date_idx" ON "payments"("branch_id", "payment_method", "payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_user_id_key" ON "staff_profiles"("user_id");

-- CreateIndex
CREATE INDEX "staff_profiles_tenant_id_user_id_idx" ON "staff_profiles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "staff_profiles_tenant_id_employee_code_idx" ON "staff_profiles"("tenant_id", "employee_code");

-- CreateIndex
CREATE INDEX "attendance_user_id_attendance_date_idx" ON "attendance"("user_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_branch_id_attendance_date_idx" ON "attendance"("branch_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_branch_id_status_attendance_date_idx" ON "attendance"("branch_id", "status", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_branch_id_user_id_attendance_date_key" ON "attendance"("branch_id", "user_id", "attendance_date");

-- CreateIndex
CREATE INDEX "leaves_user_id_start_date_idx" ON "leaves"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "leaves_user_id_status_idx" ON "leaves"("user_id", "status");

-- CreateIndex
CREATE INDEX "leave_balances_user_id_financial_year_idx" ON "leave_balances"("user_id", "financial_year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_user_id_financial_year_leave_type_key" ON "leave_balances"("user_id", "financial_year", "leave_type");

-- CreateIndex
CREATE INDEX "commissions_user_id_commission_date_idx" ON "commissions"("user_id", "commission_date");

-- CreateIndex
CREATE INDEX "commissions_invoice_id_idx" ON "commissions"("invoice_id");

-- CreateIndex
CREATE INDEX "commissions_user_id_status_idx" ON "commissions"("user_id", "status");

-- CreateIndex
CREATE INDEX "commissions_payroll_id_idx" ON "commissions"("payroll_id");

-- CreateIndex
CREATE INDEX "commissions_user_id_created_at_idx" ON "commissions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "salary_components_tenant_id_code_key" ON "salary_components"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "staff_salary_structure_user_id_effective_from_idx" ON "staff_salary_structure"("user_id", "effective_from");

-- CreateIndex
CREATE INDEX "staff_deductions_user_id_status_idx" ON "staff_deductions"("user_id", "status");

-- CreateIndex
CREATE INDEX "payroll_tenant_id_payroll_month_idx" ON "payroll"("tenant_id", "payroll_month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_tenant_id_branch_id_payroll_month_key" ON "payroll"("tenant_id", "branch_id", "payroll_month");

-- CreateIndex
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_items_user_id_idx" ON "payroll_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payroll_item_id_key" ON "payslips"("payroll_item_id");

-- CreateIndex
CREATE INDEX "payslips_user_id_payslip_month_idx" ON "payslips"("user_id", "payslip_month");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_tenant_id_payslip_number_key" ON "payslips"("tenant_id", "payslip_number");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "product_categories_tenant_id_parent_id_is_active_idx" ON "product_categories"("tenant_id", "parent_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenant_id_slug_key" ON "product_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "products_tenant_id_category_id_is_active_idx" ON "products"("tenant_id", "category_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_barcode_key" ON "products"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "branch_product_settings_branch_id_is_enabled_idx" ON "branch_product_settings"("branch_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "branch_product_settings_branch_id_product_id_key" ON "branch_product_settings"("branch_id", "product_id");

-- CreateIndex
CREATE INDEX "vendors_tenant_id_is_active_idx" ON "vendors"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "vendor_product_mappings_product_id_is_preferred_idx" ON "vendor_product_mappings"("product_id", "is_preferred");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_product_mappings_vendor_id_product_id_key" ON "vendor_product_mappings"("vendor_id", "product_id");

-- CreateIndex
CREATE INDEX "purchase_orders_branch_id_status_order_date_idx" ON "purchase_orders"("branch_id", "status", "order_date");

-- CreateIndex
CREATE INDEX "purchase_orders_vendor_id_idx" ON "purchase_orders"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_branch_id_po_number_key" ON "purchase_orders"("branch_id", "po_number");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_branch_id_status_receipt_date_idx" ON "goods_receipt_notes"("branch_id", "status", "receipt_date");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_purchase_order_id_idx" ON "goods_receipt_notes"("purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_notes_branch_id_grn_number_key" ON "goods_receipt_notes"("branch_id", "grn_number");

-- CreateIndex
CREATE INDEX "goods_receipt_items_goods_receipt_id_idx" ON "goods_receipt_items"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "stock_batches_branch_id_product_id_is_depleted_idx" ON "stock_batches"("branch_id", "product_id", "is_depleted");

-- CreateIndex
CREATE INDEX "stock_batches_branch_id_expiry_date_idx" ON "stock_batches"("branch_id", "expiry_date");

-- CreateIndex
CREATE INDEX "stock_batches_product_id_branch_id_is_depleted_idx" ON "stock_batches"("product_id", "branch_id", "is_depleted");

-- CreateIndex
CREATE INDEX "stock_movements_branch_id_product_id_created_at_idx" ON "stock_movements"("branch_id", "product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_branch_id_movement_type_created_at_idx" ON "stock_movements"("branch_id", "movement_type", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "stock_transfers_source_branch_id_status_idx" ON "stock_transfers"("source_branch_id", "status");

-- CreateIndex
CREATE INDEX "stock_transfers_destination_branch_id_status_idx" ON "stock_transfers"("destination_branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_source_branch_id_transfer_number_key" ON "stock_transfers"("source_branch_id", "transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");

-- CreateIndex
CREATE INDEX "stock_audits_branch_id_status_idx" ON "stock_audits"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_audits_branch_id_audit_number_key" ON "stock_audits"("branch_id", "audit_number");

-- CreateIndex
CREATE INDEX "stock_audit_items_audit_id_idx" ON "stock_audit_items"("audit_id");

-- CreateIndex
CREATE INDEX "service_consumable_mappings_service_id_is_active_idx" ON "service_consumable_mappings"("service_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_consumable_mappings_service_id_product_id_key" ON "service_consumable_mappings"("service_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_config_tenant_id_key" ON "membership_config"("tenant_id");

-- CreateIndex
CREATE INDEX "membership_plans_tenant_id_is_active_idx" ON "membership_plans"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_tenant_id_code_key" ON "membership_plans"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "membership_plan_branches_plan_id_idx" ON "membership_plan_branches"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plan_branches_plan_id_branch_id_key" ON "membership_plan_branches"("plan_id", "branch_id");

-- CreateIndex
CREATE INDEX "membership_benefits_plan_id_benefit_type_idx" ON "membership_benefits"("plan_id", "benefit_type");

-- CreateIndex
CREATE INDEX "customer_memberships_customer_id_status_idx" ON "customer_memberships"("customer_id", "status");

-- CreateIndex
CREATE INDEX "customer_memberships_current_expiry_date_status_idx" ON "customer_memberships"("current_expiry_date", "status");

-- CreateIndex
CREATE INDEX "customer_memberships_purchase_branch_id_idx" ON "customer_memberships"("purchase_branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_memberships_tenant_id_membership_number_key" ON "customer_memberships"("tenant_id", "membership_number");

-- CreateIndex
CREATE INDEX "membership_freezes_membership_id_status_idx" ON "membership_freezes"("membership_id", "status");

-- CreateIndex
CREATE INDEX "membership_usage_membership_id_usage_date_idx" ON "membership_usage"("membership_id", "usage_date");

-- CreateIndex
CREATE INDEX "membership_usage_usage_branch_id_usage_date_idx" ON "membership_usage"("usage_branch_id", "usage_date");

-- CreateIndex
CREATE INDEX "packages_tenant_id_is_active_package_type_idx" ON "packages"("tenant_id", "is_active", "package_type");

-- CreateIndex
CREATE UNIQUE INDEX "packages_tenant_id_code_key" ON "packages"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "package_branches_package_id_branch_id_key" ON "package_branches"("package_id", "branch_id");

-- CreateIndex
CREATE INDEX "package_services_package_id_idx" ON "package_services"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_services_package_id_service_id_variant_id_key" ON "package_services"("package_id", "service_id", "variant_id");

-- CreateIndex
CREATE INDEX "customer_packages_customer_id_status_idx" ON "customer_packages"("customer_id", "status");

-- CreateIndex
CREATE INDEX "customer_packages_expiry_date_status_idx" ON "customer_packages"("expiry_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_packages_tenant_id_package_number_key" ON "customer_packages"("tenant_id", "package_number");

-- CreateIndex
CREATE INDEX "package_credits_customer_package_id_idx" ON "package_credits"("customer_package_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_credits_customer_package_id_package_service_id_key" ON "package_credits"("customer_package_id", "package_service_id");

-- CreateIndex
CREATE INDEX "package_redemptions_customer_package_id_redemption_date_idx" ON "package_redemptions"("customer_package_id", "redemption_date");

-- CreateIndex
CREATE INDEX "package_redemptions_redemption_branch_id_redemption_date_idx" ON "package_redemptions"("redemption_branch_id", "redemption_date");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_appointment_id_key" ON "waitlist_entries"("appointment_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_tenant_id_branch_id_status_idx" ON "waitlist_entries"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_branch_id_preferred_start_date_preferred_e_idx" ON "waitlist_entries"("branch_id", "preferred_start_date", "preferred_end_date");

-- CreateIndex
CREATE INDEX "waitlist_entries_tenant_id_idx" ON "waitlist_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "station_types_tenant_id_idx" ON "station_types"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "station_types_tenant_id_name_key" ON "station_types"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "stations_tenant_id_branch_id_idx" ON "stations"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "stations_branch_id_status_idx" ON "stations"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stations_branch_id_name_key" ON "stations"("branch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_plans_is_active_is_public_idx" ON "subscription_plans"("is_active", "is_public");

-- CreateIndex
CREATE UNIQUE INDEX "branch_subscriptions_branch_id_key" ON "branch_subscriptions"("branch_id");

-- CreateIndex
CREATE INDEX "branch_subscriptions_tenant_id_idx" ON "branch_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "branch_subscriptions_status_idx" ON "branch_subscriptions"("status");

-- CreateIndex
CREATE INDEX "branch_subscriptions_current_period_end_idx" ON "branch_subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "branch_subscriptions_grace_period_end_date_idx" ON "branch_subscriptions"("grace_period_end_date");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscription_id_status_idx" ON "subscription_invoices"("subscription_id", "status");

-- CreateIndex
CREATE INDEX "subscription_invoices_due_date_status_idx" ON "subscription_invoices"("due_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_tenant_id_invoice_number_key" ON "subscription_invoices"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_payments_invoice_id_idx" ON "subscription_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "subscription_payments_gateway_payment_id_idx" ON "subscription_payments"("gateway_payment_id");

-- CreateIndex
CREATE INDEX "subscription_history_subscription_id_created_at_idx" ON "subscription_history"("subscription_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "subscription_history_event_type_idx" ON "subscription_history"("event_type");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_branchSubscriptionId_fkey" FOREIGN KEY ("branchSubscriptionId") REFERENCES "branch_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_configs" ADD CONSTRAINT "loyalty_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_tags" ADD CONSTRAINT "custom_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_variants" ADD CONSTRAINT "service_variants_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_service_prices" ADD CONSTRAINT "branch_service_prices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_service_prices" ADD CONSTRAINT "branch_service_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_add_ons" ADD CONSTRAINT "service_add_ons_applicable_category_id_fkey" FOREIGN KEY ("applicable_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_add_on_mappings" ADD CONSTRAINT "service_add_on_mappings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_add_on_mappings" ADD CONSTRAINT "service_add_on_mappings_add_on_id_fkey" FOREIGN KEY ("add_on_id") REFERENCES "service_add_ons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_service_items" ADD CONSTRAINT "combo_service_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combo_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_service_items" ADD CONSTRAINT "combo_service_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_price_history" ADD CONSTRAINT "service_price_history_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_stylist_id_fkey" FOREIGN KEY ("stylist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_original_appointment_id_fkey" FOREIGN KEY ("original_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_assigned_stylist_id_fkey" FOREIGN KEY ("assigned_stylist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_actual_stylist_id_fkey" FOREIGN KEY ("actual_stylist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_queue" ADD CONSTRAINT "walk_in_queue_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_discounts" ADD CONSTRAINT "invoice_discounts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "leaves"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salary_structure" ADD CONSTRAINT "staff_salary_structure_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salary_structure" ADD CONSTRAINT "staff_salary_structure_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_deductions" ADD CONSTRAINT "staff_deductions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "staff_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_item_id_fkey" FOREIGN KEY ("payroll_item_id") REFERENCES "payroll_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_product_settings" ADD CONSTRAINT "branch_product_settings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_product_settings" ADD CONSTRAINT "branch_product_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_product_mappings" ADD CONSTRAINT "vendor_product_mappings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_product_mappings" ADD CONSTRAINT "vendor_product_mappings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_goods_receipt_item_id_fkey" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "goods_receipt_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_transfer_item_id_fkey" FOREIGN KEY ("transfer_item_id") REFERENCES "stock_transfer_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_branch_id_fkey" FOREIGN KEY ("source_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destination_branch_id_fkey" FOREIGN KEY ("destination_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audits" ADD CONSTRAINT "stock_audits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audit_items" ADD CONSTRAINT "stock_audit_items_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "stock_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_consumable_mappings" ADD CONSTRAINT "service_consumable_mappings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_consumable_mappings" ADD CONSTRAINT "service_consumable_mappings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plan_branches" ADD CONSTRAINT "membership_plan_branches_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plan_branches" ADD CONSTRAINT "membership_plan_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_benefits" ADD CONSTRAINT "membership_benefits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_benefits" ADD CONSTRAINT "membership_benefits_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_benefits" ADD CONSTRAINT "membership_benefits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_purchase_branch_id_fkey" FOREIGN KEY ("purchase_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "customer_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage" ADD CONSTRAINT "membership_usage_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "customer_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage" ADD CONSTRAINT "membership_usage_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_usage" ADD CONSTRAINT "membership_usage_usage_branch_id_fkey" FOREIGN KEY ("usage_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_branches" ADD CONSTRAINT "package_branches_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_branches" ADD CONSTRAINT "package_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "service_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_purchase_branch_id_fkey" FOREIGN KEY ("purchase_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_customer_package_id_fkey" FOREIGN KEY ("customer_package_id") REFERENCES "customer_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_package_service_id_fkey" FOREIGN KEY ("package_service_id") REFERENCES "package_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_credits" ADD CONSTRAINT "package_credits_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_customer_package_id_fkey" FOREIGN KEY ("customer_package_id") REFERENCES "customer_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_package_credit_id_fkey" FOREIGN KEY ("package_credit_id") REFERENCES "package_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_stylist_id_fkey" FOREIGN KEY ("stylist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_redemptions" ADD CONSTRAINT "package_redemptions_redemption_branch_id_fkey" FOREIGN KEY ("redemption_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_station_type_id_fkey" FOREIGN KEY ("station_type_id") REFERENCES "station_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_subscriptions" ADD CONSTRAINT "branch_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_subscriptions" ADD CONSTRAINT "branch_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "branch_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "branch_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "subscription_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "branch_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
