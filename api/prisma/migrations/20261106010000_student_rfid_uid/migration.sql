ALTER TABLE "students" ADD COLUMN "rfid_card_uid" VARCHAR(14);
CREATE UNIQUE INDEX "students_rfid_card_uid_key" ON "students"("rfid_card_uid");
ALTER TABLE "students" ADD CONSTRAINT "student_rfid_uid_format" CHECK ("rfid_card_uid" IS NULL OR "rfid_card_uid" ~ '^([0-9A-F]{8}|[0-9A-F]{14})$');
ALTER TABLE "students" ADD CONSTRAINT "disabled_student_no_rfid" CHECK ("status" <> 'DISABLED' OR "rfid_card_uid" IS NULL);
