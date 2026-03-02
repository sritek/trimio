-- AlterTable
ALTER TABLE "appointment_services" ADD COLUMN     "added_at" TIMESTAMP(3),
ADD COLUMN     "added_by" TEXT,
ADD COLUMN     "added_mid_appointment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "station_id" TEXT;

-- CreateTable
CREATE TABLE "station_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
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

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_station_type_id_fkey" FOREIGN KEY ("station_type_id") REFERENCES "station_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
