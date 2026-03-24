-- Remove variant_group column from service_variants table
-- Variant groups are being removed to simplify the variant system

ALTER TABLE "service_variants" DROP COLUMN "variant_group";
