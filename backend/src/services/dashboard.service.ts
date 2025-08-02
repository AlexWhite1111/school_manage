// src/services/dashboard.service.ts
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ----------------------------------------
// Service Functions
// ----------------------------------------

/**
 * @description 获取核心仪表盘的摘要数据
 * @returns {Promise<any>} - 返回一个包含财务速览和待办提醒的对象
 */
export const getDashboardSummary = async () => {
  try {
    // 获取当前日期，用于计算本月数据和今日待办
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // 使用北京时间（UTC+8）来确定今天的日期范围
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 转换为北京时间
    const todayStr = beijingTime.toISOString().split('T')[0]; // 获取北京时间的日期字符串
    
    // 计算明天的北京时间日期
    const tomorrowBeijing = new Date(beijingTime.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrowBeijing.toISOString().split('T')[0];
    
    // 创建今天和明天的UTC时间范围用于查询（数据库存储的是UTC时间）
    const today = new Date(todayStr + 'T00:00:00.000Z');
    const tomorrow = new Date(tomorrowStr + 'T00:00:00.000Z');

    console.log('🕐 时间调试信息 (使用北京时间):');
    console.log('  当前UTC时间:', now.toISOString());
    console.log('  当前北京时间:', beijingTime.toISOString());
    console.log('  北京时间今天日期:', todayStr);
    console.log('  北京时间明天日期:', tomorrowStr);
    console.log('  查询今天范围: [', today.toISOString(), ',', tomorrow.toISOString(), ')');

    // 1. 获取财务速览数据
    const financialOverview = await getFinancialOverview(currentMonth, nextMonth);
    
    // 2. 获取今日待办提醒
    const followUpReminders = await getFollowUpReminders(today, tomorrow);

    const summary = {
      financial: {
        monthlyReceived: parseFloat(financialOverview.monthlyReceived),
        monthlyDue: parseFloat(financialOverview.monthlyDue),
        totalOutstanding: parseFloat(financialOverview.totalOutstanding)
      },
      followUps: followUpReminders
    };

    console.log(`✅ 成功获取仪表盘摘要数据，今日待跟进客户：${followUpReminders.length}个`);
    return summary;

  } catch (error) {
    console.error('获取仪表盘摘要数据时发生错误:', error);
    throw new Error('获取仪表盘摘要数据失败');
  }
};

/**
 * @description 获取财务速览数据
 * @param {Date} currentMonth - 本月开始日期
 * @param {Date} nextMonth - 下月开始日期
 * @returns {Promise<any>}
 */
const getFinancialOverview = async (currentMonth: Date, nextMonth: Date) => {
  // 本月实收：从本月第一天至今，所有"收款记录"的金额总和
  const monthlyReceived = await prisma.payment.aggregate({
    where: {
      paymentDate: {
        gte: currentMonth,
        lt: nextMonth
      }
    },
    _sum: {
      amount: true
    }
  });

  // 本月应收：所有"结账日期"在本月内的"收费订单"的应收总额之和
  const monthlyDue = await prisma.financialOrder.aggregate({
    where: {
      dueDate: {
        gte: currentMonth,
        lt: nextMonth
      }
    },
    _sum: {
      totalDue: true
    }
  });

  // 当前待收总额：所有订单的"剩余未付金额"的总和
  // 需要计算所有订单的总应收减去已付款的总和
  const allOrders = await prisma.financialOrder.findMany({
    include: {
      payments: true
    }
  });

  let totalOutstanding = new Decimal(0);
  allOrders.forEach(order => {
    const totalPaid = order.payments.reduce((sum, payment) => 
      sum.plus(payment.amount), new Decimal(0));
    const remaining = order.totalDue.minus(totalPaid);
    if (remaining.greaterThan(0)) {
      totalOutstanding = totalOutstanding.plus(remaining);
    }
  });

  return {
    monthlyReceived: monthlyReceived._sum.amount?.toString() || "0",
    monthlyDue: monthlyDue._sum.totalDue?.toString() || "0", 
    totalOutstanding: totalOutstanding.toString()
  };
};

/**
 * @description 获取今日待办提醒
 * @param {Date} today - 今天开始时间
 * @param {Date} tomorrow - 明天开始时间
 * @returns {Promise<any>}
 */
const getFollowUpReminders = async (today: Date, tomorrow: Date) => {
  // 获取所有在"客户档案"中设置的"下次跟进日期"为今天的客户
  const todayReminders = await prisma.customer.findMany({
    where: {
      nextFollowUpDate: {
        gte: today,
        lt: tomorrow
      }
    },
    select: {
      id: true,
      name: true,
      sourceChannel: true,
      nextFollowUpDate: true,
      status: true,
      parents: {
        select: {
          phone: true,
          name: true,
          relationship: true
        },
        take: 1 // 只取第一个家长的电话
      }
    },
    orderBy: {
      nextFollowUpDate: 'asc'
    }
  });

  console.log(`📋 查询到 ${todayReminders.length} 个今日待跟进客户`);
  todayReminders.forEach(customer => {
    console.log(`  - ${customer.name} (${customer.nextFollowUpDate?.toISOString()})`);
  });

  return todayReminders.map(customer => ({
    id: customer.id,
    name: customer.name,
    sourceChannel: customer.sourceChannel || '未知',
    nextFollowUpDate: customer.nextFollowUpDate?.toISOString().split('T')[0] || '',
    phone: customer.parents[0]?.phone || undefined,
    parentName: customer.parents[0]?.name || undefined,
    parentRelationship: customer.parents[0]?.relationship || undefined,
    status: customer.status
  }));
}; 