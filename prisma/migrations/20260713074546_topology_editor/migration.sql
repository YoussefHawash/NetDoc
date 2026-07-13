-- CreateEnum
CREATE TYPE "TopologyShapeType" AS ENUM ('circle', 'label');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "onCanvas" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TopologyShape" (
    "id" TEXT NOT NULL,
    "type" "TopologyShapeType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "text" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopologyShape_pkey" PRIMARY KEY ("id")
);

-- Backfill: keep devices that were already arranged under the old manual
-- topology canvas (nonzero position, or already cabled) visible on the
-- new canvas instead of silently dropping them into the palette.
UPDATE "Device"
SET "onCanvas" = true
WHERE "positionX" != 0
   OR "positionY" != 0
   OR "id" IN (SELECT "deviceAId" FROM "Connection")
   OR "id" IN (SELECT "deviceBId" FROM "Connection");
