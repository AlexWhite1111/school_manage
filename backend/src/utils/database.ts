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
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// 在开发环境中将实例保存到全局变量
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 