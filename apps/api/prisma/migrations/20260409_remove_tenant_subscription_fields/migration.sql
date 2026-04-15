-- Remove legacy tenant-level subscription fields
-- These are replaced by branch-level subscriptions

ALTER TABLE "tenants" DROP COLUMN IF EXISTS "subscription_plan";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "subscription_status";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "trial_ends_at";
