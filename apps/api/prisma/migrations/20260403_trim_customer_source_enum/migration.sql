-- Update any existing rows with removed values to 'manual'
UPDATE "customers" SET "source" = 'manual' WHERE "source" NOT IN ('manual', 'phone');

-- Drop the default before changing the type (PostgreSQL can't auto-cast defaults)
ALTER TABLE "customers" ALTER COLUMN "source" DROP DEFAULT;

-- Recreate enum with only valid values
ALTER TYPE "CustomerSource" RENAME TO "CustomerSource_old";
CREATE TYPE "CustomerSource" AS ENUM ('manual', 'phone');
ALTER TABLE "customers" ALTER COLUMN "source" TYPE "CustomerSource" USING "source"::text::"CustomerSource";
ALTER TABLE "customers" ALTER COLUMN "source" SET DEFAULT 'manual';
DROP TYPE "CustomerSource_old";
