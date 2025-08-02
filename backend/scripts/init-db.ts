// scripts/init-db.ts
// 数据库初始化脚本 - 只创建生产环境必需的基础数据

import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function initDatabase() {
  console.log('🔧 开始数据库初始化...');

  try {
    // 1. 创建默认管理员账号
    const defaultPassword = '123456';
    const hashedPassword = await hash(defaultPassword, 10);

    // 创建超级管理员
    const superAdmin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        displayName: '超级管理员',
        passwordHash: hashedPassword,
        phone: '15000000001',
        role: UserRole.SUPER_ADMIN,
        mustChangePassword: true // 生产环境必须修改密码
      },
    });

    console.log('✅ 超级管理员账号创建完成:', superAdmin.username);

    // 2. 创建预定义标签
    const predefinedTags = [
      // Family Portrait Tags
      { text: '全职妈妈', type: 'FAMILY_JOB' },
      { text: '双职工家庭', type: 'FAMILY_JOB' },
      { text: '自由职业', type: 'FAMILY_JOB' },
      { text: '企业高管', type: 'FAMILY_JOB' },
      { text: '公务员', type: 'FAMILY_JOB' },
      { text: '中等收入', type: 'FAMILY_INCOME' },
      { text: '高收入', type: 'FAMILY_INCOME' },
      { text: '经济压力较大', type: 'FAMILY_INCOME' },
      { text: '应试导向', type: 'FAMILY_EDUCATION_CONCEPT' },
      { text: '素质教育', type: 'FAMILY_EDUCATION_CONCEPT' },
      { text: '兴趣优先', type: 'FAMILY_EDUCATION_CONCEPT' },
      { text: '重视全面发展', type: 'FAMILY_EDUCATION_CONCEPT' },
      { text: '成绩提升', type: 'FAMILY_FOCUS' },
      { text: '习惯养成', type: 'FAMILY_FOCUS' },
      { text: '心理健康', type: 'FAMILY_FOCUS' },
      { text: '特长发展', type: 'FAMILY_FOCUS' },
      { text: '母亲主导', type: 'FAMILY_ROLE' },
      { text: '父亲主导', type: 'FAMILY_ROLE' },
      { text: '父母平衡', type: 'FAMILY_ROLE' },
      { text: '隔代抚养', type: 'FAMILY_ROLE' },
      { text: '外向', type: 'CHILD_PERSONALITY' },
      { text: '内向', type: 'CHILD_PERSONALITY' },
      { text: '敏感', type: 'CHILD_PERSONALITY' },
      { text: '独立', type: 'CHILD_PERSONALITY' },
      { text: '依赖', type: 'CHILD_PERSONALITY' },
      { text: '优异', type: 'CHILD_ACADEMIC_LEVEL' },
      { text: '中等', type: 'CHILD_ACADEMIC_LEVEL' },
      { text: '需提升', type: 'CHILD_ACADEMIC_LEVEL' },
      { text: '偏科', type: 'CHILD_ACADEMIC_LEVEL' },
      { text: '自律性强', type: 'CHILD_DISCIPLINE' },
      { text: '需督促', type: 'CHILD_DISCIPLINE' },
      { text: '易分心', type: 'CHILD_DISCIPLINE' },
      { text: '主动性高', type: 'CHILD_DISCIPLINE' },
      // Student Growth Tags
      { text: '演草工整', type: 'GROWTH_POSITIVE' },
      { text: '主动提问', type: 'GROWTH_POSITIVE' },
      { text: '按时完成作业', type: 'GROWTH_POSITIVE' },
      { text: '积极参与讨论', type: 'GROWTH_POSITIVE' },
      { text: '课前预习', type: 'GROWTH_POSITIVE' },
      { text: '作业整洁', type: 'GROWTH_POSITIVE' },
      { text: '主动帮助同学', type: 'GROWTH_POSITIVE' },
      { text: '作业拖拉', type: 'GROWTH_NEGATIVE' },
      { text: '上课走神', type: 'GROWTH_NEGATIVE' },
      { text: '作业不整洁', type: 'GROWTH_NEGATIVE' },
      { text: '缺乏主动性', type: 'GROWTH_NEGATIVE' },
      { text: '容易分心', type: 'GROWTH_NEGATIVE' },
      { text: '不按时完成作业', type: 'GROWTH_NEGATIVE' },
      { text: '课堂参与度低', type: 'GROWTH_NEGATIVE' },
      { text: '依赖他人', type: 'GROWTH_NEGATIVE' },
      { text: '情绪波动大', type: 'GROWTH_NEGATIVE' },
      { text: '缺乏自信', type: 'GROWTH_NEGATIVE' },
    ];

    let tagCount = 0;
    for (const tag of predefinedTags) {
      await prisma.tag.upsert({
        where: { text_type: { text: tag.text, type: tag.type as any } },
        update: {},
        create: {
          text: tag.text,
          type: tag.type as any,
          isPredefined: true,
        },
      });
      tagCount++;
    }
    console.log(`✅ 预定义标签创建完成 (${tagCount}个)`);

    // 3. 创建基础班级（可选，根据需要调整）
    const basicClasses = [
      '数学基础班',
      '语文阅读班', 
      '英语强化班'
    ];

    let classCount = 0;
    for (const className of basicClasses) {
      await prisma.class.upsert({
        where: { name: className },
        update: {},
        create: {
          name: className,
        },
      });
      classCount++;
    }
    console.log(`✅ 基础班级创建完成 (${classCount}个)`);

    console.log('\n🎉 数据库初始化完成！');
    console.log('📝 初始化内容:');
    console.log('  👤 管理员账号: admin (密码: 123456)');
    console.log(`  🏷️  预定义标签: ${tagCount}个`);
    console.log(`  🏫 基础班级: ${classCount}个`);
    console.log('\n⚠️  重要提醒: 请在生产环境中立即修改管理员密码！');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase()
    .catch((e) => {
      console.error('❌ 初始化失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default initDatabase; 