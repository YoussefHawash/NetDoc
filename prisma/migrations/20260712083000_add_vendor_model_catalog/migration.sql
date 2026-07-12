-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DeviceModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceModel_name_key" ON "DeviceModel"("name");

-- Backfill Vendor/DeviceModel from the existing free-text values on Device,
-- so this data is carried forward into the new lookup tables instead of lost.
INSERT INTO "Vendor" (id, name)
SELECT gen_random_uuid()::text, v
FROM (SELECT DISTINCT "vendor" AS v FROM "Device" WHERE "vendor" IS NOT NULL AND "vendor" <> '') t;

INSERT INTO "DeviceModel" (id, name)
SELECT gen_random_uuid()::text, m
FROM (SELECT DISTINCT "model" AS m FROM "Device" WHERE "model" IS NOT NULL AND "model" <> '') t;

-- AlterTable
ALTER TABLE "Device" ADD COLUMN "vendorId" TEXT,
ADD COLUMN     "deviceModelId" TEXT;

-- Link each device to its migrated Vendor/DeviceModel row via the old text value
UPDATE "Device" d SET "vendorId" = v.id FROM "Vendor" v WHERE d."vendor" = v."name";
UPDATE "Device" d SET "deviceModelId" = m.id FROM "DeviceModel" m WHERE d."model" = m."name";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "model",
DROP COLUMN "os",
DROP COLUMN "purchaseDate",
DROP COLUMN "vendor",
DROP COLUMN "warrantyExpiry";

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_deviceModelId_fkey" FOREIGN KEY ("deviceModelId") REFERENCES "DeviceModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
