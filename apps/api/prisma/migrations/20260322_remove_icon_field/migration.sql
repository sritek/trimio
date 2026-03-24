-- Remove unused icon field from ServiceCategory and StationType tables

-- Drop icon column from service_categories
ALTER TABLE "service_categories" DROP COLUMN IF EXISTS "icon";

-- Drop icon column from station_types
ALTER TABLE "station_types" DROP COLUMN IF EXISTS "icon";
