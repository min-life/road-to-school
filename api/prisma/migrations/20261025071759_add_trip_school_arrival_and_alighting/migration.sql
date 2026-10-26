-- AlterTable
ALTER TABLE "trip_attendances" ADD COLUMN     "alighted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "arrived_at_school_at" TIMESTAMP(3);
