-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "admin_finalization" JSONB;

-- CreateTable
CREATE TABLE "school_scheduled_changes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "effective_date" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "applied_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "last_error" TEXT,

    CONSTRAINT "school_scheduled_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_calendar_entries" (
    "id" TEXT NOT NULL,
    "school_id" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "calendar" TEXT NOT NULL,
    "recurrence" TEXT NOT NULL,
    "year" INTEGER,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "leap_month" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TEXT,
    "end_time" TEXT,
    "status" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "service_calendar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_scheduled_changes_school_id_type_effective_date_idx" ON "school_scheduled_changes"("school_id", "type", "effective_date");

-- CreateIndex
CREATE INDEX "school_scheduled_changes_status_effective_date_idx" ON "school_scheduled_changes"("status", "effective_date");

-- CreateIndex
CREATE INDEX "service_calendar_entries_school_id_status_idx" ON "service_calendar_entries"("school_id", "status");

-- CreateIndex
CREATE INDEX "service_calendar_entries_kind_calendar_recurrence_year_idx" ON "service_calendar_entries"("kind", "calendar", "recurrence", "year");

-- AddForeignKey
ALTER TABLE "school_scheduled_changes" ADD CONSTRAINT "school_scheduled_changes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_scheduled_changes" ADD CONSTRAINT "school_scheduled_changes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_calendar_entries" ADD CONSTRAINT "service_calendar_entries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_calendar_entries" ADD CONSTRAINT "service_calendar_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_calendar_entries" ADD CONSTRAINT "service_calendar_entries_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
