// src/services/customer.service.ts
// 该文件包含所有与CRM相关的业务逻辑，如客户档案管理、沟通纪要等。

import { Customer, CommunicationLog, CustomerStatus, Grade, SourceChannel } from '@prisma/client';
import * as tagService from './tag.service';
import { generateUniquePublicId } from '../utils/idGenerator';
const pinyin = require('pinyin');
import { prisma } from '../utils/database';

// 拼音处理工具
const getPinyinInitials = (text: string): string => {
  try {
    if (!text) return '';
    const pinyinArray = pinyin(text, {
      style: pinyin.STYLE_FIRST_LETTER,
      heteronym: false,
      segment: true
    });
    return pinyinArray.map((item: any) => item[0]).join('').toLowerCase();
  } catch (error) {
    console.warn('拼音转换失败:', error);
    return '';
  }
};

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
 * @description 获取客户列表，支持筛选和分页 - 性能优化版本 + 拼音搜索
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
    
    console.log(`🔍 开始客户搜索: 状态=${status || '全部'}, 关键词="${search || '无'}", 页码=${page}, 限制=${limit}`);
    
    // 构建 Prisma 查询条件，优化性能
    const whereClause: any = {};
    
    // 状态筛选
    if (status) {
      if (Array.isArray(status)) {
        whereClause.status = { in: status };
      } else {
        whereClause.status = status;
      }
    }
    
    // 🚀 优化搜索逻辑 - 智能多模式搜索 + 安全处理
    if (search && search.trim()) {
      const searchTerm = search.trim();
      console.log(`🔍 处理搜索关键词: "${searchTerm}"`);
      
      // 参数安全验证
      if (searchTerm.length > 100) {
        console.warn(`⚠️ 搜索关键词过长，已截断: ${searchTerm.substring(0, 100)}...`);
        return []; // 返回空结果而不是抛出错误
      }
      
      try {
        // 检测是否为纯字母（可能是拼音首字母）
        const isAlphaOnly = /^[a-zA-Z]+$/.test(searchTerm);
        
        const searchConditions: any[] = [
          // 1. String类型字段搜索 - 支持contains操作
          {
            name: { contains: searchTerm, mode: 'insensitive' }
          },
          {
            school: { contains: searchTerm, mode: 'insensitive' }
          },
          {
            address: { contains: searchTerm, mode: 'insensitive' }
          },
          // 2. 关联字段搜索
          {
            parents: {
              some: {
                OR: [
                  { name: { contains: searchTerm, mode: 'insensitive' } },
                  { phone: { contains: searchTerm, mode: 'insensitive' } }
                ]
              }
            }
          }
        ];

        // 3. 枚举字段搜索 - 需要精确匹配或映射
        // Grade枚举搜索
        const gradeMapping: { [key: string]: string } = {
          '初一': 'CHU_YI', '初1': 'CHU_YI', 'chu1': 'CHU_YI', 'cy': 'CHU_YI',
          '初二': 'CHU_ER', '初2': 'CHU_ER', 'chu2': 'CHU_ER', 'ce': 'CHU_ER',
          '初三': 'CHU_SAN', '初3': 'CHU_SAN', 'chu3': 'CHU_SAN', 'cs': 'CHU_SAN',
          '高一': 'GAO_YI', '高1': 'GAO_YI', 'gao1': 'GAO_YI', 'gy': 'GAO_YI',
          '高二': 'GAO_ER', '高2': 'GAO_ER', 'gao2': 'GAO_ER', 'ge': 'GAO_ER',
          '高三': 'GAO_SAN', '高3': 'GAO_SAN', 'gao3': 'GAO_SAN', 'gs': 'GAO_SAN'
        };

        const matchedGrade = gradeMapping[searchTerm.toLowerCase()];
        if (matchedGrade) {
          searchConditions.push({
            grade: { equals: matchedGrade }
          });
        }

        // SourceChannel枚举搜索
        const sourceChannelMapping: { [key: string]: string } = {
          '家长推荐': 'JIAZHANG_TUIJIAN', '推荐': 'JIAZHANG_TUIJIAN', 'jz': 'JIAZHANG_TUIJIAN',
          '朋友亲戚': 'PENGYOU_QINQI', '朋友': 'PENGYOU_QINQI', '亲戚': 'PENGYOU_QINQI', 'py': 'PENGYOU_QINQI',
          '学生社交': 'XUESHENG_SHEJIAO', '社交': 'XUESHENG_SHEJIAO', 'xs': 'XUESHENG_SHEJIAO',
          '广告传单': 'GUANGGAO_CHUANDAN', '传单': 'GUANGGAO_CHUANDAN', '广告': 'GUANGGAO_CHUANDAN', 'gg': 'GUANGGAO_CHUANDAN',
          '地推宣传': 'DITUI_XUANCHUAN', '地推': 'DITUI_XUANCHUAN', '宣传': 'DITUI_XUANCHUAN', 'dt': 'DITUI_XUANCHUAN',
          '微信公众号': 'WEIXIN_GONGZHONGHAO', '微信': 'WEIXIN_GONGZHONGHAO', '公众号': 'WEIXIN_GONGZHONGHAO', 'wx': 'WEIXIN_GONGZHONGHAO',
          '抖音': 'DOUYIN', 'douyin': 'DOUYIN', 'dy': 'DOUYIN',
          '其他媒体': 'QITA_MEITI', '媒体': 'QITA_MEITI', 'mt': 'QITA_MEITI',
          '合作': 'HEZUO', 'hezuo': 'HEZUO', 'hz': 'HEZUO',
          '其他': 'QITA', 'qita': 'QITA', 'qt': 'QITA'
        };

        const matchedSourceChannel = sourceChannelMapping[searchTerm.toLowerCase()];
        if (matchedSourceChannel) {
          searchConditions.push({
            sourceChannel: { equals: matchedSourceChannel }
          });
        }

        whereClause.OR = searchConditions;
        console.log(`✅ 搜索条件构建完成，条件数量: ${searchConditions.length}${matchedGrade ? ' (含年级匹配)' : ''}${matchedSourceChannel ? ' (含渠道匹配)' : ''}`);
        
      } catch (searchError) {
        console.error('❌ 搜索条件构建失败:', searchError);
        throw new Error('搜索参数处理失败');
      }
    }

    // 处理班级筛选逻辑
    if (excludeClassId) {
      whereClause.enrollments = {
        none: { classId: excludeClassId }
      };
    } else if (unclassed) {
      whereClause.enrollments = {
        none: {}
      };
    }
    
    // 分页逻辑
    const skip = (page - 1) * limit;
    
    console.log(`📊 执行数据库查询: skip=${skip}, take=${limit}`);
    
    // 🚀 数据库查询优化
    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        parents: {
          select: {
            id: true,
            name: true,
            phone: true,
            relationship: true
          },
          take: 2 // 列表页显示前两个家长
        },
        tags: {
          select: { tagId: true }
        }
      },
      orderBy: [
        // 优化排序：搜索时按创建时间，无搜索时按更新时间
        search ? { createdAt: 'desc' } : { updatedAt: 'desc' },
        { id: 'desc' } // 添加稳定排序
      ],
      skip: skip,
      take: limit
    });
    
    console.log(`📊 数据库查询完成: 原始结果=${customers.length}条`);
    
    // 🎯 如果是拼音搜索且结果较少，进行二次筛选
    let finalCustomers = customers;
    if (search && /^[a-zA-Z]+$/.test(search.trim()) && customers.length < 10) {
      try {
        const pinyinFilter = search.toLowerCase();
        console.log(`🔤 执行拼音二次筛选: "${pinyinFilter}"`);
        
        finalCustomers = customers.filter(customer => {
          try {
            const nameInitials = getPinyinInitials(customer.name);
            const schoolInitials = customer.school ? getPinyinInitials(customer.school) : '';
            const parentInitials = customer.parents.map(p => getPinyinInitials(p.name)).join('');
            
            return nameInitials.includes(pinyinFilter) || 
                   schoolInitials.includes(pinyinFilter) || 
                   parentInitials.includes(pinyinFilter);
          } catch (pinyinError) {
            console.warn(`⚠️ 客户${customer.id}拼音处理失败:`, pinyinError);
            return false; // 跳过有问题的客户，不影响整体搜索
          }
        });
        
        console.log(`🔤 拼音筛选完成: ${finalCustomers.length}条`);
      } catch (pinyinError) {
        console.warn('⚠️ 拼音筛选整体失败，使用原始结果:', pinyinError);
        // 拼音筛选失败时，仍然返回原始搜索结果
      }
    }
    
    // 转换tags数据格式
    const transformedCustomers = finalCustomers.map(customer => ({
      ...customer,
      tags: customer.tags.map(ct => ct.tagId)
    }));
    
    console.log(`🎉 客户搜索完成: 关键词="${search || '无'}", 状态="${status || '全部'}", 最终结果=${transformedCustomers.length}条`);
    return transformedCustomers;
    
  } catch (error) {
    console.error('❌ 获取客户列表时发生错误:', error);
    console.error('❌ 错误详情:', error instanceof Error ? error.stack : 'Unknown error');
    console.error('❌ 查询参数:', JSON.stringify(filters, null, 2));
    
    // 更友好的错误处理
    if (error instanceof Error) {
      if (error.message.includes('搜索参数处理失败')) {
        throw new Error('搜索关键词包含不支持的字符，请重新输入');
      }
      if (error.message.includes('database')) {
        throw new Error('数据库连接异常，请稍后重试');
      }
    }
    
    throw new Error('获取客户列表失败，请检查输入参数');
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

    // 5. 如果客户状态为ENROLLED，自动创建学生账号
    if (result.status === 'ENROLLED') {
      console.log(`客户 ${result.name} 创建时状态为已报名，尝试创建学生账号...`);
      try {
        const { createStudentAccountForCustomer } = await import('./auth.service');
        const studentAccount = await createStudentAccountForCustomer(result.id);
        if (studentAccount) {
          console.log(`成功为新客户 ${result.name} 创建学生账号`);
        }
      } catch (error) {
        console.warn(`为新客户 ${result.name} 创建学生账号失败:`, error);
      }
    }

    // 6. 返回创建的客户对象（包含完整关联信息）
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
 * @description 通过publicId获取单个客户的完整档案
 * @param publicId - 客户publicId
 * @returns {Promise<Customer | null>} - 返回客户对象或null
 */
export const getCustomerByPublicId = async (publicId: string): Promise<Customer | null> => {
  try {
    // 1. 使用 prisma.customer.findUnique 通过publicId查找
    // 2. 使用 include 操作符来加载所有关联数据
    const customer = await prisma.customer.findUnique({
      where: {
        publicId: publicId
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
      console.log(`未找到客户: publicId ${publicId}`);
      return null;
    }

    // 转换tags数据格式：将CustomerTag[]转换为number[]
    const transformedCustomer = {
      ...customer,
      tags: customer.tags.map(ct => ct.tagId) // 只返回标签ID数组
    };

    console.log(`成功通过publicId获取客户档案: ${customer.name} (publicId: ${publicId})`);
    return transformedCustomer;

  } catch (error) {
    console.error('通过publicId获取客户档案时发生错误:', error);
    throw new Error('通过publicId获取客户档案失败');
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