/*
  Warnings:

  - The values [super_admin,manager,teacher,student] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `customer_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isFirstLogin` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[linkedCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicId` to the `customers` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `customers` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'TEACHER', 'STUDENT');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_customer_id_fkey";

-- DropIndex
DROP INDEX "users_customer_id_key";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "publicId" TEXT NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "customer_id",
DROP COLUMN "isFirstLogin",
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "linkedCustomerId" INTEGER,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "uuid" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'STUDENT',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_uuid_key" ON "customers"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "customers_publicId_key" ON "customers"("publicId");

-- CreateIndex
CREATE INDEX "customers_uuid_idx" ON "customers"("uuid");

-- CreateIndex
CREATE INDEX "customers_publicId_idx" ON "customers"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_linkedCustomerId_key" ON "users"("linkedCustomerId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_linkedCustomerId_fkey" FOREIGN KEY ("linkedCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
