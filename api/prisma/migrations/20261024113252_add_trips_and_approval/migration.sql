-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "RoutePlanStatus" ADD VALUE 'ACTIVE';

-- AlterTable
ALTER TABLE "route_plans" ADD COLUMN     "activated_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" TEXT;

-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "default_bus_attendant_id" TEXT,
ADD COLUMN     "default_driver_id" TEXT;

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "service_date" DATE NOT NULL,
    "direction" "RouteDirection" NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_start_at" TIMESTAMP(3),
    "scheduled_end_at" TIMESTAMP(3),
    "scheduled_start_time" VARCHAR(10),
    "scheduled_end_time" VARCHAR(10),
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "assigned_vehicle_id" TEXT NOT NULL,
    "assigned_driver_id" TEXT NOT NULL,
    "assigned_bus_attendant_id" TEXT NOT NULL,
    "cancellation_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_school_id_service_date_idx" ON "trips"("school_id", "service_date");

-- CreateIndex
CREATE INDEX "trips_assigned_driver_id_service_date_idx" ON "trips"("assigned_driver_id", "service_date");

-- CreateIndex
CREATE INDEX "trips_assigned_bus_attendant_id_service_date_idx" ON "trips"("assigned_bus_attendant_id", "service_date");

-- CreateIndex
CREATE INDEX "trips_assigned_vehicle_id_service_date_idx" ON "trips"("assigned_vehicle_id", "service_date");

-- CreateIndex
CREATE INDEX "trips_status_service_date_idx" ON "trips"("status", "service_date");

-- CreateIndex
CREATE UNIQUE INDEX "trips_route_id_service_date_key" ON "trips"("route_id", "service_date");

-- CreateIndex
CREATE INDEX "routes_default_driver_id_idx" ON "routes"("default_driver_id");

-- CreateIndex
CREATE INDEX "routes_default_bus_attendant_id_idx" ON "routes"("default_bus_attendant_id");

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_default_driver_id_fkey" FOREIGN KEY ("default_driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_default_bus_attendant_id_fkey" FOREIGN KEY ("default_bus_attendant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assigned_vehicle_id_fkey" FOREIGN KEY ("assigned_vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assigned_driver_id_fkey" FOREIGN KEY ("assigned_driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assigned_bus_attendant_id_fkey" FOREIGN KEY ("assigned_bus_attendant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
