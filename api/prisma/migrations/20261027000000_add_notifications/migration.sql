ALTER TABLE "sessions" ADD COLUMN "push_token" TEXT;
CREATE UNIQUE INDEX "sessions_push_token_key" ON "sessions"("push_token");

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "context" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "push_state" TEXT NOT NULL DEFAULT 'NONE',
  "push_attempts" INTEGER NOT NULL DEFAULT 0,
  "push_after_at" TIMESTAMP(3),
  "push_delivery" JSONB,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notifications_user_id_event_key_key" ON "notifications"("user_id", "event_key");
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");
CREATE INDEX "notifications_push_state_push_after_at_idx" ON "notifications"("push_state", "push_after_at");
