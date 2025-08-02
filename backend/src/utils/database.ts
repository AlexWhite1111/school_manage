// src/utils/database.ts
// 统一的数据库客户端实例，避免在多个service中重复创建PrismaClient

import { PrismaClient } from '@prisma/client';

// 创建全局的PrismaClient实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 在开发环境中使用全局变量避免热重载时重复创建连接
// 在生产环境中直接创建新实例
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'], // 减少query日志，提高并发性能
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 优化数据库连接池，支持更多并发连接
  transactionOptions: {
    maxWait: 5000, // 最大等待时间
    timeout: 10000, // 事务超时时间
  },
});

// 在开发环境中将实例保存到全局变量
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 