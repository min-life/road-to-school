-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('UNMARKED', 'PRESENT', 'ABSENT');

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "attendant_ready_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "trip_attendances" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'UNMARKED',
    "absence_reason" VARCHAR(500),
    "marked_by_id" TEXT,
    "marked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_attendances_trip_id_status_idx" ON "trip_attendances"("trip_id", "status");

-- CreateIndex
CREATE INDEX "trip_attendances_student_id_status_idx" ON "trip_attendances"("student_id", "status");

-- CreateIndex
CREATE INDEX "trip_attendances_marked_by_id_idx" ON "trip_attendances"("marked_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_attendances_trip_id_student_id_key" ON "trip_attendances"("trip_id", "student_id");

-- AddForeignKey
ALTER TABLE "trip_attendances" ADD CONSTRAINT "trip_attendances_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_attendances" ADD CONSTRAINT "trip_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_attendances" ADD CONSTRAINT "trip_attendances_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
