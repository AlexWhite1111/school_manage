-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" INTEGER;

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_school_idx" ON "customers"("school");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at");

-- CreateIndex
CREATE INDEX "customers_status_created_at_idx" ON "customers"("status", "created_at");

-- CreateIndex
CREATE INDEX "parents_name_idx" ON "parents"("name");

-- CreateIndex
CREATE INDEX "parents_phone_idx" ON "parents"("phone");

-- CreateIndex
CREATE INDEX "parents_customer_id_idx" ON "parents"("customer_id");

-- CreateIndex
CREATE INDEX "tags_deleted_at_idx" ON "tags"("deleted_at");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
