-- Remove unused online booking fields from services and combo_services tables
-- These fields are not used since there is no online booking platform yet

-- Drop columns from services table
ALTER TABLE "services" DROP COLUMN IF EXISTS "is_popular";
ALTER TABLE "services" DROP COLUMN IF EXISTS "is_featured";
ALTER TABLE "services" DROP COLUMN IF EXISTS "is_online_bookable";
ALTER TABLE "services" DROP COLUMN IF EXISTS "skill_level_required";
ALTER TABLE "services" DROP COLUMN IF EXISTS "hsn_sac_code";
ALTER TABLE "services" DROP COLUMN IF EXISTS "assistant_commission_value";

-- Drop columns from combo_services table
ALTER TABLE "combo_services" DROP COLUMN IF EXISTS "is_featured";
ALTER TABLE "combo_services" DROP COLUMN IF EXISTS "is_online_bookable";
