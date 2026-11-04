-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "route_plans" ADD COLUMN "needs_reoptimization" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reoptimization_reason" VARCHAR(500);

-- CreateIndex
CREATE INDEX "vehicles_is_active_idx" ON "vehicles"("is_active");

-- CreateIndex
CREATE INDEX "route_plans_needs_reoptimization_idx" ON "route_plans"("needs_reoptimization");
