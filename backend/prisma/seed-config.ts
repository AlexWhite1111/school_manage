// prisma/seed-config.ts
// 统一配置化的“默认标签”种子：CRM用户画像、考试标签、Growth标签
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertTag(text: string, type: any, extra?: Partial<{ sentiment: any; defaultWeight: number; isGrowthTag: boolean }>) {
  await prisma.tag.upsert({
    where: {
      // 依赖 schema 中 @@unique([text, type]) 的组合唯一键
      text_type: { text, type },
    },
    update: {},
    create: {
      text,
      type,
      isPredefined: true,
      isPersonal: false,
      usageCount: 0,
      ...(extra?.sentiment ? { sentiment: extra.sentiment } : {}),
      ...(extra?.defaultWeight ? { defaultWeight: extra.defaultWeight } : {}),
      ...(extra?.isGrowthTag !== undefined ? { isGrowthTag: extra.isGrowthTag } : {}),
    },
  });
}

async function seedCrmPersonaTags() {
  // 与前端 LeadProfileForm.TAG_CATEGORIES 对齐
  const CRM: Record<string, string[]> = {
    FAMILY_JOB: ['全职妈妈', '双职工家庭', '个体经营', '自由职业', '企业高管', '公务员', '国企/事业单位'],
    FAMILY_INCOME: ['低收入', '中等收入', '高收入', '经济压力较大', '富裕家庭'],
    FAMILY_EDUCATION_CONCEPT: ['应试导向', '素质教育', '兴趣优先', '重视全面发展', '因材施教', '重习惯培养'],
    FAMILY_FOCUS: ['成绩提升', '习惯养成', '心理健康', '特长发展', '综合素质', '升学规划'],
    FAMILY_ROLE: ['母亲主导', '父亲主导', '父母平衡', '隔代抚养', '共同决策'],
    CHILD_PERSONALITY: ['外向', '内向', '敏感', '独立', '依赖', '活泼', '安静', '开朗', '内敛'],
    CHILD_ACADEMIC_LEVEL: ['优异', '中等', '需提升', '偏科', '基础薄弱', '进步明显'],
    CHILD_DISCIPLINE: ['自律性强', '需督促', '易分心', '主动性高', '拖延', '遵守规则', '课堂活跃'],
  };

  for (const [type, texts] of Object.entries(CRM)) {
    for (const text of texts) {
      await upsertTag(text, type as any);
    }
  }
}

async function seedExamTags() {
  const POS = ['审题准确', '步骤规范', '过程严谨', '思路清晰', '时间分配合理', '计算准确', '书写工整', '稳定发挥', '复习到位', '查漏补缺及时'];
  const NEG = ['粗心丢分', '审题不清', '步骤不完整', '思路混乱', '时间不够', '计算错误', '书写不清', '发挥失常', '复习不系统', '知识点遗忘'];
  for (const text of POS) await upsertTag(text, 'EXAM_POSITIVE' as any);
  for (const text of NEG) await upsertTag(text, 'EXAM_NEGATIVE' as any);
}

async function seedGrowthTags() {
  // 与 prisma/seed-growth.ts 的默认标签保持一致（可按需调整）
  const growthPositive = [
    { text: '积极回答问题', weight: 6 },
    { text: '主动帮助同学', weight: 7 },
    { text: '按时完成作业', weight: 5 },
    { text: '课堂表现优秀', weight: 6 },
    { text: '团队合作积极', weight: 6 },
    { text: '创新思维突出', weight: 8 },
    { text: '学习态度认真', weight: 5 },
    { text: '课堂纪律良好', weight: 4 },
    { text: '主动提问', weight: 7 },
    { text: '乐于分享', weight: 6 },
  ];
  const growthNegative = [
    { text: '上课走神', weight: 4 },
    { text: '作业未完成', weight: 6 },
    { text: '课堂捣乱', weight: 8 },
    { text: '迟到早退', weight: 5 },
    { text: '不遵守纪律', weight: 7 },
    { text: '消极应对', weight: 5 },
    { text: '影响他人学习', weight: 8 },
    { text: '缺乏合作精神', weight: 6 },
  ];

  for (const item of growthPositive) {
    await upsertTag(item.text, 'GROWTH_POSITIVE' as any, {
      sentiment: 'POSITIVE' as any,
      defaultWeight: item.weight,
      isGrowthTag: true,
    });
  }
  for (const item of growthNegative) {
    await upsertTag(item.text, 'GROWTH_NEGATIVE' as any, {
      sentiment: 'NEGATIVE' as any,
      defaultWeight: item.weight,
      isGrowthTag: true,
    });
  }
}

async function main() {
  console.log('🌱 开始执行 config-seed（默认标签统一种子）...');
  await seedCrmPersonaTags();
  await seedExamTags();
  await seedGrowthTags();
  console.log('✅ config-seed 完成');
}

main()
  .catch((e) => {
    console.error('❌ config-seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

