// src/services/customer.service.ts
// 该文件包含所有与CRM相关的业务逻辑，如客户档案管理、沟通纪要等。

import { PrismaClient, Customer, CommunicationLog, CustomerStatus, Grade, SourceChannel } from '@prisma/client';
import * as tagService from './tag.service';
import { generateUniquePublicId } from '../utils/idGenerator';

const prisma = new PrismaClient();

// 定义用于创建客户时的数据传输对象 (DTO)
export interface CreateCustomerDto {
  name: string;
  gender?: Customer['gender'];
  birthDate?: string;
  school?: string;
  grade?: string;
  address?: string;
  sourceChannel?: string;
  firstContactDate?: string;
  status?: Customer['status'];
  nextFollowUpDate?: string;
  parents: {
    name: string;
    relationship: string;
    phone: string;
    wechatId?: string;
  }[];
  tags: number[]; // 标签ID数组
}

// 定义用于更新客户时的数据传输对象 (DTO)
export type UpdateCustomerDto = Partial<CreateCustomerDto>;

/**
 * @description 获取客户列表，支持筛选和分页 - 性能优化版本
 * @param filters - 包含筛选条件的对象 (e.g., { status, search, page, limit })
 * @returns {Promise<Customer[]>} - 返回客户对象数组
 */
export const getCustomers = async (filters: { 
  status?: CustomerStatus | CustomerStatus[], 
  search?: string, 
  page?: number, 
  limit?: number,
  unclassed?: boolean,
  excludeClassId?: number
}): Promise<Customer[]> => {
  try {
    const { status, search, page = 1, limit = 50, unclassed, excludeClassId } = filters;
    
    // 1. 构建 Prisma 查询条件，优化性能
    const whereClause: any = {};
    
    // 状态筛选
    if (status) {
      if (Array.isArray(status)) {
        whereClause.status = {
          in: status
        };
      } else {
        whereClause.status = status;
      }
    }
    
    // 优化模糊搜索 - 只在有搜索词时才添加复杂查询
    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause.OR = [
        // 优先搜索主要字段
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          school: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // 次要字段搜索
        {
          address: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          sourceChannel: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          grade: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // 关联表搜索 - 优化查询
        {
          parents: {
            some: {
              OR: [
                {
                  name: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                },
                {
                  phone: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          }
        }
      ];
    }

    // 处理班级筛选逻辑
    if (excludeClassId) {
      // 排除指定班级的学生（但可以包括在其他班级的学生）
      whereClause.enrollments = {
        none: {
          classId: excludeClassId
        }
      };
    } else if (unclassed) {
      // 只返回未加入任何班级的学生
      whereClause.enrollments = {
        none: {}
      };
    }
    
    // 分页逻辑
    const skip = (page - 1) * limit;
    
    // 🚀 性能优化：分离查询，减少不必要的关联
    const customers = await prisma.customer.findMany({
      where: whereClause,
      // 只包含必要的关联数据
      include: {
        parents: {
          select: {
            id: true,
            name: true,
            phone: true,
            relationship: true
          },
          take: 1 // 列表页只显示主要家长
        },
        tags: {
          select: {
            tagId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: skip,
      take: limit
    });
    
    // 转换tags数据格式：提取标签ID
    const transformedCustomers = customers.map(customer => ({
      ...customer,
      tags: customer.tags.map(ct => ct.tagId)
    }));
    
    return transformedCustomers;
    
  } catch (error) {
    console.error('获取客户列表时发生错误:', error);
    throw new Error('获取客户列表失败');
  }
};

/**
 * @description 获取CRM看板的统计数据
 * @returns {Promise<object>} - 返回包含各项统计数据的对象
 */
export const getCustomerStats = async (): Promise<object> => {
  try {
    // 1. 使用 prisma.customer.count 计算总客户数
    const totalCustomers = await prisma.customer.count();

    // 2. 使用 prisma.customer.groupBy 按 status 分组计数
    const statusGroups = await prisma.customer.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // 构建状态计数对象
    const statusCounts: { [key: string]: number } = {};
    
    // 初始化所有状态为0
    const allStatuses = ['POTENTIAL', 'INITIAL_CONTACT', 'INTERESTED', 'TRIAL_CLASS', 'ENROLLED', 'LOST'];
    allStatuses.forEach(status => {
      statusCounts[status] = 0;
    });
    
    // 填入实际计数
    statusGroups.forEach(group => {
      statusCounts[group.status] = group._count.status;
    });

    // 3. 计算本月新增客户数
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyNewCustomers = await prisma.customer.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // 4. 组装并返回统计对象
    const stats = {
      totalCustomers,
      statusCounts,
      monthlyNewCustomers
    };

    console.log('成功获取CRM统计数据:', stats);
    return stats;

  } catch (error) {
    console.error('获取CRM统计数据时发生错误:', error);
    throw new Error('获取CRM统计数据失败');
  }
};

/**
 * @description 创建一个新客户及其关联信息
 * @param data - 包含客户、家长、标签等信息的DTO
 * @returns {Promise<Customer>} - 返回创建的客户对象
 */
export const createCustomer = async (data: CreateCustomerDto): Promise<Customer> => {
  try {
    // 生成唯一的学号
    const publicId = await generateUniquePublicId();
    
    // 1. 使用 prisma.$transaction 来确保操作的原子性
    const result = await prisma.$transaction(async (tx) => {
      // 2. 在事务中，首先创建 customer 记录
      const customer = await tx.customer.create({
        data: {
          publicId, // 添加生成的学号
          name: data.name,
          gender: data.gender,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          school: data.school,
          grade: data.grade as Grade,
          address: data.address,
          sourceChannel: data.sourceChannel as SourceChannel,
          firstContactDate: data.firstContactDate ? new Date(data.firstContactDate) : null,
          status: data.status || 'POTENTIAL',
          nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null
        }
      });

      // 3. 然后创建关联的 parent 记录
      if (data.parents && data.parents.length > 0) {
        const parentData = data.parents.map(parent => ({
          name: parent.name,
          relationship: parent.relationship,
          phone: parent.phone,
          wechatId: parent.wechatId,
          customerId: customer.id
        }));

        await tx.parent.createMany({
          data: parentData
        });
      }

      // 4. 最后创建关联的 customer_tags 记录
      if (data.tags && data.tags.length > 0) {
        const tagConnections = data.tags.map(tagId => ({
          customerId: customer.id,
          tagId: tagId
        }));

        await tx.customerTag.createMany({
          data: tagConnections
        });

        // 增加标签的使用计数
        for (const tagId of data.tags) {
          await tagService.incrementTagUsage(tagId);
        }
      }

      return customer;
    });

    // 5. 返回创建的客户对象（包含完整关联信息）
    const completeCustomer = await prisma.customer.findUnique({
      where: { id: result.id },
      include: {
        parents: true,
        tags: {
          include: {
            tag: true
          }
        },
        communicationLogs: {
          orderBy: {
            updatedAt: 'desc'
          }
        }
      }
    });

    if (!completeCustomer) {
      throw new Error('创建的客户记录未找到');
    }

    // 转换tags数据格式：将CustomerTag[]转换为number[]
    const transformedCustomer = {
      ...completeCustomer,
      tags: completeCustomer.tags.map(ct => ct.tagId) // 只返回标签ID数组
    };

    console.log(`成功创建客户: ${data.name} (ID: ${result.id}, 学号: ${publicId})`);
    return transformedCustomer;

  } catch (error) {
    console.error('创建客户时发生错误:', error);
    throw new Error('创建客户失败');
  }
};

/**
 * @description 根据ID获取单个客户的完整档案
 * @param id - 客户ID
 * @returns {Promise<Customer | null>} - 返回包含 parents, communicationLogs, tags 等完整信息的客户对象
 */
export const getCustomerById = async (id: number): Promise<Customer | null> => {
  try {
    // 1. 使用 prisma.customer.findUnique
    // 2. 使用 include 操作符来加载所有关联数据
    const customer = await prisma.customer.findUnique({
      where: {
        id: id
      },
      include: {
        parents: {
          orderBy: {
            id: 'asc' // 按ID排序，保持一致的顺序
          }
        },
        communicationLogs: {
          orderBy: {
            updatedAt: 'desc' // 按最后编辑时间倒序排列
          }
        },
        tags: {
          include: {
            tag: true // 包含标签的详细信息
          },
          orderBy: {
            tag: {
              type: 'asc' // 按标签类型排序
            }
          }
        },
        enrollments: {
          include: {
            class: true // 如果需要班级信息
          }
        },
        financialOrders: {
          include: {
            payments: true // 如果需要财务信息
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!customer) {
      console.log(`未找到客户: ID ${id}`);
      return null;
    }

    // 转换tags数据格式：将CustomerTag[]转换为number[]
    const transformedCustomer = {
      ...customer,
      tags: customer.tags.map(ct => ct.tagId) // 只返回标签ID数组
    };

    console.log(`成功获取客户档案: ${customer.name} (ID: ${id})`);
    return transformedCustomer;

  } catch (error) {
    console.error('获取客户档案时发生错误:', error);
    throw new Error('获取客户档案失败');
  }
};

/**
 * @description 更新一个客户的完整档案
 * @param id - 客户ID
 * @param data - 包含待更新字段的DTO
 * @returns {Promise<Customer>} - 返回更新后的客户对象
 */
export const updateCustomer = async (id: number, data: UpdateCustomerDto): Promise<Customer> => {
  try {
    // 先获取原客户状态用于后续判断
    const originalCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!originalCustomer) {
      throw new Error('客户不存在');
    }

    // 1. 使用 prisma.$transaction 来确保操作的原子性
    const result = await prisma.$transaction(async (tx) => {
      // 2. 在事务中，更新 customer 主表信息
      const customerUpdateData: any = {};
      
      // 只更新提供的字段
      if (data.name !== undefined) customerUpdateData.name = data.name;
      if (data.gender !== undefined) customerUpdateData.gender = data.gender;
      if (data.birthDate !== undefined) {
        customerUpdateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
      }
      if (data.school !== undefined) customerUpdateData.school = data.school;
      if (data.grade !== undefined) customerUpdateData.grade = data.grade;
      if (data.address !== undefined) customerUpdateData.address = data.address;
      if (data.sourceChannel !== undefined) customerUpdateData.sourceChannel = data.sourceChannel;
      if (data.firstContactDate !== undefined) {
        customerUpdateData.firstContactDate = data.firstContactDate ? new Date(data.firstContactDate) : null;
      }
      if (data.status !== undefined) customerUpdateData.status = data.status;
      if (data.nextFollowUpDate !== undefined) {
        customerUpdateData.nextFollowUpDate = data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null;
      }

      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: customerUpdateData
      });

      // 3. 根据 data 中提供的 parents 信息，采用先删后增的方式同步关联表
      if (data.parents !== undefined) {
        // 删除现有的家长记录
        await tx.parent.deleteMany({
          where: { customerId: id }
        });

        // 创建新的家长记录
        if (data.parents.length > 0) {
          const parentData = data.parents.map(parent => ({
            name: parent.name,
            relationship: parent.relationship,
            phone: parent.phone,
            wechatId: parent.wechatId,
            customerId: id
          }));

          await tx.parent.createMany({
            data: parentData
          });
        }
      }

      // 4. 根据 data 中提供的 tags 信息，采用先删后增的方式同步关联表
      if (data.tags !== undefined) {
        // 获取现有的标签ID列表
        const currentTags = await tx.customerTag.findMany({
          where: { customerId: id },
          select: { tagId: true }
        });
        const currentTagIds = currentTags.map(ct => ct.tagId);

        // 删除现有的标签关联
        await tx.customerTag.deleteMany({
          where: { customerId: id }
        });

        // 减少旧标签的使用计数
        for (const tagId of currentTagIds) {
          await tagService.decrementTagUsage(tagId);
        }

        // 创建新的标签关联
        if (data.tags.length > 0) {
          const tagConnections = data.tags.map(tagId => ({
            customerId: id,
            tagId: tagId
          }));

          await tx.customerTag.createMany({
            data: tagConnections
          });

          // 增加新标签的使用计数
          for (const tagId of data.tags) {
            await tagService.incrementTagUsage(tagId);
          }
        }

        // 异步清理未使用的个人标签（不阻塞主流程）
        tagService.cleanupUnusedPersonalTags().catch(error => {
          console.warn('清理未使用个人标签时发生错误:', error);
        });
      }

      return updatedCustomer;
    });

    // 4. 返回更新后的客户对象（包含完整关联信息）
    const completeCustomer = await prisma.customer.findUnique({
      where: { id },
      include: {
        parents: {
          orderBy: { id: 'asc' }
        },
        tags: {
          include: {
            tag: true
          }
        },
        communicationLogs: {
          orderBy: {
            updatedAt: 'desc'
          }
        }
      }
    });

    if (!completeCustomer) {
      throw new Error('更新后的客户记录未找到');
    }

    // 转换tags数据格式：将CustomerTag[]转换为number[]
    const transformedCustomer = {
      ...completeCustomer,
      tags: completeCustomer.tags.map(ct => ct.tagId) // 只返回标签ID数组
    };

    console.log(`成功更新客户: ${completeCustomer.name} (ID: ${id})`);
    
    // 如果客户状态变更为ENROLLED，自动创建学生账号
    if (data.status === CustomerStatus.ENROLLED && originalCustomer.status !== CustomerStatus.ENROLLED) {
      console.log(`客户 ${completeCustomer.name} 状态变更为已报名，尝试创建学生账号...`);
      try {
        const { createStudentAccountForCustomer } = await import('./auth.service');
        const studentAccount = await createStudentAccountForCustomer(id);
        if (studentAccount) {
          console.log(`成功为客户 ${completeCustomer.name} 创建学生账号`);
        }
      } catch (error) {
        console.warn(`为客户 ${completeCustomer.name} 创建学生账号失败:`, error);
      }
    }
    
    return transformedCustomer;

  } catch (error) {
    console.error('更新客户时发生错误:', error);
    throw new Error('更新客户失败');
  }
};

/**
 * @description 批量删除客户
 * @param ids - 包含待删除客户ID的数组
 * @returns {Promise<void>}
 */
export const deleteCustomers = async (ids: number[]): Promise<void> => {
  try {
    if (!ids || ids.length === 0) {
      throw new Error('没有提供要删除的客户ID');
    }

    // 获取要删除的客户的所有标签关联
    const customerTags = await prisma.customerTag.findMany({
      where: { customerId: { in: ids } },
      select: { tagId: true }
    });

    // 统计每个标签的使用次数
    const tagUsageCount = customerTags.reduce((acc, ct) => {
      acc[ct.tagId] = (acc[ct.tagId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // 1. 使用 prisma.customer.deleteMany
    // 2. 在 where 条件中使用 in 操作符
    const deleteResult = await prisma.customer.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    // 减少标签的使用计数
    for (const [tagId, count] of Object.entries(tagUsageCount)) {
      for (let i = 0; i < count; i++) {
        await tagService.decrementTagUsage(parseInt(tagId));
      }
    }

    // 异步清理未使用的个人标签（不阻塞主流程）
    tagService.cleanupUnusedPersonalTags().catch(error => {
      console.warn('清理未使用个人标签时发生错误:', error);
    });

    console.log(`成功删除 ${deleteResult.count} 个客户记录，预期删除 ${ids.length} 个`);

    // 如果删除的数量与预期不符，记录警告（可能某些ID不存在）
    if (deleteResult.count !== ids.length) {
      console.warn(`删除数量不匹配：预期删除 ${ids.length} 个，实际删除 ${deleteResult.count} 个`);
    }

  } catch (error) {
    console.error('批量删除客户时发生错误:', error);
    throw new Error('批量删除客户失败');
  }
};

/**
 * @description 为指定客户添加一条新的沟通纪要
 * @param customerId - 客户ID
 * @param content - 纪要内容
 * @returns {Promise<CommunicationLog>} - 返回新创建的沟通纪要对象
 */
export const addCommunicationLog = async (customerId: number, content: string): Promise<CommunicationLog> => {
  try {
    // 首先验证客户是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('客户不存在');
    }

    // 1. 使用 prisma.communicationLog.create 创建新记录
    const newLog = await prisma.communicationLog.create({
      data: {
        content: content.trim(),
        customerId: customerId
      }
    });

    console.log(`成功为客户 ${customerId} 添加沟通纪要: ${newLog.id}`);
    return newLog;

  } catch (error) {
    console.error('添加沟通纪要时发生错误:', error);
    if (error instanceof Error && error.message === '客户不存在') {
      throw error;
    }
    throw new Error('添加沟通纪要失败');
  }
};

/**
 * @description 更新指定的沟通纪要
 * @param logId - 沟通纪要ID
 * @param content - 新的纪要内容
 * @returns {Promise<CommunicationLog>} - 返回更新后的沟通纪要对象
 */
export const updateCommunicationLog = async (logId: number, content: string): Promise<CommunicationLog> => {
  try {
    // 1. 使用 prisma.communicationLog.update 更新记录
    const updatedLog = await prisma.communicationLog.update({
      where: {
        id: logId
      },
      data: {
        content: content.trim()
        // updatedAt 字段会自动更新，因为在schema中设置了 @updatedAt
      }
    });

    console.log(`成功更新沟通纪要: ${logId}`);
    return updatedLog;

  } catch (error) {
    console.error('更新沟通纪要时发生错误:', error);
    
    // 处理记录不存在的情况
    if (error instanceof Error && error.message?.includes('Record to update not found')) {
      throw new Error('沟通纪要不存在');
    }
    
    throw new Error('更新沟通纪要失败');
  }
};

/**
 * @description 删除指定的沟通纪要
 * @param logId - 沟通纪要ID
 * @returns {Promise<void>}
 */
export const deleteCommunicationLog = async (logId: number): Promise<void> => {
  try {
    // 1. 使用 prisma.communicationLog.delete 删除记录
    await prisma.communicationLog.delete({
      where: {
        id: logId
      }
    });

    console.log(`成功删除沟通纪要: ${logId}`);

  } catch (error) {
    console.error('删除沟通纪要时发生错误:', error);
    
    // 处理记录不存在的情况
    if (error instanceof Error && error.message?.includes('Record to delete does not exist')) {
      throw new Error('沟通纪要不存在');
    }
    
    throw new Error('删除沟通纪要失败');
  }
}; 