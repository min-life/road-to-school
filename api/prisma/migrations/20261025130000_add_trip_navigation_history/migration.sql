ALTER TABLE "trips" ADD COLUMN "navigation_state" JSONB;

CREATE TABLE "trip_location_points" (
    "trip_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" TEXT NOT NULL,
    CONSTRAINT "trip_location_points_pkey" PRIMARY KEY ("trip_id", "sequence")
);

ALTER TABLE "trip_location_points" ADD CONSTRAINT "trip_location_points_trip_id_fkey"
FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
