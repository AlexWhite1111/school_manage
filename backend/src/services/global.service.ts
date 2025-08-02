// src/services/global.service.ts
// 该文件包含全局操作的业务逻辑，例如数据的导入和导出。

import { PrismaClient, CustomerStatus, Gender, TagType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Papa from 'papaparse';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// ----------------------------------------
// Service Functions
// ----------------------------------------

/**
 * @description 导出客户信息为CSV
 * @param {any} filters - 筛选参数
 * @returns {Promise<string>} - 返回CSV格式的字符串
 */
export const exportCustomersToCsv = async (filters: {
  status?: CustomerStatus;
  search?: string;
  page?: string;
  limit?: string;
}): Promise<string> => {
  try {
    // 构建查询条件（复用customer.service的逻辑）
    const where: any = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { school: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // 获取客户数据
    const customers = await prisma.customer.findMany({
      where,
      include: {
        parents: true,
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 转换为适合CSV导出的格式
    const csvData = customers.map(customer => ({
      '客户ID': customer.id,
      '姓名': customer.name,
      '性别': customer.gender,
      '出生日期': customer.birthDate?.toISOString().split('T')[0] || '',
      '学校': customer.school || '',
      '年级': customer.grade || '',
      '地址': customer.address || '',
      '来源渠道': customer.sourceChannel || '',
      '首次接触日期': customer.firstContactDate?.toISOString().split('T')[0] || '',
      '客户状态': customer.status,
      '下次跟进日期': customer.nextFollowUpDate?.toISOString().split('T')[0] || '',
      '家长信息': customer.parents.map(p => `${p.name}(${p.relationship}):${p.phone}`).join('; '),
      '标签': customer.tags.map(t => t.tag.text).join('; '),
      '创建时间': customer.createdAt.toISOString(),
      '更新时间': customer.updatedAt?.toISOString() || ''
    }));

    // 转换为CSV字符串
    const csv = Papa.unparse(csvData, {
      header: true
    });

    console.log(`成功导出${customers.length}条客户记录`);
    return csv;

  } catch (error) {
    console.error('导出客户CSV时发生错误:', error);
    throw new Error('导出客户CSV失败');
  }
};

/**
 * @description 从CSV文件导入客户信息
 * @param {string} filePath - CSV文件路径
 * @returns {Promise<any>} - 返回导入结果 (例如: { success: number, failed: number })
 */
export const importCustomersFromCsv = async (filePath: string): Promise<any> => {
  try {
    // 读取CSV文件内容
    const csvContent = await fs.readFile(filePath, 'utf-8');
    
    // 解析CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    }) as Papa.ParseResult<any>;

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.error('CSV解析错误:', parseResult.errors);
      throw new Error('CSV文件格式错误');
    }

    const rows = parseResult.data;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // 逐行处理数据
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        
        // 验证必填字段
        if (!row['姓名'] || !row['性别'] || !row['出生日期']) {
          failedCount++;
          errors.push(`第${i + 2}行: 缺少必填字段（姓名、性别、出生日期）`);
          continue;
        }

        // 解析家长信息
        const parentInfoStr = row['家长信息'] || '';
        const parents = [];
        if (parentInfoStr) {
          const parentItems = parentInfoStr.split(';');
          for (const item of parentItems) {
            const match = item.trim().match(/^(.+)\((.+)\):(.+)$/);
            if (match) {
              parents.push({
                name: match[1].trim(),
                relationship: match[2].trim(),
                phone: match[3].trim(),
                wechatId: ''
              });
            }
          }
        }

        // 创建客户记录
        await prisma.customer.create({
          data: {
            name: row['姓名'].trim(),
            gender: row['性别'] === '男' ? 'MALE' : 'FEMALE',
            birthDate: new Date(row['出生日期']),
            school: row['学校']?.trim() || null,
            grade: row['年级']?.trim() || null,
            address: row['地址']?.trim() || null,
            sourceChannel: row['来源渠道']?.trim() || null,
            firstContactDate: row['首次接触日期'] ? new Date(row['首次接触日期']) : null,
            status: (row['客户状态'] as CustomerStatus) || 'POTENTIAL',
            nextFollowUpDate: row['下次跟进日期'] ? new Date(row['下次跟进日期']) : null,
            parents: {
              createMany: {
                data: parents
              }
            }
          }
        });

        successCount++;

      } catch (error) {
        failedCount++;
        errors.push(`第${i + 2}行: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 清理临时文件
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }

    const result = {
      message: 'Import completed',
      results: {
        success: successCount,
        failed: failedCount
      },
      errors: errors.slice(0, 10) // 只返回前10个错误
    };

    console.log(`客户导入完成: 成功${successCount}条，失败${failedCount}条`);
    return result;

  } catch (error) {
    console.error('导入客户CSV时发生错误:', error);
    
    // 清理临时文件
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.warn('清理临时文件失败:', cleanupError);
    }
    
    throw new Error('导入客户CSV失败');
  }
};

/**
 * @description 导出学生成长记录为CSV
 * @param {any} filters - 筛选参数
 * @returns {Promise<string>} - 返回CSV格式的字符串
 */
export const exportGrowthLogsToCsv = async (filters: {
  studentId?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<string> => {
  try {
    // 构建查询条件
    const where: any = {};
    
    if (filters.studentId) {
      where.enrollment = {
        studentId: parseInt(filters.studentId)
      };
    }
    
    if (filters.classId) {
      where.enrollment = {
        ...where.enrollment,
        classId: parseInt(filters.classId)
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // 获取成长记录数据
    const growthLogs = await prisma.growthLog.findMany({
      where,
      include: {
        tag: true,
        enrollment: {
          include: {
            student: true,
            class: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 转换为适合CSV导出的格式
    const csvData = growthLogs.map(log => ({
      '记录ID': log.id,
      '学生姓名': log.enrollment.student.name,
      '班级名称': log.enrollment.class.name,
      '标签内容': log.tag.text,
      '标签类型': log.tag.type,
      '是否预定义标签': log.tag.isPredefined ? '是' : '否',
      '记录时间': log.createdAt.toISOString(),
      '记录日期': log.createdAt.toISOString().split('T')[0]
    }));

    // 转换为CSV字符串
    const csv = Papa.unparse(csvData, {
      header: true
    });

    console.log(`成功导出${growthLogs.length}条成长记录`);
    return csv;

  } catch (error) {
    console.error('导出成长记录CSV时发生错误:', error);
    throw new Error('导出成长记录CSV失败');
  }
};

/**
 * @description 导出财务数据为CSV
 * @param {any} filters - 筛选参数
 * @returns {Promise<string>} - 返回CSV格式的字符串
 */
export const exportFinanceToCsv = async (filters: {
  startDate?: string;
  endDate?: string;
}): Promise<string> => {
  try {
    // 构建查询条件
    const where: any = {};
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // 获取财务订单数据
    const orders = await prisma.financialOrder.findMany({
      where,
      include: {
        student: true,
        payments: {
          orderBy: {
            paymentDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 转换为适合CSV导出的格式（包含订单和付款记录）
    const csvData: any[] = [];

    orders.forEach(order => {
      const totalPaid = order.payments.reduce((sum, payment) => 
        sum.plus(payment.amount), new Decimal(0));
      const remainingAmount = order.totalDue.minus(totalPaid);
      
      let orderStatus = '未支付';
      if (remainingAmount.lessThanOrEqualTo(0)) {
        orderStatus = '已付清';
      } else if (totalPaid.greaterThan(0)) {
        orderStatus = '部分支付';
      }

      // 订单基本信息
      const orderRow = {
        '类型': '订单',
        '订单ID': order.id,
        '学生姓名': order.student.name,
        '订单名称': order.name,
        '应收总额': order.totalDue.toString(),
        '已收金额': totalPaid.toString(),
        '剩余未付': remainingAmount.toString(),
        '订单状态': orderStatus,
        '结账日期': order.dueDate?.toISOString().split('T')[0] || '',
        '课程开始': order.coursePeriodStart?.toISOString().split('T')[0] || '',
        '课程结束': order.coursePeriodEnd?.toISOString().split('T')[0] || '',
        '创建时间': order.createdAt.toISOString(),
        '付款ID': '',
        '付款金额': '',
        '付款日期': '',
        '付款备注': ''
      };
      csvData.push(orderRow);

      // 每笔付款记录
      order.payments.forEach(payment => {
        const paymentRow = {
          '类型': '付款记录',
          '订单ID': order.id,
          '学生姓名': order.student.name,
          '订单名称': order.name,
          '应收总额': '',
          '已收金额': '',
          '剩余未付': '',
          '订单状态': '',
          '结账日期': '',
          '课程开始': '',
          '课程结束': '',
          '创建时间': '',
          '付款ID': payment.id,
          '付款金额': payment.amount.toString(),
          '付款日期': payment.paymentDate.toISOString().split('T')[0],
          '付款备注': payment.notes || ''
        };
        csvData.push(paymentRow);
      });
    });

    // 转换为CSV字符串
    const csv = Papa.unparse(csvData, {
      header: true
    });

    console.log(`成功导出${orders.length}个订单的财务数据`);
    return csv;

  } catch (error) {
    console.error('导出财务CSV时发生错误:', error);
    throw new Error('导出财务CSV失败');
  }
}; 