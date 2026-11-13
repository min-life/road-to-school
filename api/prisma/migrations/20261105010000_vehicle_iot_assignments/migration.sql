CREATE TABLE "vehicle_iot_assignments" (
 "id" TEXT NOT NULL,
 "vehicle_id" TEXT NOT NULL,
 "device_id" VARCHAR(128) NOT NULL,
 "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "released_at" TIMESTAMPTZ(3),
 "assigned_by_id" TEXT NOT NULL,
 "released_by_id" TEXT,
 "reason" VARCHAR(500),
 "release_reason" VARCHAR(500),
 CONSTRAINT "vehicle_iot_assignments_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "vehicle_iot_assignment_time_check" CHECK ("released_at" IS NULL OR "released_at" >= "assigned_at"),
 CONSTRAINT "vehicle_iot_assignments_vehicle_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "vehicle_iot_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "vehicle_iot_assignments_released_by_fkey" FOREIGN KEY ("released_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "vehicle_iot_assignments_active_device_key" ON "vehicle_iot_assignments"("device_id") WHERE "released_at" IS NULL;
CREATE UNIQUE INDEX "vehicle_iot_assignments_active_vehicle_key" ON "vehicle_iot_assignments"("vehicle_id") WHERE "released_at" IS NULL;
CREATE INDEX "vehicle_iot_assignments_device_id_assigned_at_idx" ON "vehicle_iot_assignments"("device_id", "assigned_at" DESC);
CREATE INDEX "vehicle_iot_assignments_vehicle_id_assigned_at_idx" ON "vehicle_iot_assignments"("vehicle_id", "assigned_at" DESC);
