// src/services/tag.service.ts
// 该文件包含管理标签（包括预定义、全局自定义和个人自定义标签）的业务逻辑。

import { PrismaClient, Tag, TagType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @description 获取标签列表，支持按类型筛选和用户筛选
 * @param type - 标签类型 (e.g., FAMILY_JOB, GROWTH_POSITIVE)
 * @param userId - 用户ID，用于获取包含该用户个人标签的列表
 * @param includeDeleted - 是否包含已删除的标签，默认false
 * @returns {Promise<Tag[]>} - 返回标签对象数组
 */
export const getTags = async (type?: TagType, userId?: number, includeDeleted: boolean = false): Promise<Tag[]> => {
  try {
    // 1. 构建查询条件
    const whereClause: any = {
      OR: [
        { isPredefined: true }, // 预定义标签（所有人可见）
        { isPersonal: false },  // 非个人标签（全局自定义标签）
        ...(userId ? [{ isPersonal: true, createdById: userId }] : []) // 当前用户的个人标签
      ]
    };
    
    // 软删除过滤
    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }
    
    if (type) {
      whereClause.type = type;
    }

    // 2. 查询数据库并返回结果
    const tags = await prisma.tag.findMany({
      where: whereClause,
      include: {
        creator: userId ? { // 只在需要时包含创建者信息
          select: { id: true, username: true }
        } : false,
        deletedBy: includeDeleted ? {
          select: { id: true, username: true }
        } : false
      },
      orderBy: [
        { deletedAt: 'asc' },     // 未删除的在前
        { isPredefined: 'desc' }, // 预定义标签在前
        { isPersonal: 'asc' },    // 全局标签在个人标签前
        { type: 'asc' },          // 按类型排序
        { usageCount: 'desc' },   // 按使用次数排序
        { text: 'asc' }           // 最后按文本内容排序
      ]
    });

    const statusText = includeDeleted ? '（包含已删除）' : '';
    console.log(`成功获取标签列表${statusText}，共 ${tags.length} 个标签${type ? `，类型：${type}` : ''}${userId ? `，用户：${userId}` : ''}`);
    return tags;

  } catch (error) {
    console.error('获取标签列表时发生错误:', error);
    throw new Error('获取标签列表失败');
  }
};

/**
 * 软删除个人自定义标签 (仅允许删除 isPersonal=true 且当前用户创建的标签)
 * @param tagId - 标签ID
 * @param userId - 当前用户ID
 */
export const deleteTag = async (tagId: number, userId: number): Promise<void> => {
  try {
    // 1. 验证标签存在且属于当前用户
    const tag = await prisma.tag.findUnique({ 
      where: { id: tagId },
      include: { _count: { select: { growthLogs: true } } }
    });
    
    if (!tag) {
      throw new Error('标签不存在');
    }
    if (!tag.isPersonal || tag.createdById !== userId) {
      throw new Error('无权限删除该标签');
    }
    if (tag.deletedAt) {
      throw new Error('标签已被删除');
    }

    // 2. 执行软删除
    await prisma.tag.update({
      where: { id: tagId },
      data: {
        deletedAt: new Date(),
        deletedById: userId
      }
    });

    console.log(`成功软删除标签: ${tag.text} (ID: ${tagId}), 删除者: ${userId}`);

  } catch (error) {
    console.error('软删除标签时发生错误:', error);
    throw error;
  }
};

/**
 * 恢复已删除的标签
 * @param tagId - 标签ID
 * @param userId - 当前用户ID
 */
export const restoreTag = async (tagId: number, userId: number): Promise<void> => {
  try {
    // 1. 验证标签存在且属于当前用户
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    
    if (!tag) {
      throw new Error('标签不存在');
    }
    if (!tag.isPersonal || tag.createdById !== userId) {
      throw new Error('无权限恢复该标签');
    }
    if (!tag.deletedAt) {
      throw new Error('标签未被删除');
    }

    // 2. 检查是否存在同名未删除的标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        text: tag.text,
        type: tag.type,
        isPersonal: true,
        createdById: userId,
        deletedAt: null,
        id: { not: tagId }
      }
    });

    if (existingTag) {
      throw new Error('已存在同名的未删除标签，无法恢复');
    }

    // 3. 恢复标签
    await prisma.tag.update({
      where: { id: tagId },
      data: {
        deletedAt: null,
        deletedById: null
      }
    });

    console.log(`成功恢复标签: ${tag.text} (ID: ${tagId}), 操作者: ${userId}`);

  } catch (error) {
    console.error('恢复标签时发生错误:', error);
    throw error;
  }
};

/**
 * 永久删除标签（硬删除）- 谨慎使用
 * @param tagId - 标签ID
 * @param userId - 当前用户ID
 */
export const permanentDeleteTag = async (tagId: number, userId: number): Promise<void> => {
  try {
    // 1. 验证标签存在且属于当前用户
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    
    if (!tag) {
      throw new Error('标签不存在');
    }
    if (!tag.isPersonal || tag.createdById !== userId) {
      throw new Error('无权限永久删除该标签');
    }

    // 2. 检查是否被成长记录使用
    const usedCount = await prisma.growthLog.count({ where: { tagId } });
    if (usedCount > 0) {
      throw new Error('该标签已被使用，无法永久删除');
    }

    // 3. 永久删除
    await prisma.tag.delete({ where: { id: tagId } });

    console.log(`成功永久删除标签: ${tag.text} (ID: ${tagId}), 操作者: ${userId}`);

  } catch (error) {
    console.error('永久删除标签时发生错误:', error);
    throw error;
  }
};

/**
 * @description 创建一个新的自定义标签
 * @param text - 标签的文本内容
 * @param type - 标签的类型
 * @param userId - 创建者用户ID
 * @param isPersonal - 是否为个人标签，默认true
 * @returns {Promise<Tag>} - 返回新创建的标签对象
 */
export const createTag = async (
  text: string, 
  type: TagType, 
  userId: number, 
  isPersonal: boolean = true
): Promise<Tag> => {
  try {
    // 输入验证
    if (!text || !text.trim()) {
      throw new Error('标签文本不能为空');
    }

    if (!type) {
      throw new Error('标签类型不能为空');
    }

    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    // 去除首尾空白字符
    const trimmedText = text.trim();

    // 检查是否已存在相同的未删除标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        text: trimmedText,
        type: type,
        deletedAt: null, // 只检查未删除的标签
        ...(isPersonal 
          ? { isPersonal: true, createdById: userId }  // 个人标签：检查该用户是否已有同名标签
          : { isPersonal: false }                      // 全局标签：检查是否有同名的全局标签
        )
      }
    });

    if (existingTag) {
      throw new Error(isPersonal ? '您已创建过相同的个人标签' : '该全局标签已存在');
    }

    // 创建新标签
    const newTag = await prisma.tag.create({
      data: {
        text: trimmedText,
        type: type,
        isPredefined: false,
        isPersonal: isPersonal,
        createdById: userId,
        usageCount: 0
      },
      include: {
        creator: {
          select: { id: true, username: true }
        }
      }
    });

    console.log(`成功创建${isPersonal ? '个人' : '全局'}自定义标签: "${trimmedText}" (类型: ${type}, ID: ${newTag.id}, 创建者: ${userId})`);
    
    return newTag;

  } catch (error) {
    console.error('创建标签时发生错误:', error);
    
    // 处理重复标签错误
    if (error instanceof Error && (error.message.includes('已创建过') || error.message.includes('已存在'))) {
      throw error;
    }
    
    // 处理自定义错误消息
    if (error instanceof Error && ['标签文本不能为空', '标签类型不能为空', '用户ID不能为空'].includes(error.message)) {
      throw error;
    }
    
    throw new Error('创建标签失败');
  }
};

/**
 * @description 增加标签使用计数
 * @param tagId - 标签ID
 * @returns {Promise<void>}
 */
export const incrementTagUsage = async (tagId: number): Promise<void> => {
  try {
    await prisma.tag.update({
      where: { id: tagId },
      data: { usageCount: { increment: 1 } }
    });
  } catch (error) {
    console.error(`增加标签${tagId}使用计数失败:`, error);
    // 不抛出错误，避免影响主业务流程
  }
};

/**
 * @description 减少标签使用计数
 * @param tagId - 标签ID
 * @returns {Promise<void>}
 */
export const decrementTagUsage = async (tagId: number): Promise<void> => {
  try {
    await prisma.tag.update({
      where: { id: tagId },
      data: { usageCount: { decrement: 1 } }
    });
  } catch (error) {
    console.error(`减少标签${tagId}使用计数失败:`, error);
    // 不抛出错误，避免影响主业务流程
  }
};

/**
 * @description 清理使用次数少于指定数量的个人自定义标签
 * @param minUsageCount - 最小使用次数阈值，默认为2
 * @returns {Promise<number>} - 返回清理的标签数量
 */
export const cleanupUnusedPersonalTags = async (minUsageCount: number = 2): Promise<number> => {
  try {
    // 查找使用次数少于阈值的个人自定义标签（仅软删除）
    const unusedTags = await prisma.tag.findMany({
      where: {
        isPersonal: true,
        isPredefined: false,
        usageCount: { lt: minUsageCount },
        deletedAt: null // 只清理未删除的标签
      },
      select: { id: true, text: true, createdById: true }
    });

    if (unusedTags.length === 0) {
      return 0;
    }

    // 软删除这些标签
    const updateResult = await prisma.tag.updateMany({
      where: {
        id: { in: unusedTags.map(tag => tag.id) }
      },
      data: {
        deletedAt: new Date(),
        deletedById: null // 系统清理，无具体操作者
      }
    });

    console.log(`自动清理了 ${updateResult.count} 个使用次数少于 ${minUsageCount} 的个人自定义标签`);
    return updateResult.count;

  } catch (error) {
    console.error('清理未使用个人标签时发生错误:', error);
    throw new Error('清理未使用个人标签失败');
  }
};

/**
 * @description 获取用户的个人自定义标签统计
 * @param userId - 用户ID
 * @param includeDeleted - 是否包含已删除的标签统计
 * @returns {Promise<object>} - 返回统计信息
 */
export const getUserTagStats = async (userId: number, includeDeleted: boolean = false) => {
  try {
    const whereClause: any = {
      isPersonal: true,
      createdById: userId
    };

    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }

    const stats = await prisma.tag.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { usageCount: true },
      where: whereClause
    });

    // 如果包含已删除的标签，还要统计删除的数量
    let deletedStats = {};
    if (includeDeleted) {
      const deletedCount = await prisma.tag.count({
        where: {
          isPersonal: true,
          createdById: userId,
          deletedAt: { not: null }
        }
      });
      deletedStats = { deletedCount };
    }

    return {
      totalPersonalTags: stats.reduce((sum, stat) => sum + stat._count.id, 0),
      totalUsage: stats.reduce((sum, stat) => sum + (stat._sum.usageCount || 0), 0),
      byType: stats.reduce((acc, stat) => {
        acc[stat.type] = {
          count: stat._count.id,
          usage: stat._sum.usageCount || 0
        };
        return acc;
      }, {} as Record<string, { count: number; usage: number }>),
      ...deletedStats
    };
  } catch (error) {
    console.error('获取用户标签统计时发生错误:', error);
    throw new Error('获取用户标签统计失败');
  }
}; 