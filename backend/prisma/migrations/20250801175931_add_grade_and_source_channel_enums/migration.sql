/*
  Warnings:

  - The `grade` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sourceChannel` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('CHU_YI', 'CHU_ER', 'CHU_SAN', 'GAO_YI', 'GAO_ER', 'GAO_SAN');

-- CreateEnum
CREATE TYPE "SourceChannel" AS ENUM ('JIAZHANG_TUIJIAN', 'PENGYOU_QINQI', 'XUESHENG_SHEJIAO', 'GUANGGAO_CHUANDAN', 'DITUI_XUANCHUAN', 'WEIXIN_GONGZHONGHAO', 'DOUYIN', 'QITA_MEITI', 'HEZUO', 'QITA');

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "grade",
ADD COLUMN     "grade" "Grade",
DROP COLUMN "sourceChannel",
ADD COLUMN     "sourceChannel" "SourceChannel";
