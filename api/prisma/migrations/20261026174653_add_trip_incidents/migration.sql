-- CreateEnum
CREATE TYPE "TripIncidentType" AS ENUM ('ATTENDANT_MISSING', 'DRIVER_MISSING', 'OFF_ROUTE', 'LATE_STOP');

-- CreateEnum
CREATE TYPE "TripIncidentStatus" AS ENUM ('WAITING_ASSIGNMENT', 'WAITING_CONFIRMATION', 'RESOLVED', 'CONFIRMED', 'CLOSED');

-- CreateTable
CREATE TABLE "trip_incidents" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "type" "TripIncidentType" NOT NULL,
    "status" "TripIncidentStatus" NOT NULL,
    "reported_by_id" TEXT,
    "description" TEXT,
    "context" JSONB,
    "dedupe_key" TEXT NOT NULL,
    "processed_by_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "resolution" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_incidents_dedupe_key_key" ON "trip_incidents"("dedupe_key");

-- CreateIndex
CREATE INDEX "trip_incidents_trip_id_created_at_idx" ON "trip_incidents"("trip_id", "created_at");

-- CreateIndex
CREATE INDEX "trip_incidents_status_created_at_idx" ON "trip_incidents"("status", "created_at");

-- AddForeignKey
ALTER TABLE "trip_incidents" ADD CONSTRAINT "trip_incidents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_incidents" ADD CONSTRAINT "trip_incidents_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_incidents" ADD CONSTRAINT "trip_incidents_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
