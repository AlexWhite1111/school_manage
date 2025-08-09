// prisma/seed-demo.ts
// 一键生成演示数据：班级2、在读学生20、未报名30、考试50场（含科目成绩）、成长记录1000条
import { PrismaClient, ExamType, Subject, CustomerStatus, Gender, Grade } from '@prisma/client';
import { generateUniquePublicId } from '../src/utils/idGenerator';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUBJECTS: Subject[] = [
  'CHINESE', 'MATH', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'HISTORY', 'GEOGRAPHY', 'POLITICS'
] as Subject[];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDateInRange(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
}

async function main() {
  console.log('🌱 开始创建 Demo 数据...');

  // 0. 管理员用户（作为考试 createdBy 引用）
  const adminPasswordHash = await bcrypt.hash('123456', 12);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash, isActive: true, mustChangePassword: false },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      email: 'admin@school.com',
      role: 'SUPER_ADMIN',
      displayName: '系统管理员',
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 1. 班级 2 个
  const classA = await prisma.class.upsert({ where: { name: '初二(1)班' }, update: {}, create: { name: '初二(1)班' } });
  const classB = await prisma.class.upsert({ where: { name: '初三(2)班' }, update: {}, create: { name: '初三(2)班' } });

  // 2. 在读学生 20 个（平均分配到两个班级）
  const enrollmentIds: number[] = [];
  for (let i = 1; i <= 20; i++) {
    const publicId = await generateUniquePublicId();
    const name = `学生${i.toString().padStart(2, '0')}`;
    const customer = await prisma.customer.create({
      data: {
        name,
        gender: Math.random() > 0.5 ? ('MALE' as Gender) : ('FEMALE' as Gender),
        grade: i <= 10 ? ('CHU_ER' as Grade) : ('CHU_SAN' as Grade),
        status: 'ENROLLED',
        publicId,
        school: '示例中学',
        firstContactDate: new Date(),
        sourceChannel: 'PENGYOU_QINQI'
      }
    });
    const cls = i <= 10 ? classA : classB;
    const enrollment = await prisma.classEnrollment.create({
      data: { studentId: customer.id, classId: cls.id, enrollmentDate: new Date() }
    });
    enrollmentIds.push(enrollment.id);
  }

  // 3. 未报名学生 30 个（潜在/意向/试课）
  const statuses: CustomerStatus[] = ['POTENTIAL', 'INTERESTED', 'TRIAL_CLASS'];
  for (let i = 1; i <= 30; i++) {
    await prisma.customer.create({
      data: {
        name: `意向客户${i.toString().padStart(2, '0')}`,
        gender: Math.random() > 0.5 ? ('MALE' as Gender) : ('FEMALE' as Gender),
        grade: Math.random() > 0.5 ? ('CHU_ER' as Grade) : ('CHU_SAN' as Grade),
        status: randomPick(statuses),
        publicId: await generateUniquePublicId(),
        school: '示例中学',
        firstContactDate: new Date(),
        sourceChannel: 'PENGYOU_QINQI'
      }
    });
  }

  // 4. 考试 50 场（每场覆盖随机 4-6 个科目，记录在读学生成绩）
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const examTypes: ExamType[] = ['DAILY_QUIZ', 'WEEKLY_TEST', 'MONTHLY_EXAM', 'MIDTERM', 'FINAL'];
  for (let i = 1; i <= 50; i++) {
    const cls = i % 2 === 0 ? classA : classB;
    const exam = await prisma.exam.create({
      data: {
        name: `考试${i.toString().padStart(2, '0')}`,
        examType: randomPick(examTypes),
        examDate: getRandomDateInRange(ninetyDaysAgo, now),
        totalScore: 100,
        classId: cls.id,
        createdById: adminUser.id,
      }
    });

    const subjects = [...SUBJECTS].sort(() => Math.random() - 0.5).slice(0, 5);
    const classEnrollments = await prisma.classEnrollment.findMany({ where: { classId: cls.id } });
    for (const s of subjects) {
      for (const enr of classEnrollments) {
        const isAbsent = Math.random() < 0.05;
        const score = isAbsent ? null : Math.floor(40 + Math.random() * 60);
        await prisma.examScore.create({
          data: {
            examId: exam.id,
            enrollmentId: enr.id,
            subject: s,
            score,
            isAbsent
          }
        });
      }
    }
  }

  // 5. 成长记录 1000 条（时间范围近30天，工作日）
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 获取 Growth 正负面标签
  const posTags = await prisma.tag.findMany({ where: { type: 'GROWTH_POSITIVE' } });
  const negTags = await prisma.tag.findMany({ where: { type: 'GROWTH_NEGATIVE' } });
  const allEnrollments = await prisma.classEnrollment.findMany();

  let totalLogs = 0;
  while (totalLogs < 1000) {
    const enr = randomPick(allEnrollments);
    const isPositive = Math.random() < 0.6;
    const tag = randomPick(isPositive ? posTags : negTags);
    let recordDate: Date;
    do {
      recordDate = getRandomDateInRange(thirtyDaysAgo, now);
    } while (recordDate.getDay() === 0 || recordDate.getDay() === 6);

    await prisma.growthLog.create({
      data: {
        enrollmentId: enr.id,
        tagId: tag.id,
        weight: Math.max(1, Math.min(10, Math.floor(3 + Math.random() * 6))),
        createdAt: recordDate
      }
    });
    totalLogs++;
  }

  console.log('✅ Demo 数据创建完成');
  console.log('  - 班级: 2');
  console.log('  - 在读学生: 20');
  console.log('  - 未报名学生: 30');
  console.log('  - 考试: 50 场（含科目成绩）');
  console.log('  - 成长记录: 1000 条');
}

main()
  .catch((e) => { console.error('❌ Demo 种子失败:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

