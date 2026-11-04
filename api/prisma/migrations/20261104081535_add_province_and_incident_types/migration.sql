-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TripIncidentType" ADD VALUE 'NO_GUARDIAN_AT_STOP';
ALTER TYPE "TripIncidentType" ADD VALUE 'TRAFFIC_DELAY';
ALTER TYPE "TripIncidentType" ADD VALUE 'GPS_SIGNAL_LOST';

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "province" VARCHAR(100);

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "province" VARCHAR(100);
