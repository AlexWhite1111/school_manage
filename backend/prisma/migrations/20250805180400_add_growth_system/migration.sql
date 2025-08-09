-- CreateEnum
CREATE TYPE "TagSentiment" AS ENUM ('正面', '负面');

-- AlterTable
ALTER TABLE "growth_logs" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "recorded_by_id" INTEGER,
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "defaultWeight" INTEGER,
ADD COLUMN     "isGrowthTag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sentiment" "TagSentiment";

-- CreateTable
CREATE TABLE "growth_states" (
    "id" TEXT NOT NULL,
    "enrollment_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "level" DOUBLE PRECISION NOT NULL,
    "trend" DOUBLE PRECISION NOT NULL,
    "covarianceMatrix" JSONB NOT NULL,
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "totalObservations" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "growth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "processNoise" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "initialUncertainty" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "timeDecayFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "minObservations" INTEGER NOT NULL DEFAULT 3,
    "maxDaysBetween" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "growth_states_enrollment_id_idx" ON "growth_states"("enrollment_id");

-- CreateIndex
CREATE INDEX "growth_states_tag_id_idx" ON "growth_states"("tag_id");

-- CreateIndex
CREATE INDEX "growth_states_last_updated_at_idx" ON "growth_states"("last_updated_at");

-- CreateIndex
CREATE INDEX "growth_states_confidence_idx" ON "growth_states"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "growth_states_enrollment_id_tag_id_key" ON "growth_states"("enrollment_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "growth_configs_name_key" ON "growth_configs"("name");

-- CreateIndex
CREATE INDEX "growth_configs_isActive_idx" ON "growth_configs"("isActive");

-- CreateIndex
CREATE INDEX "growth_logs_enrollment_id_idx" ON "growth_logs"("enrollment_id");

-- CreateIndex
CREATE INDEX "growth_logs_tag_id_idx" ON "growth_logs"("tag_id");

-- CreateIndex
CREATE INDEX "growth_logs_created_at_idx" ON "growth_logs"("created_at");

-- CreateIndex
CREATE INDEX "growth_logs_recorded_by_id_idx" ON "growth_logs"("recorded_by_id");

-- CreateIndex
CREATE INDEX "tags_isGrowthTag_idx" ON "tags"("isGrowthTag");

-- CreateIndex
CREATE INDEX "tags_sentiment_idx" ON "tags"("sentiment");

-- AddForeignKey
ALTER TABLE "growth_logs" ADD CONSTRAINT "growth_logs_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_states" ADD CONSTRAINT "growth_states_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "class_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_states" ADD CONSTRAINT "growth_states_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
