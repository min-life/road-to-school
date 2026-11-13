ALTER TABLE "trip_attendances" ADD COLUMN "rfid_boarding_scan_id" UUID, ADD COLUMN "rfid_alighting_scan_id" UUID;
CREATE UNIQUE INDEX "trip_attendances_rfid_boarding_scan_id_key" ON "trip_attendances"("rfid_boarding_scan_id");
CREATE UNIQUE INDEX "trip_attendances_rfid_alighting_scan_id_key" ON "trip_attendances"("rfid_alighting_scan_id");
