// src/services/analytics.service.ts
import { CustomerStatus, TagType } from '@prisma/client';
import { prisma } from '../utils/database';
import { Decimal } from '@prisma/client/runtime/library';

// ================================
// 接口定义
// ================================

interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  sourceChannel?: string;
  customerTags?: number[];
}

interface StudentGrowthFilters {
  startDate: Date;
  endDate: Date;
  classId?: number;
  gradeLevel?: string;
}

interface FinanceFilters {
  startDate: Date;
  endDate: Date;
}

interface FinanceSummary {
  keyMetrics: {
    totalReceived: number;
    totalDue: number;
    totalOutstanding: number;
  };
  revenueTrend: Array<{ date: string; amount: number }>;
  dueTrend: Array<{ date: string; amount: number }>;
  outstandingByStatus: Array<{ status: 'PAID_FULL' | 'PARTIAL_PAID' | 'UNPAID'; count: number }>;
  topDebtors: Array<{ studentId: number; studentName: string; totalOwed: number }>;
}

// ================================
// 客户漏斗分析
// ================================

/**
 * 获取客户漏斗分析数据
 */
export const getCustomerFunnelAnalysis = async (filters: AnalyticsFilters) => {
  const { startDate, endDate, sourceChannel, customerTags } = filters;

  // 构建基础查询条件
  const whereCondition: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // 添加来源渠道筛选
  if (sourceChannel) {
    whereCondition.sourceChannel = sourceChannel;
  }

  // 添加标签筛选
  if (customerTags && customerTags.length > 0) {
    whereCondition.tags = {
      some: {
        tagId: {
          in: customerTags
        }
      }
    };
  }

  // 查询各状态的客户数量
  const customersByStatus = await prisma.customer.groupBy({
    by: ['status'],
    where: whereCondition,
    _count: {
      id: true,
    },
  });

  // 将查询结果映射为方便访问的 Map
  const countMap = new Map<CustomerStatus, number>();
  customersByStatus.forEach(group => {
    countMap.set(group.status as CustomerStatus, group._count.id);
  });

  // 定义状态顺序（放在使用之前）
  const statusOrder: CustomerStatus[] = [
    'POTENTIAL',
    'INITIAL_CONTACT',
    'INTERESTED',
    'TRIAL_CLASS',
    'ENROLLED',
    'LOST',
  ];

  const cumulativeCounts: Record<CustomerStatus, number> = {
    POTENTIAL: 0,
    INITIAL_CONTACT: 0,
    INTERESTED: 0,
    TRIAL_CLASS: 0,
    ENROLLED: 0,
    LOST: 0,
  } as any;

  // 从后往前累加
  let runningTotal = 0;
  for (let i = statusOrder.length - 1; i >= 0; i--) {
    const status = statusOrder[i];
    runningTotal += countMap.get(status) || 0;
    cumulativeCounts[status] = runningTotal;
  }

  // 计算总的新增客户数量（累积到第一阶段即可）
  const totalNewCustomers = cumulativeCounts['POTENTIAL'];

  // ================= 重新计算漏斗 =================
  const stages = statusOrder.map((status, index) => {
    const count = cumulativeCounts[status];
    const percentage = totalNewCustomers > 0 ? (count / totalNewCustomers) * 100 : 0;

    // 计算转化率（相对于上一阶段）
    let conversionRate: number | undefined = undefined;
    if (index > 0) {
      const previousCount = cumulativeCounts[statusOrder[index - 1]];
      conversionRate = previousCount > 0 ? (count / previousCount) * 100 : 0;
    }

    return {
      stage: status,
      count,
      percentage: Math.round(percentage * 100) / 100, // 保留两位小数
      conversionRate: conversionRate ? Math.round(conversionRate * 100) / 100 : undefined,
    };
  });

  // 计算最终报名客户数量和整体转化率
  const finalEnrolledCount = stages.find(stage => stage.stage === 'ENROLLED')?.count || 0;
  const overallConversionRate = totalNewCustomers > 0 ? (finalEnrolledCount / totalNewCustomers) * 100 : 0;

  // 计算平均转化周期（可选）
  const enrolledCustomers = await prisma.customer.findMany({
    where: {
      ...whereCondition,
      status: 'ENROLLED',
    },
    select: {
      createdAt: true,
      updatedAt: true,
    },
  });

  let averageConversionDays: number | undefined = undefined;
  if (enrolledCustomers.length > 0) {
    const totalDays = enrolledCustomers.reduce((sum, customer) => {
      const createdAt = new Date(customer.createdAt);
      const updatedAt = new Date(customer.updatedAt || customer.createdAt);
      const diffTime = Math.abs(updatedAt.getTime() - createdAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    averageConversionDays = Math.round(totalDays / enrolledCustomers.length);
  }

  return {
    stages,
    totalNewCustomers,
    finalEnrolledCount,
    overallConversionRate: Math.round(overallConversionRate * 100) / 100,
    averageConversionDays,
  };
};

/**
 * 获取客户漏斗对比分析数据
 */
export const getCustomerFunnelComparison = async (
  currentFilters: AnalyticsFilters,
  comparisonFilters?: AnalyticsFilters,
  periodType?: 'previous_period' | 'same_period_last_year'
) => {
  const current = await getCustomerFunnelAnalysis(currentFilters);

  let previous = undefined;
  if (comparisonFilters) {
    previous = await getCustomerFunnelAnalysis(comparisonFilters);
  }

  return {
    current,
    previous,
    periodType: periodType || 'previous_period',
  };
};

/**
 * 获取来源渠道分析数据
 */
export const getSourceChannelAnalysis = async (filters: AnalyticsFilters) => {
  const { startDate, endDate, customerTags } = filters;

  const whereCondition: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    sourceChannel: {
      not: null, // 只统计有来源渠道的客户
    },
  };

  if (customerTags && customerTags.length > 0) {
    whereCondition.tags = {
      some: {
        tagId: {
          in: customerTags
        }
      }
    };
  }

  // 按来源渠道分组统计
  const channelStats = await prisma.customer.groupBy({
    by: ['sourceChannel', 'status'],
    where: whereCondition,
    _count: {
      id: true,
    },
  });

  // 聚合数据
  const channelMap = new Map<string, { total: number; enrolled: number }>();

  channelStats.forEach(stat => {
    const channel = stat.sourceChannel || '未知渠道';
    if (!channelMap.has(channel)) {
      channelMap.set(channel, { total: 0, enrolled: 0 });
    }
    
    const channelData = channelMap.get(channel)!;
    channelData.total += stat._count.id;
    
    if (stat.status === 'ENROLLED') {
      channelData.enrolled += stat._count.id;
    }
  });

  // 转换为响应格式
  const channels = Array.from(channelMap.entries()).map(([channel, data]) => ({
    channel,
    customerCount: data.total,
    enrolledCount: data.enrolled,
    conversionRate: data.total > 0 ? Math.round((data.enrolled / data.total) * 10000) / 100 : 0,
    // TODO: 如果需要收入数据，可以在这里关联财务数据
    totalRevenue: undefined,
  }));

  // 按转化率排序
  channels.sort((a, b) => b.conversionRate - a.conversionRate);

  return { channels };
};

/**
 * 获取客户分析核心指标
 */
export const getCustomerKeyMetrics = async (
  currentFilters: AnalyticsFilters,
  comparisonFilters?: AnalyticsFilters
) => {
  const currentData = await getCustomerFunnelAnalysis(currentFilters);
  let previousData = undefined;

  if (comparisonFilters) {
    previousData = await getCustomerFunnelAnalysis(comparisonFilters);
  }

  const calculateChange = (current: number, previous?: number) => {
    if (previous === undefined) return { change: undefined, changePercentage: undefined };
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : 0;
    return {
      change: Math.round(change * 100) / 100,
      changePercentage: Math.round(changePercentage * 100) / 100,
    };
  };

  const newCustomersChange = calculateChange(
    currentData.totalNewCustomers,
    previousData?.totalNewCustomers
  );

  const conversionRateChange = calculateChange(
    currentData.overallConversionRate,
    previousData?.overallConversionRate
  );

  const conversionDaysChange = calculateChange(
    currentData.averageConversionDays || 0,
    previousData?.averageConversionDays
  );

  return {
    newCustomers: {
      current: currentData.totalNewCustomers,
      ...newCustomersChange,
    },
    conversionRate: {
      current: currentData.overallConversionRate,
      ...conversionRateChange,
    },
    averageConversionDays: {
      current: currentData.averageConversionDays || 0,
      ...conversionDaysChange,
    },
    // TODO: 如果需要收入指标，可以在这里添加
    totalRevenue: undefined,
  };
};

// ================================
// 学生成长分析
// ================================

/**
 * 获取学生成长分析数据
 */
export const getStudentGrowthAnalysis = async (studentId: number, filters: StudentGrowthFilters) => {
  const { startDate, endDate, classId, gradeLevel } = filters;

  // 验证学生是否存在
  const student = await prisma.customer.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      grade: true,
      enrollments: {
        where: classId ? { classId } : undefined,
        include: {
          class: true,
        },
      },
    },
  });

  if (!student) {
    throw new Error('学生不存在');
  }

  if (student.enrollments.length === 0) {
    throw new Error('学生未加入任何班级');
  }

  const enrollmentIds = student.enrollments.map(e => e.id);

  // 获取成长标签数据
  const growthLogs = await prisma.growthLog.findMany({
    where: {
      enrollmentId: { in: enrollmentIds },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      tag: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 按日期聚合成长趋势
  const trendMap = new Map<string, { positiveCount: number; negativeCount: number }>();
  
  growthLogs.forEach(log => {
    const date = log.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD 格式
    if (!trendMap.has(date)) {
      trendMap.set(date, { positiveCount: 0, negativeCount: 0 });
    }
    
    const dayData = trendMap.get(date)!;
    if (log.tag.type === TagType.GROWTH_POSITIVE) {
      dayData.positiveCount++;
    } else if (log.tag.type === TagType.GROWTH_NEGATIVE) {
      dayData.negativeCount++;
    }
  });

  const growthTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
    date,
    positiveCount: data.positiveCount,
    negativeCount: data.negativeCount,
  }));

  // 统计高频标签
  const tagStatsMap = new Map<number, { tag: any; count: number }>();
  
  growthLogs.forEach(log => {
    if (!tagStatsMap.has(log.tag.id)) {
      tagStatsMap.set(log.tag.id, { tag: log.tag, count: 0 });
    }
    tagStatsMap.get(log.tag.id)!.count++;
  });

  const allTagStats = Array.from(tagStatsMap.values());
  
  const positiveTagStats = allTagStats
    .filter(stat => stat.tag.type === TagType.GROWTH_POSITIVE)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const negativeTagStats = allTagStats
    .filter(stat => stat.tag.type === TagType.GROWTH_NEGATIVE)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 获取考勤数据
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      enrollmentId: { in: enrollmentIds },
      recordDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const attendanceSummary = {
    totalDays: attendanceRecords.length,
    presentDays: attendanceRecords.filter(r => r.status === 'PRESENT').length,
    lateDays: attendanceRecords.filter(r => r.status === 'LATE').length,
    absentDays: attendanceRecords.filter(r => r.status === 'ABSENT').length,
    noShowDays: attendanceRecords.filter(r => r.status === 'NO_SHOW').length,
    attendanceRate: 0,
  };

  attendanceSummary.attendanceRate = attendanceSummary.totalDays > 0 
    ? Math.round(((attendanceSummary.presentDays + attendanceSummary.lateDays) / attendanceSummary.totalDays) * 10000) / 100
    : 0;

  return {
    studentId: student.id,
    studentName: student.name,
    dateRange: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    growthTrend,
    topTags: {
      positive: positiveTagStats.map(stat => ({
        tagId: stat.tag.id,
        tagText: stat.tag.text,
        count: stat.count,
      })),
      negative: negativeTagStats.map(stat => ({
        tagId: stat.tag.id,
        tagText: stat.tag.text,
        count: stat.count,
      })),
    },
    attendanceSummary,
    // TODO: 如果需要整体成长得分，可以在这里添加计算逻辑
    overallScore: undefined,
  };
};

// ================================
// 财务分析
// ================================

/**
 * 获取财务分析汇总
 */
export const getFinanceAnalyticsSummary = async (
  filters: FinanceFilters
) => {
  const { startDate, endDate } = filters;

  // 1) 收入（收款）趋势和总额
  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalReceivedDecimal = payments.reduce((sum, p) => sum.plus(p.amount), new Decimal(0));

  const revenueMap = new Map<string, Decimal>();
  payments.forEach((p) => {
    const day = p.paymentDate.toISOString().split('T')[0];
    if (!revenueMap.has(day)) revenueMap.set(day, new Decimal(0));
    revenueMap.set(day, revenueMap.get(day)!.plus(p.amount));
  });

  const revenueTrend = Array.from(revenueMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, amount]) => ({ date, amount: parseFloat(amount.toString()) }));

  // 2) 应收趋势和总额（按订单到期日统计）
  const ordersDueInRange = await prisma.financialOrder.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalDueDecimal = ordersDueInRange.reduce(
    (sum, o) => sum.plus(o.totalDue),
    new Decimal(0)
  );

  const dueMap = new Map<string, Decimal>();
  ordersDueInRange.forEach((o) => {
    if (!o.dueDate) return;
    const day = o.dueDate.toISOString().split('T')[0];
    if (!dueMap.has(day)) dueMap.set(day, new Decimal(0));
    dueMap.set(day, dueMap.get(day)!.plus(o.totalDue));
  });

  const dueTrend = Array.from(dueMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, amount]) => ({ date, amount: parseFloat(amount.toString()) }));

  // 3) 欠款与状态分布、Top 欠款学生
  const allOrders = await prisma.financialOrder.findMany({
    include: { payments: true, student: true },
  });

  let totalOutstanding = new Decimal(0);
  const statusCount: Record<'PAID_FULL' | 'PARTIAL_PAID' | 'UNPAID', number> = {
    PAID_FULL: 0,
    PARTIAL_PAID: 0,
    UNPAID: 0,
  };

  const studentOwedMap = new Map<number, { name: string; owed: Decimal }>();

  allOrders.forEach((order) => {
    const paid = order.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
    const remaining = order.totalDue.minus(paid);
    if (remaining.greaterThan(0)) totalOutstanding = totalOutstanding.plus(remaining);

    let status: 'PAID_FULL' | 'PARTIAL_PAID' | 'UNPAID' = 'UNPAID';
    if (remaining.lessThanOrEqualTo(0)) status = 'PAID_FULL';
    else if (paid.greaterThan(0)) status = 'PARTIAL_PAID';
    statusCount[status]++;

    // 聚合学生欠款
    const studentId = order.studentId;
    const studentName = (order as any).student?.name || `学生${studentId}`;
    if (!studentOwedMap.has(studentId)) {
      studentOwedMap.set(studentId, { name: studentName, owed: new Decimal(0) });
    }
    if (remaining.greaterThan(0)) {
      const entry = studentOwedMap.get(studentId)!;
      entry.owed = entry.owed.plus(remaining);
    }
  });

  const outstandingByStatus = (['PAID_FULL', 'PARTIAL_PAID', 'UNPAID'] as const).map(
    (k) => ({ status: k, count: statusCount[k] })
  );

  const topDebtors = Array.from(studentOwedMap.entries())
    .map(([id, { name, owed }]) => ({
      studentId: id,
      studentName: name,
      totalOwed: parseFloat(owed.toString()),
    }))
    .filter((s) => s.totalOwed > 0)
    .sort((a, b) => b.totalOwed - a.totalOwed)
    .slice(0, 10);

  return {
    keyMetrics: {
      totalReceived: parseFloat(totalReceivedDecimal.toString()),
      totalDue: parseFloat(totalDueDecimal.toString()),
      totalOutstanding: parseFloat(totalOutstanding.toString()),
    },
    revenueTrend,
    dueTrend,
    outstandingByStatus,
    topDebtors,
  };
};

/**
 * 获取学生成长分析数据（通过publicId）
 * TODO: 暂时使用原函数，等Prisma类型问题解决后启用
 */
export const getStudentGrowthAnalysisByPublicId = async (publicId: string, filters: StudentGrowthFilters) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { publicId } });
    
    if (!customer) {
      throw new Error('学生不存在');
    }
    
    return getStudentGrowthAnalysis(customer.id, filters);
  } catch (error) {
    console.error('通过publicId获取成长分析时发生错误:', error);
    throw error;
  }
};

/**
 * 获取用于分析的学生列表
 */
export const getStudentsForAnalytics = async () => {
  const students = await prisma.customer.findMany({
    where: {
      enrollments: {
        some: {}, // 只返回已注册班级的学生
      },
    },
    select: {
      id: true,
      publicId: true,
      name: true,
      enrollments: {
        include: {
          class: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return students.map(student => ({
    id: student.id,
    publicId: student.publicId,
    name: student.name,
    classNames: student.enrollments.map(e => e.class.name),
  }));
}; 