/*
  Warnings:

  - The values [am,pm] on the enum `AttendanceSlot` will be removed. If these variants are still used in the database, this will fail.
  - The values [CHU_YI,CHU_ER,CHU_SAN,GAO_YI,GAO_ER,GAO_SAN] on the enum `Grade` will be removed. If these variants are still used in the database, this will fail.
  - The values [JIAZHANG_TUIJIAN,PENGYOU_QINQI,XUESHENG_SHEJIAO,GUANGGAO_CHUANDAN,DITUI_XUANCHUAN,WEIXIN_GONGZHONGHAO,DOUYIN,QITA_MEITI,HEZUO,QITA] on the enum `SourceChannel` will be removed. If these variants are still used in the database, this will fail.
  - The values [family_job,family_income,family_education_concept,family_focus,family_role,child_personality,child_academic_level,child_discipline,growth_positive,growth_negative,exam_positive,exam_negative] on the enum `TagType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUPER_ADMIN,MANAGER,TEACHER,STUDENT] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AttendanceSlot_new" AS ENUM ('上午', '下午');
ALTER TABLE "attendance_records" ALTER COLUMN "timeSlot" TYPE "AttendanceSlot_new" USING ("timeSlot"::text::"AttendanceSlot_new");
ALTER TYPE "AttendanceSlot" RENAME TO "AttendanceSlot_old";
ALTER TYPE "AttendanceSlot_new" RENAME TO "AttendanceSlot";
DROP TYPE "AttendanceSlot_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Grade_new" AS ENUM ('初一', '初二', '初三', '高一', '高二', '高三');
ALTER TABLE "customers" ALTER COLUMN "grade" TYPE "Grade_new" USING ("grade"::text::"Grade_new");
ALTER TYPE "Grade" RENAME TO "Grade_old";
ALTER TYPE "Grade_new" RENAME TO "Grade";
DROP TYPE "Grade_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SourceChannel_new" AS ENUM ('家长推荐', '朋友亲戚', '学生社交圈', '广告传单', '地推宣传', '微信公众号', '抖音', '其他媒体', '合作', '其他');
ALTER TABLE "customers" ALTER COLUMN "sourceChannel" TYPE "SourceChannel_new" USING ("sourceChannel"::text::"SourceChannel_new");
ALTER TYPE "SourceChannel" RENAME TO "SourceChannel_old";
ALTER TYPE "SourceChannel_new" RENAME TO "SourceChannel";
DROP TYPE "SourceChannel_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TagType_new" AS ENUM ('家庭职业', '家庭收入', '家庭教育理念', '家庭关注点', '家庭角色', '孩子性格', '孩子学业水平', '孩子纪律', '成长正面', '成长负面', '考试正面', '考试负面');
ALTER TABLE "tags" ALTER COLUMN "type" TYPE "TagType_new" USING ("type"::text::"TagType_new");
ALTER TYPE "TagType" RENAME TO "TagType_old";
ALTER TYPE "TagType_new" RENAME TO "TagType";
DROP TYPE "TagType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('超级管理员', '管理员', '教师', '学生');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT '学生';
COMMIT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT '学生';
