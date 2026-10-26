-- CreateEnum
CREATE TYPE "RoutePlanStatus" AS ENUM ('DRAFT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteDirection" AS ENUM ('TO_SCHOOL', 'TO_PARKING');

-- CreateEnum
CREATE TYPE "RouteStopType" AS ENUM ('PARKING_START', 'PICKUP', 'SCHOOL_ARRIVAL', 'SCHOOL_DEPARTURE', 'DROPOFF', 'PARKING_END');

-- CreateTable
CREATE TABLE "route_plans" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "RoutePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "schedule_scope" JSONB NOT NULL,
    "routing_constraints" JSONB NOT NULL,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "total_outbound_routes" INTEGER NOT NULL DEFAULT 0,
    "total_return_routes" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_id" TEXT,
    "cancellation_reason" VARCHAR(500),

    CONSTRAINT "route_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "route_plan_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "direction" "RouteDirection" NOT NULL,
    "proposed_vehicle_id" TEXT,
    "total_distance_meters" INTEGER NOT NULL DEFAULT 0,
    "estimated_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "departure_time" VARCHAR(10),
    "arrival_time" VARCHAR(10),
    "polyline_geometry" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "stop_order" INTEGER NOT NULL,
    "stop_type" "RouteStopType" NOT NULL,
    "student_id" TEXT,
    "address_text" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "planned_arrival_seconds" INTEGER,
    "planned_arrival_time" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_plans_school_id_status_idx" ON "route_plans"("school_id", "status");

-- CreateIndex
CREATE INDEX "route_plans_status_created_at_idx" ON "route_plans"("status", "created_at");

-- CreateIndex
CREATE INDEX "routes_route_plan_id_direction_idx" ON "routes"("route_plan_id", "direction");

-- CreateIndex
CREATE INDEX "routes_school_id_direction_idx" ON "routes"("school_id", "direction");

-- CreateIndex
CREATE INDEX "routes_proposed_vehicle_id_idx" ON "routes"("proposed_vehicle_id");

-- CreateIndex
CREATE INDEX "route_stops_route_id_stop_order_idx" ON "route_stops"("route_id", "stop_order");

-- CreateIndex
CREATE INDEX "route_stops_student_id_idx" ON "route_stops"("student_id");

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_route_plan_id_fkey" FOREIGN KEY ("route_plan_id") REFERENCES "route_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_proposed_vehicle_id_fkey" FOREIGN KEY ("proposed_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
