-- CreateEnum
CREATE TYPE "LeaveNoticeKind" AS ENUM ('STUDENT', 'DRIVER', 'BUS_ATTENDANT');

-- CreateEnum
CREATE TYPE "LeaveNoticeStatus" AS ENUM ('RECORDED', 'PENDING_REPLACEMENT', 'REPLACED', 'WITHDRAWN', 'TRIP_CANCELLED');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'LEAVE_NOTICE';

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by_id" TEXT;

-- CreateTable
CREATE TABLE "leave_notices" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "kind" "LeaveNoticeKind" NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "student_id" TEXT,
    "otp_challenge_id" TEXT NOT NULL,
    "status" "LeaveNoticeStatus" NOT NULL DEFAULT 'RECORDED',
    "replacement_user_id" TEXT,
    "processed_by_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "attendance_before" JSONB,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_notices_otp_challenge_id_key" ON "leave_notices"("otp_challenge_id");

-- CreateIndex
CREATE INDEX "leave_notices_trip_id_status_idx" ON "leave_notices"("trip_id", "status");

-- CreateIndex
CREATE INDEX "leave_notices_student_id_status_idx" ON "leave_notices"("student_id", "status");

-- CreateIndex
CREATE INDEX "leave_notices_reported_by_id_status_idx" ON "leave_notices"("reported_by_id", "status");

-- CreateIndex
CREATE INDEX "leave_notices_status_created_at_idx" ON "leave_notices"("status", "created_at");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_notices" ADD CONSTRAINT "leave_notices_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_notices" ADD CONSTRAINT "leave_notices_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_notices" ADD CONSTRAINT "leave_notices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_notices" ADD CONSTRAINT "leave_notices_otp_challenge_id_fkey" FOREIGN KEY ("otp_challenge_id") REFERENCES "otp_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_notices" ADD CONSTRAINT "leave_notices_replacement_user_id_fkey" FOREIGN KEY ("replacement_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_notices" ADD CONSTRAINT "leave_notices_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_notices" ADD CONSTRAINT "leave_notices_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreatePartialIndexes for active notices to prevent duplicate active notices while allowing re-reporting after WITHDRAWN
CREATE UNIQUE INDEX "unique_active_student_leave_notice" ON "leave_notices" ("trip_id", "student_id") WHERE "status" IN ('RECORDED', 'PENDING_REPLACEMENT');
CREATE UNIQUE INDEX "unique_active_staff_leave_notice" ON "leave_notices" ("trip_id", "kind") WHERE "kind" IN ('DRIVER', 'BUS_ATTENDANT') AND "status" = 'PENDING_REPLACEMENT';

