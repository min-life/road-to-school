ALTER TABLE "schools"
  ADD COLUMN "province_id" TEXT,
  ADD COLUMN "ward_id" TEXT,
  ADD COLUMN "ward" TEXT;

ALTER TABLE "students"
  ADD COLUMN "province_id" TEXT,
  ADD COLUMN "ward_id" TEXT,
  ADD COLUMN "ward" TEXT;
