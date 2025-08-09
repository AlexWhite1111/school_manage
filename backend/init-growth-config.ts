// init-growth-config.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 初始化Growth配置数据...');

  // 创建默认的Growth配置
  const defaultConfig = await prisma.growthConfig.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      description: '默认卡尔曼滤波器配置，适用于一般教学场景',
      processNoise: 0.1,
      initialUncertainty: 10.0,
      timeDecayFactor: 0.01,
      minObservations: 3,
      maxDaysBetween: 30,
      isActive: true
    }
  });

  console.log('✅ 默认配置创建成功:', defaultConfig);

  // 创建中学配置
  const middleSchoolConfig = await prisma.growthConfig.upsert({
    where: { name: 'middle_school' },
    update: {},
    create: {
      name: 'middle_school',
      description: '中学阶段专用配置，适合青春期学生特点',
      processNoise: 0.15,
      initialUncertainty: 12.0,
      timeDecayFactor: 0.015,
      minObservations: 4,
      maxDaysBetween: 25,
      isActive: false
    }
  });

  console.log('✅ 中学配置创建成功:', middleSchoolConfig);

  // 创建高中配置
  const highSchoolConfig = await prisma.growthConfig.upsert({
    where: { name: 'high_school' },
    update: {},
    create: {
      name: 'high_school',
      description: '高中阶段专用配置，注重学业压力下的成长追踪',
      processNoise: 0.08,
      initialUncertainty: 8.0,
      timeDecayFactor: 0.008,
      minObservations: 5,
      maxDaysBetween: 20,
      isActive: false
    }
  });

  console.log('✅ 高中配置创建成功:', highSchoolConfig);

  console.log('🎉 Growth配置初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });