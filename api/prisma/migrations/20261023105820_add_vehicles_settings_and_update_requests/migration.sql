-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('INFORMATION_UPDATE', 'ADDRESS_UPDATE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'STUDENT_UPDATE_REQUEST';

-- AlterTable
ALTER TABLE "otp_challenges" ADD COLUMN     "payload_hash" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_public_id" TEXT;

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "seat_count" INTEGER NOT NULL,
    "license_plate" VARCHAR(20) NOT NULL,
    "normalized_plate" VARCHAR(20) NOT NULL,
    "color" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "key" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_update_requests" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "before_data" JSONB NOT NULL,
    "proposed_data" JSONB NOT NULL,
    "rejection_reason" VARCHAR(500),
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_update_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_normalized_plate_key" ON "vehicles"("normalized_plate");

-- CreateIndex
CREATE INDEX "vehicles_brand_idx" ON "vehicles"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "student_update_requests_school_id_status_idx" ON "student_update_requests"("school_id", "status");

-- CreateIndex
CREATE INDEX "student_update_requests_student_id_status_idx" ON "student_update_requests"("student_id", "status");

-- CreateIndex
CREATE INDEX "student_update_requests_parent_id_status_idx" ON "student_update_requests"("parent_id", "status");

-- CreateIndex
CREATE INDEX "student_update_requests_type_status_idx" ON "student_update_requests"("type", "status");

-- CreateIndex
CREATE INDEX "student_update_requests_created_at_idx" ON "student_update_requests"("created_at");

-- AddForeignKey
ALTER TABLE "student_update_requests" ADD CONSTRAINT "student_update_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_update_requests" ADD CONSTRAINT "student_update_requests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_update_requests" ADD CONSTRAINT "student_update_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_update_requests" ADD CONSTRAINT "student_update_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: Enforce exactly one PENDING request per student per type (Section 1.4)
CREATE UNIQUE INDEX "student_update_requests_single_pending_per_type_idx" ON "student_update_requests"("student_id", "type") WHERE "status" = 'PENDING';

