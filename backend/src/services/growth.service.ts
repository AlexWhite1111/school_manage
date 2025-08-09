// src/services/growth.service.ts
import { prisma } from '../utils/database';
// 导入卡尔曼滤波器服务
import * as KalmanService from './kalman.service';


// 在文件顶部添加缓存层
const tagCache = new Map<number, any>();
const configCache = new Map<string, any>();
let configCacheExpiry = 0;

// 清除缓存的工具函数
const clearTagCache = () => tagCache.clear();
const clearConfigCache = () => {
  configCache.clear();
  configCacheExpiry = 0;
};

// 获取标签信息（带缓存）
const getCachedTag = async (tagId: number) => {
  if (tagCache.has(tagId)) {
    return tagCache.get(tagId);
  }
  
  const tag = await prisma.tag.findUnique({
    where: { id: tagId, deletedAt: null }
  });
  
  if (tag) {
    tagCache.set(tagId, tag);
  }
  
  return tag;
};

// 获取配置信息（带缓存）
const getCachedConfig = async () => {
  const now = Date.now();
  if (configCache.has('active') && now < configCacheExpiry) {
    return configCache.get('active');
  }
  
  const config = await getActiveGrowthConfig();
  configCache.set('active', config);
  configCacheExpiry = now + 5 * 60 * 1000; // 5分钟缓存
  
  return config;
};

// ================================
// 类型定义
// ================================

interface GrowthTagFilters {
  sentiment?: 'POSITIVE' | 'NEGATIVE';
  search?: string;
  isActive?: boolean;
  orderBy?: 'usageCount' | 'createdAt' | 'text';
  order?: 'asc' | 'desc';
}

interface GrowthTagCreateData {
  text: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  defaultWeight: number;
  description?: string;
}

interface GrowthTagUpdateData {
  text?: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE';
  defaultWeight?: number;
  isActive?: boolean;
}

interface GrowthLogCreateData {
  enrollmentId: number;
  tagId: number;
  weight?: number;
  context?: string;
}

interface GrowthLogFilters {
  enrollmentId?: number;
  tagId?: number;
  startDate?: string;
  endDate?: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE';
  classId?: number;
  minWeight?: number;
  maxWeight?: number;
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'weight';
  order?: 'asc' | 'desc';
}

interface GrowthChartFilters {
  tagId?: number;
  period?: 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  includeConfidence?: boolean;
  dataPoints?: number;
}

interface QuickStudentFilters {
  classId?: number;
  search?: string;
  limit?: number;
  includeInactive?: boolean;
  hasGrowthData?: boolean;
  orderBy?: 'name' | 'recentActivity' | 'enrollmentDate';
  order?: 'asc' | 'desc';
}

interface GrowthConfigData {
  name: string;
  description?: string;
  processNoise: number;
  initialUncertainty: number;
  timeDecayFactor: number;
  minObservations: number;
  maxDaysBetween: number;
}

interface GrowthConfigUpdateData {
  name?: string;
  description?: string;
  processNoise?: number;
  initialUncertainty?: number;
  timeDecayFactor?: number;
  minObservations?: number;
  maxDaysBetween?: number;
}

// ================================
// Growth标签管理服务
// ================================

/**
 * @description 获取Growth标签列表，支持筛选和搜索
 * @param {GrowthTagFilters} filters - 筛选条件
 * @returns {Promise<any[]>} Growth标签列表包含使用统计
 * @throws {Error} 查询失败时抛出错误
 */
export const getGrowthTags = async (filters: GrowthTagFilters): Promise<any[]> => {
  try {
    console.log('🔍 获取Growth标签列表:', filters);
    
    // 暂时用类型过滤来筛选Growth标签，直到Prisma客户端更新
    const whereConditions: any = {
      type: {
        in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE']
      },
      deletedAt: null
    };

    // 搜索功能
    if (filters.search && filters.search.length >= 2) {
      whereConditions.text = {
        contains: filters.search,
        mode: 'insensitive'
      };
    }

    // 查询Growth类型的标签
    const tags = await prisma.tag.findMany({
      where: whereConditions,
      orderBy: filters.orderBy === 'text' ? { text: filters.order } : 
               filters.orderBy === 'createdAt' ? { id: filters.order } :
               { usageCount: filters.order }
    });

    // 获取今日、本周、本月的时间范围
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 为每个标签计算使用统计
    const result = await Promise.all(tags.map(async tag => {
      // 查询该标签的使用统计和实际字段
      const [todayCount, thisWeekCount, thisMonthCount, tagDetails] = await Promise.all([
        prisma.growthLog.count({
          where: {
            tagId: tag.id,
            createdAt: { gte: today }
          }
        }),
        prisma.growthLog.count({
          where: {
            tagId: tag.id,
            createdAt: { gte: thisWeekStart }
          }
        }),
        prisma.growthLog.count({
          where: {
            tagId: tag.id,
            createdAt: { gte: thisMonthStart }
          }
        }),
        // 查询defaultWeight和sentiment字段
        // 使用 Prisma 读取，避免原生 SQL 带来的枚举映射差异
        prisma.tag.findUnique({
          where: { id: tag.id },
          select: { defaultWeight: true, sentiment: true }
        })
      ]);

      const defaultWeight = tagDetails?.defaultWeight ?? 5;
      const sentiment = (tagDetails?.sentiment as 'POSITIVE' | 'NEGATIVE' | null) ||
        (tag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE');

      return {
        id: tag.id,
        text: tag.text,
        sentiment: sentiment,
        defaultWeight: defaultWeight, // 使用数据库中的实际默认权重
        usageCount: tag.usageCount,
        type: tag.type,
        description: null,
        createdAt: new Date().toISOString(), // TODO: 使用实际创建时间（需要添加字段）
        updatedAt: new Date().toISOString(), // TODO: 使用实际更新时间（需要添加字段）
        isActive: tag.deletedAt === null,
        isGrowthTag: true, // Growth标签
        recentUsage: {
          today: todayCount,
          thisWeek: thisWeekCount,
          thisMonth: thisMonthCount
        }
      };
    }));

    console.log(`✅ 获取到 ${result.length} 个Growth标签`);
    return result;
    
  } catch (error) {
    console.error('获取Growth标签列表失败:', error);
    throw error;
  }
};

/**
 * @description 创建新的Growth标签
 * 
 * 🔧 优化内容：
 * - 使用事务确保数据一致性
 * - 直接在create中设置所有字段，避免分步操作
 * - 统一返回格式与getGrowthTags保持一致
 * 
 * @param {GrowthTagCreateData} data - 标签创建数据
 * @returns {Promise<any>} 创建的完整标签对象
 * @throws {Error} 标签名称已存在或创建失败时抛出错误
 */
export const createGrowthTag = async (data: GrowthTagCreateData): Promise<any> => {
  try {
    console.log('📝 创建Growth标签:', data);
    
    // 根据sentiment自动设置type
    const tagType = data.sentiment === 'POSITIVE' ? 'GROWTH_POSITIVE' : 'GROWTH_NEGATIVE';
    
    // 检查标签名称是否已存在
    const existingTag = await prisma.tag.findFirst({
      where: {
        text: data.text,
        type: tagType,
        deletedAt: null
      }
    });

    if (existingTag) {
      throw new Error(`标签名称"${data.text}"已存在`);
    }

    // 使用事务创建完整的Growth标签，避免分步操作导致的数据不一致
    const newTag = await prisma.$transaction(async (tx) => {
      return await tx.tag.create({
        data: {
          text: data.text.trim(),
          type: tagType,
          sentiment: data.sentiment,
          defaultWeight: data.defaultWeight,
          isPredefined: true,
          isGrowthTag: true,
          usageCount: 0
        }
      });
    });

    console.log('✅ Growth标签创建成功:', newTag.id);

    // 返回完整的标签对象，格式与getGrowthTags一致
    return {
      id: newTag.id,
      text: newTag.text,
      sentiment: data.sentiment,
      defaultWeight: data.defaultWeight,
      usageCount: 0,
      type: tagType,
      description: data.description || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      isGrowthTag: true,
      recentUsage: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      }
    };
    
  } catch (error) {
    console.error('创建Growth标签失败:', error);
    
    // 处理特定错误类型
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error('标签名称已存在');
    }
    
    throw error;
  }
};

/**
 * @description 更新现有Growth标签信息
 * 
 * 🔧 修复内容：
 * - 修复了条件判断逻辑错误（支持0值）
 * - 删除了冗余的双重更新机制
 * - 添加了事务保护确保数据一致性
 * - 优化了返回值构建逻辑
 * 
 * @param {number} tagId - 标签ID
 * @param {GrowthTagUpdateData} data - 更新数据
 * @returns {Promise<any>} 更新后的完整标签对象
 * @throws {Error} 标签不存在、名称重复或更新失败时抛出错误
 */
export const updateGrowthTag = async (tagId: number, data: GrowthTagUpdateData): Promise<any> => {
  try {
    console.log('📝 更新Growth标签:', { tagId, data });
    
    // 验证标签存在且为Growth标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        type: {
          in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE']
        },
        deletedAt: null
      }
    });

    if (!existingTag) {
      throw new Error('Growth标签不存在或已被删除');
    }

    // 如果要更新标签名称，检查唯一性
    if (data.text && data.text !== existingTag.text) {
      const duplicateTag = await prisma.tag.findFirst({
        where: {
          text: data.text,
          type: existingTag.type,
          deletedAt: null,
          id: { not: tagId }
        }
      });

      if (duplicateTag) {
        throw new Error(`标签名称"${data.text}"已存在`);
      }
    }

    // 使用事务确保数据一致性，统一更新所有字段
    const updatedTag = await prisma.$transaction(async (tx) => {
      // 构建完整的更新数据 - 修复条件判断逻辑
      const updateData: any = {};
      
      // 文本更新（检查undefined而不是truthy值）
      if (data.text !== undefined) {
        updateData.text = data.text.trim();
      }
      
      // 权重更新（支持0值）
      if (data.defaultWeight !== undefined) {
        updateData.defaultWeight = data.defaultWeight;
      }
      
      // 情感极性更新（同时更新type和sentiment字段）
      if (data.sentiment !== undefined) {
        updateData.type = data.sentiment === 'POSITIVE' ? 'GROWTH_POSITIVE' : 'GROWTH_NEGATIVE';
        updateData.sentiment = data.sentiment;
      }
      
      // 状态更新（如果需要）
      if (data.isActive !== undefined) {
        updateData.deletedAt = data.isActive ? null : new Date();
      }

      console.log('📝 更新数据:', { tagId, updateData });

      // 执行统一更新
      const result = await tx.tag.update({
        where: { id: tagId },
        data: updateData
      });

      console.log('✅ 数据库更新成功');
      return result;
    });

    console.log('✅ Growth标签更新成功:', updatedTag.id);

    // 构建完整返回对象 - 使用数据库实际值，避免数据不一致
    const responseData = {
      id: updatedTag.id,
      text: updatedTag.text,
      sentiment: updatedTag.sentiment || (updatedTag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE'),
      defaultWeight: updatedTag.defaultWeight || 5,
      usageCount: updatedTag.usageCount,
      type: updatedTag.type,
      description: null, // TODO: 添加description字段支持
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: updatedTag.deletedAt === null,
      isGrowthTag: true,
      recentUsage: {
        today: 0,    // TODO: 实时统计
        thisWeek: 0, // TODO: 实时统计
        thisMonth: 0 // TODO: 实时统计
      }
    };

    console.log('📤 返回更新后的标签数据:', responseData);
    return responseData;
    
  } catch (error) {
    console.error('更新Growth标签失败:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error('标签不存在');
    }
    
    throw error;
  }
};

/**
 * @description 软删除Growth标签（设置deletedAt字段）
 * @param {number} tagId - 标签ID
 * @returns {Promise<void>}
 * @throws {Error} 删除失败时抛出错误
 */
export const deleteGrowthTag = async (tagId: number): Promise<void> => {
  try {
    console.log('🗑️ 删除Growth标签:', tagId);
    
    // 验证标签存在且为Growth标签
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        type: {
          in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE']
        },
        deletedAt: null
      }
    });

    if (!existingTag) {
      throw new Error('Growth标签不存在或已被删除');
    }

    // 检查标签是否被使用
    const usageCount = await prisma.growthLog.count({
      where: {
        tagId: tagId
      }
    });

    if (usageCount > 0) {
      console.warn(`⚠️ 标签 ${existingTag.text} 已被使用 ${usageCount} 次，仍执行软删除`);
    }

    // 执行软删除 - 设置deletedAt字段
    await prisma.tag.update({
      where: { id: tagId },
      data: {
        deletedAt: new Date()
        // 注意：deletedById字段等Prisma客户端更新后再添加
      }
    });

    console.log('✅ Growth标签软删除成功:', tagId);
    
  } catch (error) {
    console.error('删除Growth标签失败:', error);
    throw error;
  }
};

// ================================
// 成长日志记录服务
// ================================

/**
 * @description 快速记录成长日志 - 5秒快速打标签的核心功能
 * @param {GrowthLogCreateData} data - 成长日志数据
 * @returns {Promise<any>} 创建的成长日志对象包含关联信息
 * @throws {Error} 记录失败时抛出错误
 */
export const recordGrowthLog = async (data: GrowthLogCreateData): Promise<any> => {
  try {
    console.log('📊 记录成长日志:', data);
    
    // 1. 验证enrollmentId存在且学生状态为ENROLLED
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        student: true,
        class: true
      }
    });

    if (!enrollment) {
      throw new Error('班级注册记录不存在');
    }

    if (enrollment.student.status !== 'ENROLLED') {
      throw new Error('学生状态异常，无法记录成长日志');
    }

    // 2. 验证tagId存在且为Growth标签且未删除
    const tag = await prisma.tag.findFirst({
      where: {
        id: data.tagId,
        type: {
          in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE']
        },
        deletedAt: null
      }
    });

    if (!tag) {
      throw new Error('标签不存在、非Growth标签或已被删除');
    }

    // 3. 检查5分钟内重复记录防护
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentLog = await prisma.growthLog.findFirst({
      where: {
        enrollmentId: data.enrollmentId,
        tagId: data.tagId,
        createdAt: {
          gte: fiveMinutesAgo
        }
      }
    });

    if (recentLog) {
      throw new Error('短时间内重复记录，请等待5分钟后再试');
    }

    // 4. 使用默认权重或自定义权重
    const weight = data.weight || tag.defaultWeight || 5;

    // 5. 创建成长日志记录
    const growthLog = await prisma.growthLog.create({
      data: {
        enrollmentId: data.enrollmentId,
        tagId: data.tagId,
        weight: weight,
        notes: data.context
      }
    });

    // 6. 更新标签使用次数
    await prisma.tag.update({
      where: { id: data.tagId },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    // 7. 触发卡尔曼滤波器计算
    try {
      const observation = {
        value: weight,
        timestamp: growthLog.createdAt,
        weight: weight,
        tagSentiment: tag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' as const : 'NEGATIVE' as const
      };
      
      await KalmanService.processGrowthObservation(
        data.enrollmentId,
        data.tagId,
        observation
      );
      
      console.log('✅ 卡尔曼滤波器状态更新成功');
    } catch (kalmanError) {
      console.error('卡尔曼滤波器计算失败:', kalmanError);
      // 不阻断主流程，只记录错误
    }

    console.log('✅ 成长日志记录成功:', growthLog.id);

    // 8. 返回完整的记录信息（使用之前查询的数据）
    return {
      id: growthLog.id,
      createdAt: growthLog.createdAt.toISOString(),
      enrollmentId: growthLog.enrollmentId,
      tagId: growthLog.tagId,
      weight: weight,
      tag: {
        id: tag.id,
        text: tag.text,
        sentiment: tag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE'
      },
      student: {
        id: enrollment.student.id,
        name: enrollment.student.name,
        publicId: enrollment.student.publicId
      },
      class: {
        id: enrollment.class.id,
        name: enrollment.class.name
      }
    };
    
  } catch (error) {
    console.error('记录成长日志失败:', error);
    
    // 处理特定业务错误
    if (error instanceof Error) {
      if (error.message.includes('enrollment') || error.message.includes('班级注册') || error.message.includes('学生状态')) {
        throw new Error('学生不在指定班级或学生状态异常');
      }
      if (error.message.includes('重复记录')) {
        throw new Error('短时间内重复记录（5分钟内）');
      }
      if (error.message.includes('标签')) {
        throw new Error('标签不存在、非Growth标签或已被删除');
      }
    }
    
    throw error;
  }
};

/**
 * @description 批量记录成长日志，提升操作效率
 * @param {GrowthLogCreateData[]} records - 成长日志数组，最多20条
 * @returns {Promise<any>} 批量操作结果包含成功和失败统计
 * @throws {Error} 批量操作失败时抛出错误
 */
export const batchRecordGrowthLogs = async (records: GrowthLogCreateData[]): Promise<any> => {
  try {
    console.log('📊 批量记录成长日志:', { count: records.length });
    
    // 1. 验证记录数量不超过20条
    if (records.length > 20) {
      throw new Error('批量记录数量不能超过20条');
    }

    if (records.length === 0) {
      throw new Error('记录数组不能为空');
    }

    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    // 2. 逐个处理每条记录
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // 重用单条记录的逻辑
        const result = await recordGrowthLog(record);
        
        results.push({
          index: i,
          success: true,
          data: result
        });
        
        successCount++;
        
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
        
        failedCount++;
      }
    }

    console.log(`✅ 批量记录完成: 成功 ${successCount} 条, 失败 ${failedCount} 条`);

    return {
      successCount,
      failedCount,
      results
    };
    
  } catch (error) {
    console.error('批量记录成长日志失败:', error);
    throw error;
  }
};

/**
 * @description 查询成长日志记录，支持多种筛选条件
 * @param {GrowthLogFilters} filters - 查询筛选条件
 * @returns {Promise<any>} 分页的成长日志列表
 * @throws {Error} 查询失败时抛出错误
 */
export const getGrowthLogs = async (filters: GrowthLogFilters): Promise<any> => {
  try {
    console.log('🔍 查询成长日志:', filters);
    
    // 1. 构建where条件
    const whereConditions: any = {};

    // 筛选特定学生
    if (filters.enrollmentId) {
      whereConditions.enrollmentId = filters.enrollmentId;
    }

    // 筛选特定标签
    if (filters.tagId) {
      whereConditions.tagId = filters.tagId;
    }

    // 处理日期范围
    if (filters.startDate || filters.endDate) {
      const createdAtCondition: any = {};
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        createdAtCondition.gte = startDate;
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        // 设置为当天结束时间
        endDate.setHours(23, 59, 59, 999);
        createdAtCondition.lte = endDate;
      }
      
      // 验证日期范围不超过1年
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 365) {
          throw new Error('查询日期范围不能超过1年');
        }
        
        if (start > end) {
          throw new Error('开始日期不能晚于结束日期');
        }
      }
      
      whereConditions.createdAt = createdAtCondition;
    } else {
      // 未指定日期时默认查询最近30天
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereConditions.createdAt = {
        gte: thirtyDaysAgo
      };
    }

    // 处理班级ID筛选（需要通过enrollment关联）
    if (filters.classId) {
      whereConditions.enrollment = {
        classId: filters.classId
      };
    }

    // 2. 分页和排序设置
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    if (filters.orderBy === 'weight') {
      // 暂时跳过weight排序，因为字段未定义
      orderBy.createdAt = filters.order || 'desc';
    } else {
      orderBy.createdAt = filters.order || 'desc';
    }

    // 3. 查询总数
    const total = await prisma.growthLog.count({ where: whereConditions });

    // 4. 执行查询
    const logs = await prisma.growthLog.findMany({
      where: whereConditions,
      include: {
        enrollment: {
          include: {
            student: true,
            class: true
          }
        },
        tag: true
      },
      take: limit,
      skip: skip,
      orderBy: orderBy === 'createdAt' ? { createdAt: filters.order || 'desc' } : { id: filters.order || 'desc' }
    });

    // 5. 批量获取权重数据（优化：一次查询获取所有权重）
    const logIds = logs.map(log => log.id);
    const weightsMap = new Map<number, number>();
    
    if (logIds.length > 0) {
      const weightResults = await prisma.$queryRaw<{id: number, weight: number}[]>`
        SELECT id, weight FROM growth_logs WHERE id = ANY(${logIds})
      `;
      
      weightResults.forEach(result => {
        weightsMap.set(result.id, result.weight);
      });
    }

    // 6. 构建响应数据（无需额外查询）
    const enrichedLogs = logs.map(log => {
      const actualWeight = weightsMap.get(log.id) || 5;

      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        weight: actualWeight,
        tag: {
          id: log.tag?.id,
          text: log.tag?.text,
          sentiment: log.tag?.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE'
        },
        student: {
          id: log.enrollment?.student?.id,
          name: log.enrollment?.student?.name,
          publicId: log.enrollment?.student?.publicId
        },
        class: {
          id: log.enrollment?.class?.id,
          name: log.enrollment?.class?.name
        }
      };
    });

    const totalPages = Math.ceil(total / limit);

    console.log(`✅ 查询到 ${logs.length} 条成长日志记录，总计 ${total} 条`);

    return {
      logs: enrichedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
    
  } catch (error) {
    console.error('查询成长日志失败:', error);
    throw error;
  }
};

// ================================
// 学生成长状态查询服务
// ================================

/**
 * @description 获取指定学生的成长状态概况（按enrollmentId）
 * @param {number} enrollmentId - 班级注册ID
 * @returns {Promise<any>} 学生成长状态概况包含卡尔曼滤波器计算结果
 * @throws {Error} 查询失败时抛出错误
 */
export const getStudentGrowthSummary = async (enrollmentId: number): Promise<any> => {
  try {
    console.log('📈 获取学生成长概况:', enrollmentId);
    
    // 1. 验证enrollmentId存在并获取学生基本信息
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        class: true
      }
    });

    if (!enrollment) {
      throw new Error('班级注册记录不存在');
    }

    // 2. 获取所有Growth类型的标签
    const growthTags = await prisma.tag.findMany({
      where: {
        type: {
          in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE']
        },
        deletedAt: null
      }
    });

    // 3. 获取该学生的所有卡尔曼滤波器状态
    const growthStates = await prisma.growthState.findMany({
      where: {
        enrollmentId: enrollmentId
      },
      include: {
        tag: true
      }
    });

    // 4. 获取该学生的所有成长日志记录（用于统计）
    const growthLogs = await prisma.growthLog.findMany({
      where: {
        enrollmentId: enrollmentId
      },
      include: {
        tag: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 5. 为每个标签构建状态信息
    const states = [];
    let totalPositive = 0;
    let totalNegative = 0;
    let lastActivityDate = null;

    for (const tag of growthTags) {
      // 查找对应的卡尔曼滤波器状态
      const kalmanState = growthStates.find(state => state.tagId === tag.id);
      
      if (kalmanState) {
        // 使用卡尔曼滤波器的真实状态数据
        const trendDirection = await KalmanService.calculateGrowthTrend(enrollmentId, tag.id);
        
        states.push({
          tagId: tag.id,
          tagName: tag.text,
          sentiment: tag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE',
          level: kalmanState.level,
          trend: kalmanState.trend,
          trendDirection: trendDirection,
          confidence: kalmanState.confidence,
          totalObservations: kalmanState.totalObservations,
          lastUpdatedAt: kalmanState.lastUpdatedAt.toISOString()
        });

        // 统计正负面记录
        const tagLogs = growthLogs.filter(log => log.tagId === tag.id);
        if (tag.type === 'GROWTH_POSITIVE') {
          totalPositive += tagLogs.length;
        } else {
          totalNegative += tagLogs.length;
        }

        // 更新最后活动时间
        if (!lastActivityDate || kalmanState.lastUpdatedAt > lastActivityDate) {
          lastActivityDate = kalmanState.lastUpdatedAt;
        }
      } else {
        // 如果没有卡尔曼状态，但有日志记录，则使用简化计算
        const tagLogs = growthLogs.filter(log => log.tagId === tag.id);
        
        if (tagLogs.length > 0) {
          // 简单的状态计算作为后备方案
          const recentLogs = tagLogs.slice(0, 10);
          const averageWeight = tagLogs.reduce((sum, log) => sum + log.weight, 0) / tagLogs.length;
          
          let trendDirection = 'STABLE';
          if (recentLogs.length >= 3) {
            const recent = recentLogs.slice(0, 3).length;
            const older = tagLogs.slice(3, 6).length;
            if (recent > older) {
              trendDirection = tag.type === 'GROWTH_POSITIVE' ? 'UP' : 'DOWN';
            } else if (recent < older) {
              trendDirection = tag.type === 'GROWTH_POSITIVE' ? 'DOWN' : 'UP';
            }
          }

          states.push({
            tagId: tag.id,
            tagName: tag.text,
            sentiment: tag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE',
            level: tagLogs.length * averageWeight,
            trend: recentLogs.length - (tagLogs.length - recentLogs.length),
            trendDirection: trendDirection,
            confidence: Math.min(1.0, tagLogs.length / 10),
            totalObservations: tagLogs.length,
            lastUpdatedAt: tagLogs[0].createdAt.toISOString()
          });

          // 统计正负面记录
          if (tag.type === 'GROWTH_POSITIVE') {
            totalPositive += tagLogs.length;
          } else {
            totalNegative += tagLogs.length;
          }

          // 更新最后活动时间
          if (!lastActivityDate || tagLogs[0].createdAt > lastActivityDate) {
            lastActivityDate = tagLogs[0].createdAt;
          }
        }
      }
    }

    // 6. 计算整体趋势
    let overallTrend = 'STABLE';
    if (states.length > 0) {
      const improvingCount = states.filter(s => 
        s.trendDirection === 'UP' || s.trendDirection === 'IMPROVING'
      ).length;
      const decliningCount = states.filter(s => 
        s.trendDirection === 'DOWN' || s.trendDirection === 'DECLINING'
      ).length;
      
      if (improvingCount > decliningCount) {
        overallTrend = 'IMPROVING';
      } else if (decliningCount > improvingCount) {
        overallTrend = 'DECLINING';
      }
    }

    console.log(`✅ 获取学生成长概况成功: ${states.length} 个标签状态`);

    return {
      student: {
        id: enrollment.student.id,
        name: enrollment.student.name,
        publicId: enrollment.student.publicId,
        grade: enrollment.student.grade
      },
      class: {
        id: enrollment.class.id,
        name: enrollment.class.name
      },
      enrollment: {
        id: enrollment.id,
        enrollmentDate: enrollment.enrollmentDate?.toISOString()
      },
      states,
      overallTrend,
      lastActivityDate: lastActivityDate?.toISOString()
    };
    
  } catch (error) {
    console.error('获取学生成长概况失败:', error);
    
    if (error instanceof Error && error.message.includes('不存在')) {
      throw new Error('学生不存在');
    }
    
    throw error;
  }
};

/**
 * @description 通过学生公开ID获取成长状态概况
 * @param {string} publicId - 学生公开ID
 * @returns {Promise<any>} 学生成长状态概况
 * @throws {Error} 查询失败时抛出错误
 */
export const getStudentGrowthSummaryByPublicId = async (publicId: string): Promise<any> => {
  try {
    console.log('📈 通过publicId获取学生成长概况:', publicId);
    
    // 1. 通过publicId查找学生
    const student = await prisma.customer.findUnique({
      where: { publicId },
      include: {
        enrollments: {
          include: {
            class: true
          }
        }
      }
    });

    if (!student) {
      throw new Error('学生不存在');
    }

    if (student.enrollments.length === 0) {
      throw new Error('学生未注册任何班级');
    }

    // 2. 获取最新的班级注册信息（假设学生可能有多个注册记录）
    const latestEnrollment = student.enrollments.sort((a, b) => 
      (b.enrollmentDate?.getTime() || 0) - (a.enrollmentDate?.getTime() || 0)
    )[0];

    // 3. 调用getStudentGrowthSummary获取详细信息
    return await getStudentGrowthSummary(latestEnrollment.id);
    
  } catch (error) {
    console.error('通过publicId获取学生成长概况失败:', error);
    throw error;
  }
};

/**
 * @description 获取学生成长趋势图表数据
 * @param {number} enrollmentId - 班级注册ID
 * @param {GrowthChartFilters} filters - 图表筛选条件
 * @returns {Promise<any>} 时间序列图表数据包含置信区间
 * @throws {Error} 查询失败时抛出错误
 */
export const getStudentGrowthChart = async (enrollmentId: number, filters: GrowthChartFilters): Promise<any> => {
  try {
    console.log('📊 获取学生成长趋势图:', { enrollmentId, filters });
    
    // 1. 验证enrollmentId存在
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        class: true
      }
    });

    if (!enrollment) {
      throw new Error('班级注册记录不存在');
    }

    // 2. 如果指定了tagId，验证标签是否为Growth标签
    let targetTag = null;
    if (filters.tagId) {
      targetTag = await prisma.tag.findFirst({
        where: {
          id: filters.tagId,
          type: {
            in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE']
          },
          deletedAt: null
        }
      });

      if (!targetTag) {
        throw new Error('指定的标签不存在或非Growth标签');
      }
    }

    // 3. 确定时间范围
    let startDate: Date;
    let endDate: Date = new Date();

    if (filters.startDate && filters.endDate) {
      // 使用自定义日期范围
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
    } else {
      // 使用预设周期
      const period = filters.period || 'month';
      switch (period) {
        case 'week':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // 4. 获取指定时间范围内的成长日志
    const whereConditions: any = {
      enrollmentId: enrollmentId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (filters.tagId) {
      whereConditions.tagId = filters.tagId;
    }

    const growthLogs = await prisma.growthLog.findMany({
      where: whereConditions,
      include: {
        tag: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 5. 使用卡尔曼滤波器生成时间序列数据
    let timeSeriesData: any[] = [];
    
    if (filters.tagId && targetTag) {
      // 单个标签的预测时间序列
      try {
        const predictions = await KalmanService.generateGrowthTimeSeries(
          enrollmentId,
          filters.tagId,
          startDate,
          endDate,
          filters.dataPoints || 30
        );
        
        const dayInterval = (endDate.getTime() - startDate.getTime()) / (predictions.length - 1);
        
        timeSeriesData = predictions.map((prediction, index) => {
          const currentDate = new Date(startDate.getTime() + (index * dayInterval));
          
          // 获取当日实际事件数
          const logsOnDate = growthLogs.filter(log => {
            const logDate = new Date(log.createdAt);
            return logDate.toDateString() === currentDate.toDateString();
          });
          
          return {
            date: currentDate.toISOString().split('T')[0],
            level: prediction.predictedLevel,
            trend: prediction.predictedTrend,
            confidenceUpper: prediction.confidenceInterval.upper,
            confidenceLower: prediction.confidenceInterval.lower,
            actualEvents: logsOnDate.length
          };
        });
        
      } catch (error) {
        console.warn('卡尔曼滤波器预测失败，使用简化计算:', error);
        // 降级到简化计算
        timeSeriesData = generateSimpleTimeSeries(growthLogs, startDate, endDate, filters.dataPoints || 30);
      }
      
    } else {
      // 综合所有标签的数据或简化计算
      timeSeriesData = generateSimpleTimeSeries(growthLogs, startDate, endDate, filters.dataPoints || 30);
    }

    // 6. 获取当前状态信息
    let currentState: any = {
      level: 0,
      trend: 0,
      confidence: 0,
      lastUpdated: new Date().toISOString()
    };

    if (filters.tagId && targetTag) {
      try {
        // 使用卡尔曼滤波器的当前状态
        const kalmanState = await KalmanService.getCurrentGrowthState(enrollmentId, filters.tagId);
        if (kalmanState) {
          const trace = kalmanState.covariance[0][0] + kalmanState.covariance[1][1];
          currentState = {
            level: kalmanState.level,
            trend: kalmanState.trend,
            confidence: Math.max(0, Math.min(1, 1 - trace / 20.0)),
            lastUpdated: growthLogs.length > 0 ? 
              growthLogs[growthLogs.length - 1].createdAt.toISOString() : 
              new Date().toISOString()
          };
        }
      } catch (error) {
        console.warn('获取卡尔曼状态失败，使用简化计算:', error);
        // 使用简化计算作为后备
        if (growthLogs.length > 0) {
          const totalWeightedLevel = growthLogs.reduce((sum, log) => sum + log.weight, 0);
          currentState = {
            level: totalWeightedLevel,
            trend: growthLogs.length / (filters.dataPoints || 30),
            confidence: Math.min(1.0, growthLogs.length / 10),
            lastUpdated: growthLogs[growthLogs.length - 1].createdAt.toISOString()
          };
        }
      }
    } else {
      // 综合数据的简化计算
      if (growthLogs.length > 0) {
        const totalWeightedLevel = growthLogs.reduce((sum, log) => sum + log.weight, 0);
        currentState = {
          level: totalWeightedLevel,
          trend: growthLogs.length / (filters.dataPoints || 30),
          confidence: Math.min(1.0, growthLogs.length / 10),
          lastUpdated: growthLogs[growthLogs.length - 1].createdAt.toISOString()
        };
      }
    }

    // 7. 构建响应数据
    const result = {
      tagId: filters.tagId || null,
      tagName: targetTag?.text || '综合成长',
      sentiment: targetTag ? 
        (targetTag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE') : 
        'POSITIVE',
      timeSeriesData,
      currentState
    };

    console.log(`✅ 生成成长趋势图成功: ${timeSeriesData.length} 个数据点`);
    
    return result;
    
  } catch (error) {
    console.error('获取学生成长趋势图失败:', error);
    throw error;
  }
};

/**
 * @description 生成简化的时间序列数据（后备方案）
 * @param {any[]} growthLogs - 成长日志数据
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @param {number} dataPoints - 数据点数量
 * @returns {any[]} 时间序列数据
 */
const generateSimpleTimeSeries = (growthLogs: any[], startDate: Date, endDate: Date, dataPoints: number): any[] => {
  const dayInterval = (endDate.getTime() - startDate.getTime()) / (dataPoints - 1);
  const timeSeriesData: any[] = [];
  
  for (let i = 0; i < dataPoints; i++) {
    const currentDate = new Date(startDate.getTime() + (i * dayInterval));
    
    // 获取到当前日期为止的所有记录
    const logsBeforeDate = growthLogs.filter(log => log.createdAt <= currentDate);
    const logsOnDate = growthLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate.toDateString() === currentDate.toDateString();
    });
    
    const eventsBeforeDate = logsBeforeDate.length;
    const eventsOnDate = logsOnDate.length;
    
    // 计算加权水平
    let weightedLevel = 0;
    if (eventsBeforeDate > 0) {
      weightedLevel = logsBeforeDate.reduce((sum, log) => sum + log.weight, 0);
    }
    
    const level = weightedLevel;
    const trend = eventsBeforeDate > 0 ? (eventsBeforeDate / (i + 1)) : 0;

    // 简单的置信区间计算
    const confidence = Math.min(1.0, eventsBeforeDate / 10);
    const margin = (1 - confidence) * level * 0.2;

    timeSeriesData.push({
      date: currentDate.toISOString().split('T')[0],
      level: level,
      trend: trend,
      confidenceUpper: level + margin,
      confidenceLower: Math.max(0, level - margin),
      actualEvents: eventsOnDate
    });
  }
  
  return timeSeriesData;
};

// ================================
// 学生个人成长查看服务
// ================================

/**
 * @description 学生查看自己的成长报告
 * @param {number} studentId - 学生ID
 * @param {string} period - 查看周期
 * @returns {Promise<any>} 个人成长报告包含进步分数和排名
 * @throws {Error} 查询失败时抛出错误
 */
export const getStudentPersonalProgress = async (studentId: number, period: string): Promise<any> => {
  try {
    console.log('👤 获取学生个人成长报告:', { studentId, period });
    
    // TODO: 实现个人成长报告生成
    // - 获取学生基本信息和班级信息
    // - 计算时间范围内的正负面事件统计
    // - 计算进步分数（0-100）
    // - 计算班级排名（可选功能）
    // - 识别优势领域和改进领域
    // - 生成最近成就列表
    // - 生成月度趋势数据
    // - 返回学生友好的描述文本
    
    throw new Error('getStudentPersonalProgress: Not implemented yet');
    
  } catch (error) {
    console.error('获取学生个人成长报告失败:', error);
    throw error;
  }
};

/**
 * @description 学生查看自己的成就徽章
 * @param {number} studentId - 学生ID
 * @returns {Promise<any>} 成就徽章列表包含进度信息
 * @throws {Error} 查询失败时抛出错误
 */
export const getStudentBadges = async (studentId: number): Promise<any> => {
  try {
    console.log('🏆 获取学生成就徽章:', studentId);
    
    // TODO: 实现成就徽章系统
    // - 定义徽章规则和条件
    // - 检查已获得的徽章
    // - 计算可获得徽章的进度
    // - 返回徽章列表和进度信息
    
    throw new Error('getStudentBadges: Not implemented yet');
    
  } catch (error) {
    console.error('获取学生成就徽章失败:', error);
    throw error;
  }
};

// ================================
// 系统配置管理服务
// ================================

/**
 * @description 获取当前激活的卡尔曼滤波器配置参数
 * @returns {Promise<any>} 当前激活的配置对象
 * @throws {Error} 查询失败时抛出错误
 */
export const getActiveGrowthConfig = async (): Promise<any> => {
  try {
    console.log('⚙️ 获取当前Growth配置');

    // 1) 获取已激活配置
    const active = await prisma.growthConfig.findFirst({ where: { isActive: true } });
    if (active) {
      console.log('✅ 返回数据库中的激活配置:', active.name);
      return {
        id: active.id,
        name: active.name,
        description: active.description,
        processNoise: active.processNoise,
        initialUncertainty: active.initialUncertainty,
        timeDecayFactor: active.timeDecayFactor,
        minObservations: active.minObservations,
        maxDaysBetween: active.maxDaysBetween,
        isActive: active.isActive,
        createdAt: active.createdAt?.toISOString(),
        updatedAt: active.updatedAt?.toISOString()
      };
    }

    // 2) 若不存在激活配置，则确保存在默认配置并激活
    const existingDefault = await prisma.growthConfig.findFirst({ where: { name: 'default' } });
    const ensured = existingDefault
      ? await prisma.growthConfig.update({ where: { id: existingDefault.id }, data: { isActive: true } })
      : await prisma.growthConfig.create({
          data: {
            name: 'default',
            description: '默认卡尔曼滤波器配置',
            processNoise: 0.1,
            initialUncertainty: 10.0,
            timeDecayFactor: 0.01,
            minObservations: 3,
            maxDaysBetween: 30,
            isActive: true
          }
        });

    console.log('✅ 创建/激活默认Growth配置');
    return {
      id: ensured.id,
      name: ensured.name,
      description: ensured.description,
      processNoise: ensured.processNoise,
      initialUncertainty: ensured.initialUncertainty,
      timeDecayFactor: ensured.timeDecayFactor,
      minObservations: ensured.minObservations,
      maxDaysBetween: ensured.maxDaysBetween,
      isActive: ensured.isActive,
      createdAt: ensured.createdAt?.toISOString(),
      updatedAt: ensured.updatedAt?.toISOString()
    };
  } catch (error) {
    console.error('获取Growth配置失败:', error);
    throw error;
  }
};

/**
 * @description 更新卡尔曼滤波器配置参数
 * @param {string} configId - 配置ID
 * @param {GrowthConfigUpdateData} data - 更新数据
 * @returns {Promise<any>} 更新后的配置对象
 * @throws {Error} 更新失败时抛出错误
 */
export const updateGrowthConfig = async (configId: string, data: GrowthConfigUpdateData): Promise<any> => {
  try {
    console.log('⚙️ 更新Growth配置:', { configId, data });

    // 1) 若传入的是"default"，优先落到当前激活配置
    let targetId = configId;
    if (configId === 'default') {
      const active = await prisma.growthConfig.findFirst({ where: { isActive: true } });
      if (!active) {
        throw new Error('配置不存在');
      }
      targetId = active.id;
    }

    // 2) 读取现有配置
    const current = await prisma.growthConfig.findUnique({ where: { id: targetId } });
    if (!current) {
      throw new Error('配置不存在');
    }

    // 3) 参数校验
    if (data.processNoise !== undefined && (data.processNoise < 0.001 || data.processNoise > 1.0)) {
      throw new Error('过程噪声必须在0.001-1.0之间');
    }
    if (data.initialUncertainty !== undefined && (data.initialUncertainty < 1.0 || data.initialUncertainty > 100.0)) {
      throw new Error('初始不确定性必须在1.0-100.0之间');
    }
    if (data.timeDecayFactor !== undefined && (data.timeDecayFactor < 0.001 || data.timeDecayFactor > 0.1)) {
      throw new Error('时间衰减因子必须在0.001-0.1之间');
    }
    if (data.minObservations !== undefined && (data.minObservations < 1 || data.minObservations > 10)) {
      throw new Error('最少观测次数必须在1-10之间');
    }
    if (data.maxDaysBetween !== undefined && (data.maxDaysBetween < 7 || data.maxDaysBetween > 90)) {
      throw new Error('最大天数间隔必须在7-90之间');
    }

    // 4) 更新
    const updated = await prisma.growthConfig.update({
      where: { id: targetId },
      data: {
        processNoise: data.processNoise ?? current.processNoise,
        initialUncertainty: data.initialUncertainty ?? current.initialUncertainty,
        timeDecayFactor: data.timeDecayFactor ?? current.timeDecayFactor,
        minObservations: data.minObservations ?? current.minObservations,
        maxDaysBetween: data.maxDaysBetween ?? current.maxDaysBetween
      }
    });

    console.log('✅ Growth配置更新成功');

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      processNoise: updated.processNoise,
      initialUncertainty: updated.initialUncertainty,
      timeDecayFactor: updated.timeDecayFactor,
      minObservations: updated.minObservations,
      maxDaysBetween: updated.maxDaysBetween,
      isActive: updated.isActive,
      createdAt: updated.createdAt?.toISOString(),
      updatedAt: updated.updatedAt?.toISOString()
    };
  } catch (error) {
    console.error('更新Growth配置失败:', error);
    if (error instanceof Error && error.message === '配置不存在') {
      throw error;
    }
    throw error;
  }
};

/**
 * @description 创建新的配置方案
 * @param {GrowthConfigData} data - 配置数据
 * @returns {Promise<any>} 创建的配置对象
 * @throws {Error} 创建失败时抛出错误
 */
export const createGrowthConfig = async (data: GrowthConfigData): Promise<any> => {
  try {
    console.log('⚙️ 创建Growth配置:', data);
    
    // 1. 验证参数范围有效性
    if (data.processNoise < 0.001 || data.processNoise > 1.0) {
      throw new Error('过程噪声必须在0.001-1.0之间');
    }
    
    if (data.initialUncertainty < 1.0 || data.initialUncertainty > 100.0) {
      throw new Error('初始不确定性必须在1.0-100.0之间');
    }
    
    if (data.timeDecayFactor < 0.001 || data.timeDecayFactor > 0.1) {
      throw new Error('时间衰减因子必须在0.001-0.1之间');
    }
    
    if (data.minObservations < 1 || data.minObservations > 10) {
      throw new Error('最少观测次数必须在1-10之间');
    }
    
    if (data.maxDaysBetween < 7 || data.maxDaysBetween > 90) {
      throw new Error('最大天数间隔必须在7-90之间');
    }
    
    // 2. 验证配置名称唯一性（暂时只支持在内存中创建）
    if (data.name === 'default') {
      throw new Error('配置名称"default"已存在');
    }
    
    // 3. 创建新配置对象
    const newConfig = {
      id: `config_${Date.now()}`, // 生成简单的ID
      name: data.name,
      description: data.description || '',
      processNoise: data.processNoise,
      initialUncertainty: data.initialUncertainty,
      timeDecayFactor: data.timeDecayFactor,
      minObservations: data.minObservations,
      maxDaysBetween: data.maxDaysBetween,
      isActive: false, // 新配置默认为非激活状态
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ Growth配置创建成功（内存模式）:', newConfig.id);
    
    return newConfig;
    
  } catch (error) {
    console.error('创建Growth配置失败:', error);
    throw error;
  }
};

// ================================
// 辅助查询服务
// ================================

/**
 * @description 快速获取学生列表，用于打标签界面的学生选择
 * @param {QuickStudentFilters} filters - 筛选条件
 * @returns {Promise<any[]>} 学生列表包含最近活动统计
 * @throws {Error} 查询失败时抛出错误
 */
export const getQuickStudentList = async (filters: QuickStudentFilters): Promise<any[]> => {
  try {
    console.log('🔍 获取快速学生列表:', filters);
    
    // TODO: 实现快速学生列表查询
    // - 构建where条件（班级、搜索、状态）
    // - 权限过滤（只返回用户有权查看的学生）
    // - 包含最近7天活动统计
    // - 支持模糊搜索姓名和publicId
    // - 排序和限制数量
    // - 返回简化的学生信息用于快速选择
    
    throw new Error('getQuickStudentList: Not implemented yet');
    
  } catch (error) {
    console.error('获取快速学生列表失败:', error);
    throw error;
  }
};

/**
 * @description 获取班级列表
 * @returns {Promise<any[]>} 班级列表包含学生统计
 * @throws {Error} 查询失败时抛出错误
 */
export const getQuickClassList = async (): Promise<any[]> => {
  try {
    console.log('🔍 获取班级列表');
    
    // TODO: 实现班级列表查询
    // - 查询所有激活的班级
    // - 包含学生数量统计
    // - 包含有成长记录的学生数量
    // - 按名称排序
    // - 返回简化的班级信息
    
    throw new Error('getQuickClassList: Not implemented yet');
    
  } catch (error) {
    console.error('获取班级列表失败:', error);
    throw error;
  }
};

// ================================
// 数据分析与统计服务
// ================================

/**
 * @description 获取班级整体成长分析数据
 * @param {number} classId - 班级ID
 * @param {any} filters - 分析筛选条件
 * @returns {Promise<any>} 班级成长分析报告
 * @throws {Error} 分析失败时抛出错误
 */
export const getClassGrowthAnalytics = async (classId: number, filters: any): Promise<any> => {
  try {
    console.log('📊 获取班级成长分析:', { classId, filters });
    
    // TODO: 实现班级成长分析
    // - 汇总班级内所有学生的成长数据
    // - 计算班级整体趋势
    // - 识别进步最大和需要关注的学生
    // - 分析标签使用分布
    // - 生成时间趋势数据
    // - 返回完整的班级分析报告
    
    throw new Error('getClassGrowthAnalytics: Not implemented yet');
    
  } catch (error) {
    console.error('获取班级成长分析失败:', error);
    throw error;
  }
};

/**
 * @description 获取系统整体概览数据
 * @returns {Promise<any>} 系统概览仪表盘数据
 * @throws {Error} 查询失败时抛出错误
 */
export const getGrowthDashboardOverview = async (): Promise<any> => {
  try {
    console.log('📊 获取Growth系统概览');
    
    // TODO: 实现系统概览数据生成
    // - 统计总体数据（学生数、记录数、班级数）
    // - 计算周增长趋势
    // - 分析最常用标签
    // - 评估系统健康状况
    // - 汇总班级表现排名
    // - 返回仪表盘所需的所有数据
    
    throw new Error('getGrowthDashboardOverview: Not implemented yet');
    
  } catch (error) {
    console.error('获取Growth系统概览失败:', error);
    throw error;
  }
};

// ================================
// 报告导出服务
// ================================

/**
 * @description 导出指定学生的成长报告文件
 * @param {string} publicId - 学生公开ID
 * @param {any} options - 导出选项
 * @returns {Promise<Buffer>} 生成的报告文件
 * @throws {Error} 导出失败时抛出错误
 */
export const exportStudentGrowthReport = async (publicId: string, options: any): Promise<Buffer> => {
  try {
    console.log('📄 导出学生成长报告:', { publicId, options });
    
    // TODO: 实现学生报告导出
    // - 获取学生完整成长数据
    // - 根据格式要求生成PDF或Excel
    // - 包含图表和统计数据
    // - 添加水印和元数据
    // - 返回文件buffer
    
    throw new Error('exportStudentGrowthReport: Not implemented yet');
    
  } catch (error) {
    console.error('导出学生成长报告失败:', error);
    throw error;
  }
};

/**
 * @description 导出班级整体成长报告
 * @param {number} classId - 班级ID
 * @param {any} options - 导出选项
 * @returns {Promise<Buffer>} 生成的报告文件
 * @throws {Error} 导出失败时抛出错误
 */
export const exportClassGrowthReport = async (classId: number, options: any): Promise<Buffer> => {
  try {
    console.log('📄 导出班级成长报告:', { classId, options });
    
    // TODO: 实现班级报告导出
    // - 获取班级整体数据和个人详情
    // - 生成综合分析报告
    // - 包含班级排名和趋势图
    // - 支持不同格式导出
    // - 返回文件buffer
    
    throw new Error('exportClassGrowthReport: Not implemented yet');
    
  } catch (error) {
    console.error('导出班级成长报告失败:', error);
    throw error;
  }
}; 

// ================================
// 系统维护和健康检查功能
// ================================

/**
 * @description 检查成长状态系统健康状况
 * @returns {Promise<any>} 系统健康报告
 * @throws {Error} 检查失败时抛出错误
 */
export const checkGrowthSystemHealth = async (): Promise<any> => {
  try {
    console.log('🔧 检查Growth系统健康状况');
    
    // 1. 统计基础数据
    const [totalStates, totalLogs, totalTags, totalStudents] = await Promise.all([
      prisma.growthState.count(),
      prisma.growthLog.count(),
      prisma.tag.count({
        where: {
          type: { in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE'] },
          deletedAt: null
        }
      }),
      prisma.classEnrollment.count({
        where: {
          student: { status: 'ENROLLED' }
        }
      })
    ]);
    
    // 2. 检查过期状态（超过30天未更新）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const staleStates = await prisma.growthState.count({
      where: {
        lastUpdatedAt: { lt: thirtyDaysAgo }
      }
    });
    
    // 3. 检查置信度分布
    const lowConfidenceStates = await prisma.growthState.count({
      where: {
        confidence: { lt: 0 }
      }
    });
    
    // 4. 计算平均置信度
    const avgConfidenceResult = await prisma.growthState.aggregate({
      _avg: { confidence: true }
    });
    const averageConfidence = avgConfidenceResult._avg.confidence || 0;
    
    // 5. 检查数据质量
    const healthyStates = totalStates - staleStates - lowConfidenceStates;
    const dataQuality = totalStates > 0 ? (healthyStates / totalStates) * 100 : 100;
    
    // 6. 生成建议
    const recommendations: string[] = [];
    
    if (staleStates > totalStates * 0.2) {
      recommendations.push('建议重新计算过期的成长状态');
    }
    
    if (lowConfidenceStates > totalStates * 0.3) {
      recommendations.push('建议增加观测数据以提高置信度');
    }
    
    if (averageConfidence < 0.6) {
      recommendations.push('建议调整卡尔曼滤波器参数');
    }
    
    if (totalLogs < totalStudents * 5) {
      recommendations.push('建议增加成长记录频率');
    }
    
    const report = {
      totalStates,
      healthyStates,
      staleStates,
      lowConfidenceStates: lowConfidenceStates,
      corruptedStates: 0, // 暂时设为0，可以后续添加检查逻辑
      statistics: {
        totalLogs,
        totalTags,
        totalStudents,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        dataQuality: Math.round(dataQuality * 100) / 100
      },
      recommendations
    };
    
    console.log('✅ 系统健康检查完成');
    
    return report;
    
  } catch (error) {
    console.error('系统健康检查失败:', error);
    throw error;
  }
};

/**
 * @description 清理和优化成长状态数据
 * @returns {Promise<any>} 清理结果
 * @throws {Error} 清理失败时抛出错误
 */
export const cleanupGrowthStates = async (): Promise<any> => {
  try {
    console.log('🧹 开始清理Growth状态数据');
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    // 1. 删除孤立的状态记录（对应的enrollment或tag已被删除）
    const orphanedStates = await prisma.growthState.findMany({
      include: {
        enrollment: true,
        tag: true
      }
    });
    
    const orphanedStateIds = orphanedStates
      .filter(state => !state.enrollment || !state.tag)
      .map(state => state.id);
    
    for (const stateId of orphanedStateIds) {
      try {
        await prisma.growthState.delete({
          where: { id: stateId }
        });
        cleanedCount++;
      } catch (error) {
        console.error(`删除孤立状态失败: ${stateId}`, error);
        errorCount++;
      }
    }
    
    // 2. 重置异常的协方差矩阵
    const abnormalStates = await prisma.growthState.findMany({
      where: {
        confidence: { lt: 0 }
      }
    });
    
    for (const state of abnormalStates) {
      try {
        // 重置为默认的协方差矩阵
        await prisma.growthState.update({
          where: { id: state.id },
          data: {
            covarianceMatrix: {
              p11: 10.0,
              p12: 0.0,
              p21: 0.0,
              p22: 10.0
            },
            confidence: 0.1
          }
        });
        cleanedCount++;
      } catch (error) {
        console.error(`重置异常状态失败: ${state.id}`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ 数据清理完成: 清理 ${cleanedCount} 条记录, 错误 ${errorCount} 条`);
    
    return {
      cleanedCount,
      errorCount,
      message: `成功清理 ${cleanedCount} 条异常记录`
    };
    
  } catch (error) {
    console.error('清理Growth状态数据失败:', error);
    throw error;
  }
};

/**
 * @description 批量重新计算指定时间范围内的成长状态
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Promise<number>} 重新计算的状态数量
 * @throws {Error} 重计算失败时抛出错误
 */
export const recalculateGrowthStatesByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<number> => {
  try {
    console.log('🔄 按日期范围重新计算Growth状态:', { startDate, endDate });
    
    // 获取指定时间范围内的成长日志
    const growthLogs = await prisma.growthLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        tag: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // 提取受影响的学生-标签组合
    const affectedCombinations = new Set<string>();
    
    for (const log of growthLogs) {
      const key = `${log.enrollmentId}-${log.tagId}`;
      affectedCombinations.add(key);
    }
    
    // 使用卡尔曼服务重新计算这些组合
    let processedCount = 0;
    
    for (const combination of affectedCombinations) {
      const [enrollmentIdStr, tagIdStr] = combination.split('-');
      const enrollmentId = parseInt(enrollmentIdStr);
      const tagId = parseInt(tagIdStr);
      
      try {
        await KalmanService.recalculateGrowthStates(enrollmentId);
        processedCount++;
      } catch (error) {
        console.error(`重计算失败: ${combination}`, error);
      }
    }
    
    console.log(`✅ 按日期范围重新计算完成: ${processedCount} 个状态`);
    
    return processedCount;
    
  } catch (error) {
    console.error('按日期范围重新计算失败:', error);
    throw error;
  }
};

/**
 * @description 获取成长分析统计信息
 * @returns {Promise<any>} 统计信息
 * @throws {Error} 查询失败时抛出错误
 */
export const getGrowthAnalyticsStats = async (): Promise<any> => {
  try {
    console.log('📊 获取成长分析统计信息');
    
    // 获取时间范围
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 并行查询各种统计数据
    const [
      totalLogs,
      todayLogs,
      weekLogs,
      monthLogs,
      activeStudents,
      topTags,
      avgConfidence
    ] = await Promise.all([
      // 总记录数
      prisma.growthLog.count(),
      
      // 今日记录数
      prisma.growthLog.count({
        where: { createdAt: { gte: today } }
      }),
      
      // 本周记录数
      prisma.growthLog.count({
        where: { createdAt: { gte: thisWeek } }
      }),
      
      // 本月记录数
      prisma.growthLog.count({
        where: { createdAt: { gte: thisMonth } }
      }),
      
      // 活跃学生数（本月有记录的学生）
      prisma.growthLog.groupBy({
        by: ['enrollmentId'],
        where: { createdAt: { gte: thisMonth } }
      }).then(groups => groups.length),
      
      // 最常用标签 Top 5
      prisma.tag.findMany({
        where: {
          type: { in: ['GROWTH_POSITIVE', 'GROWTH_NEGATIVE'] },
          deletedAt: null
        },
        orderBy: { usageCount: 'desc' },
        take: 5,
        select: {
          id: true,
          text: true,
          usageCount: true,
          type: true
        }
      }),
      
      // 平均置信度
      prisma.growthState.aggregate({
        _avg: { confidence: true }
      }).then(result => result._avg.confidence || 0)
    ]);
    
    const stats = {
      overview: {
        totalLogs,
        activeStudents,
        averageConfidence: Math.round(avgConfidence * 100) / 100
      },
      activity: {
        today: todayLogs,
        thisWeek: weekLogs,
        thisMonth: monthLogs,
        weeklyGrowth: weekLogs > 0 ? ((weekLogs - (monthLogs - weekLogs)) / Math.max(1, monthLogs - weekLogs)) * 100 : 0
      },
      topTags: topTags.map(tag => ({
        id: tag.id,
        text: tag.text,
        usageCount: tag.usageCount,
        sentiment: tag.type === 'GROWTH_POSITIVE' ? 'POSITIVE' : 'NEGATIVE'
      })),
      timestamp: now.toISOString()
    };
    
    console.log('✅ 获取成长分析统计信息成功');
    
    return stats;
    
  } catch (error) {
    console.error('获取成长分析统计信息失败:', error);
    throw error;
  }
}; 

export const getStudentPersonalProgressByPublicId = async (publicId: string, period: string): Promise<any> => {
  try {
    // 通过publicId查找学生
    const student = await prisma.customer.findUnique({
      where: { publicId },
      select: { id: true }
    });

    if (!student) {
      throw new Error('学生不存在');
    }

    return getStudentPersonalProgress(student.id, period);
  } catch (error) {
    console.error('通过publicId获取学生个人进度失败:', error);
    throw error;
  }
};

export const getStudentBadgesByPublicId = async (publicId: string): Promise<any> => {
  try {
    // 通过publicId查找学生
    const student = await prisma.customer.findUnique({
      where: { publicId },
      select: { id: true }
    });

    if (!student) {
      throw new Error('学生不存在');
    }

    return getStudentBadges(student.id);
  } catch (error) {
    console.error('通过publicId获取学生徽章失败:', error);
    throw error;
  }
};