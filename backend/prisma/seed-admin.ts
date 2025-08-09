/*
 * 简化管理员种子脚本：仅创建/更新一个超级管理员账号
 * 账号: admin  密码: 123456
 */
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = '123456';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      username,
      passwordHash,
      email: 'admin@local',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('✅ 已创建/更新管理员账号: admin / 123456');
}

main()
  .catch((e) => {
    console.error('❌ 创建管理员失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

