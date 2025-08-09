-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('日常测验', '周测', '月考', '期中考试', '期末考试');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('学习情况', '行为表现', '作业完成', '意见建议', '问题投诉', '表扬感谢');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('待处理', '已分配', '处理中', '等待回复', '已解决', '已升级', '已关闭');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('一般', '重要', '紧急');

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL,
    "examDate" DATE NOT NULL,
    "totalScore" DOUBLE PRECISION DEFAULT 100,
    "description" TEXT,
    "class_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" INTEGER,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_scores" (
    "id" SERIAL NOT NULL,
    "score" DOUBLE PRECISION,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "subject" "Subject" NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "enrollment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_score_tags" (
    "exam_score_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_score_tags_pkey" PRIMARY KEY ("exam_score_id","tag_id")
);

-- CreateTable
CREATE TABLE "parent_feedbacks" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT '待处理',
    "priority" "Priority" NOT NULL DEFAULT '重要',
    "student_id" INTEGER NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT,
    "assigned_to_id" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_replies" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "feedback_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_tags" (
    "feedback_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_tags_pkey" PRIMARY KEY ("feedback_id","tag_id")
);

-- CreateIndex
CREATE INDEX "exams_class_id_idx" ON "exams"("class_id");

-- CreateIndex
CREATE INDEX "exams_examDate_idx" ON "exams"("examDate");

-- CreateIndex
CREATE INDEX "exams_deleted_at_idx" ON "exams"("deleted_at");

-- CreateIndex
CREATE INDEX "exam_scores_exam_id_idx" ON "exam_scores"("exam_id");

-- CreateIndex
CREATE INDEX "exam_scores_enrollment_id_idx" ON "exam_scores"("enrollment_id");

-- CreateIndex
CREATE INDEX "exam_scores_subject_idx" ON "exam_scores"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "exam_scores_exam_id_enrollment_id_subject_key" ON "exam_scores"("exam_id", "enrollment_id", "subject");

-- CreateIndex
CREATE INDEX "parent_feedbacks_student_id_idx" ON "parent_feedbacks"("student_id");

-- CreateIndex
CREATE INDEX "parent_feedbacks_status_idx" ON "parent_feedbacks"("status");

-- CreateIndex
CREATE INDEX "parent_feedbacks_priority_idx" ON "parent_feedbacks"("priority");

-- CreateIndex
CREATE INDEX "parent_feedbacks_created_at_idx" ON "parent_feedbacks"("created_at");

-- CreateIndex
CREATE INDEX "parent_feedbacks_assigned_to_id_idx" ON "parent_feedbacks"("assigned_to_id");

-- CreateIndex
CREATE INDEX "feedback_replies_feedback_id_idx" ON "feedback_replies"("feedback_id");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "class_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_score_tags" ADD CONSTRAINT "exam_score_tags_exam_score_id_fkey" FOREIGN KEY ("exam_score_id") REFERENCES "exam_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_score_tags" ADD CONSTRAINT "exam_score_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_feedbacks" ADD CONSTRAINT "parent_feedbacks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_feedbacks" ADD CONSTRAINT "parent_feedbacks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_feedbacks" ADD CONSTRAINT "parent_feedbacks_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_replies" ADD CONSTRAINT "feedback_replies_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "parent_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_replies" ADD CONSTRAINT "feedback_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_tags" ADD CONSTRAINT "feedback_tags_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "parent_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_tags" ADD CONSTRAINT "feedback_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
