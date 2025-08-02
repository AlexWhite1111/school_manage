-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
