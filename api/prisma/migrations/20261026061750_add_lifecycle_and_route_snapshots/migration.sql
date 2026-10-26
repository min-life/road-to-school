-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "RoutePlanStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "routing_constraints" JSONB;

-- AlterTable
ALTER TABLE "student_update_requests" ADD COLUMN     "resolution" JSONB;

-- AlterTable
ALTER TABLE "trip_attendances" ADD COLUMN     "excluded_at" TIMESTAMP(3),
ADD COLUMN     "exclusion_reason" VARCHAR(500);

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "route_snapshot" JSONB;
