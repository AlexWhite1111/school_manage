// src/services/dashboard.service.ts
import { prisma } from '../utils/database';
import { Decimal } from '@prisma/client/runtime/library';


// ================================
// 类型定义
// ================================

interface DashboardSummary {
  followUps: any[];
  overview: {
    totalStudents: number;
    totalClasses: number;
    activeExams: number;
    pendingFollowUps: number;
  };
  customerStats: {
    totalCustomers: number;
    newThisMonth: number;
    conversionRate: number;
    statusDistribution: { status: string; count: number; percentage: number }[];
  };
  attendance: {
    todayAttendanceRate: number;
    weeklyAttendanceRate: number;
    totalPresentToday: number;
    totalAbsentToday: number;
  };
  examStats: {
    recentExams: number;
    upcomingExams: number;
    averageScore: number;
    subjectPerformance: { subject: string; averageScore: number; examCount: number }[];
  };

  quickStats: {
    topSourceChannels: { channel: string; count: number; percentage: number }[];
    recentActivities: { type: string; description: string; timestamp: string }[];
  };
}

// ----------------------------------------
// Service Functions
// ----------------------------------------

/**
 * @description 获取核心仪表盘的扩展摘要数据
 * @returns {Promise<DashboardSummary>} - 返回完整的仪表盘数据
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  try {
    // 获取当前日期范围
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // 本周日期范围
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // 今日日期范围（北京时间）
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayStr = beijingTime.toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00.000Z');
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    console.log('🚀 获取扩展仪表盘数据...');

    // 并行获取所有数据
    const [
      followUpReminders,
      overviewStats,
      customerStats,
      attendanceStats,
      examStats,
      quickStats
    ] = await Promise.all([
      getFollowUpReminders(today, tomorrow),
      getOverviewStats(),
      getCustomerStats(currentMonth, nextMonth),
      getAttendanceStats(today, tomorrow, startOfWeek),
      getExamStats(),
      getQuickStats(currentMonth, nextMonth)
    ]);

    const summary: DashboardSummary = {
      followUps: followUpReminders,
      overview: overviewStats,
      customerStats,
      attendance: attendanceStats,
      examStats,
      quickStats
    };

    console.log(`✅ 仪表盘数据获取完成，今日待跟进客户：${followUpReminders.length}个`);
    return summary;

  } catch (error) {
    console.error('获取仪表盘摘要数据时发生错误:', error);
    throw new Error('获取仪表盘摘要数据失败');
  }
};



/**
 * @description 获取今日待办提醒
 */
const getFollowUpReminders = async (today: Date, tomorrow: Date) => {
  const todayReminders = await prisma.customer.findMany({
    where: {
      nextFollowUpDate: { gte: today, lt: tomorrow }
    },
    select: {
      id: true,
      name: true,
      sourceChannel: true,
      nextFollowUpDate: true,
      status: true,
      parents: {
        select: { phone: true, name: true, relationship: true },
        take: 1
      }
    },
    orderBy: { nextFollowUpDate: 'asc' }
  });

  // 源渠道映射
  const sourceChannelMap: Record<string, string> = {
    'JIAZHANG_TUIJIAN': '家长推荐',
    'PENGYOU_QINQI': '朋友亲戚',
    'XUESHENG_SHEJIAO': '学生社交圈',
    'GUANGGAO_CHUANDAN': '广告传单',
    'DITUI_XUANCHUAN': '地推宣传',
    'WEIXIN_GONGZHONGHAO': '微信公众号',
    'DOUYIN': '抖音',
    'QITA_MEITI': '其他媒体',
    'HEZUO': '合作',
    'QITA': '其他'
  };

  return todayReminders.map(customer => ({
    id: customer.id,
    name: customer.name,
    sourceChannel: sourceChannelMap[customer.sourceChannel || ''] || customer.sourceChannel || '未知',
    nextFollowUpDate: customer.nextFollowUpDate?.toISOString().split('T')[0] || '',
    phone: customer.parents[0]?.phone || undefined,
    parentName: customer.parents[0]?.name || undefined,
    parentRelationship: customer.parents[0]?.relationship || undefined,
    status: customer.status
  }));
};

/**
 * @description 获取总览统计数据
 */
const getOverviewStats = async () => {
  const [totalStudents, totalClasses, activeExams, pendingFollowUps] = await Promise.all([
    // 总学生数（已注册班级的客户）
    prisma.customer.count({
      where: {
        enrollments: { some: {} }
      }
    }),
    // 总班级数
    prisma.class.count(),
    // 活跃考试数（本月的考试）
    prisma.exam.count({
      where: {
        deletedAt: null,
        examDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      }
    }),
    // 待跟进客户数
    prisma.customer.count({
      where: {
        nextFollowUpDate: {
          gte: new Date(),
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 未来7天
        }
      }
    })
  ]);

  return {
    totalStudents,
    totalClasses,
    activeExams,
    pendingFollowUps
  };
};

/**
 * @description 获取客户统计数据
 */
const getCustomerStats = async (currentMonth: Date, nextMonth: Date) => {
  // 总客户数
  const totalCustomers = await prisma.customer.count();
  
  // 本月新增客户
  const newThisMonth = await prisma.customer.count({
    where: {
      createdAt: { gte: currentMonth, lt: nextMonth }
    }
  });

  // 客户状态分布
  const statusGroups = await prisma.customer.groupBy({
    by: ['status'],
    _count: { id: true }
  });

  const statusMap: Record<string, string> = {
    'POTENTIAL': '潜在用户',
    'INITIAL_CONTACT': '初步沟通',
    'INTERESTED': '意向用户',
    'TRIAL_CLASS': '试课',
    'ENROLLED': '已报名',
    'LOST': '流失客户'
  };

  let statusDistribution = statusGroups.map(group => ({
    status: statusMap[group.status] || group.status,
    count: group._count.id,
    percentage: totalCustomers > 0 ? Math.round((group._count.id / totalCustomers) * 100) : 0
  }));

  // 统一展示顺序：潜在用户置顶
  const statusOrder: Record<string, number> = {
    '潜在用户': 0,
    '初步沟通': 1,
    '意向用户': 2,
    '试课': 3,
    '已报名': 4,
    '流失客户': 5
  };
  statusDistribution = statusDistribution.sort((a, b) => (statusOrder[a.status as keyof typeof statusOrder] ?? 99) - (statusOrder[b.status as keyof typeof statusOrder] ?? 99));

  // 转化率计算（已报名/总客户）
  const enrolledCount = statusGroups.find(g => g.status === 'ENROLLED')?._count.id || 0;
  const conversionRate = totalCustomers > 0 ? Math.round((enrolledCount / totalCustomers) * 10000) / 100 : 0;

  return {
    totalCustomers,
    newThisMonth,
    conversionRate,
    statusDistribution
  };
};

/**
 * @description 获取考勤统计数据
 */
const getAttendanceStats = async (today: Date, tomorrow: Date, startOfWeek: Date) => {
  // 今日考勤统计
  const todayAttendance = await prisma.attendanceRecord.findMany({
    where: {
      recordDate: { gte: today, lt: tomorrow }
    }
  });

  // 本周考勤统计
  const weeklyAttendance = await prisma.attendanceRecord.findMany({
    where: {
      recordDate: { gte: startOfWeek }
    }
  });

  const totalPresentToday = todayAttendance.filter(r => r.status === 'PRESENT').length;
  const totalAbsentToday = todayAttendance.filter(r => r.status === 'ABSENT' || r.status === 'NO_SHOW').length;
  
  const todayAttendanceRate = todayAttendance.length > 0 
    ? Math.round((totalPresentToday / todayAttendance.length) * 100) 
    : 0;

  const weeklyPresentCount = weeklyAttendance.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const weeklyAttendanceRate = weeklyAttendance.length > 0 
    ? Math.round((weeklyPresentCount / weeklyAttendance.length) * 100) 
    : 0;

  return {
    todayAttendanceRate,
    weeklyAttendanceRate,
    totalPresentToday,
    totalAbsentToday
  };
};

/**
 * @description 获取考试统计数据
 */
const getExamStats = async () => {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 最近考试数量
  const recentExams = await prisma.exam.count({
    where: {
      deletedAt: null,
      examDate: { gte: monthAgo, lte: now }
    }
  });

  // 即将到来的考试
  const upcomingExams = await prisma.exam.count({
    where: {
      deletedAt: null,
      examDate: { gt: now, lte: monthLater }
    }
  });

  // 平均分和科目表现
  const recentScores = await prisma.examScore.findMany({
    where: {
      score: { not: null },
      exam: {
        deletedAt: null,
        examDate: { gte: monthAgo }
      }
    },
    include: {
      exam: true
    }
  });

  const validScores = recentScores.filter(s => s.score !== null);
  const averageScore = validScores.length > 0 
    ? Math.round((validScores.reduce((sum, s) => sum + (s.score || 0), 0) / validScores.length) * 10) / 10
    : 0;

  // 科目表现统计
  const subjectMap = new Map<string, { total: number; count: number }>();
  const subjectLabels: Record<string, string> = {
    'CHINESE': '语文', 'MATH': '数学', 'ENGLISH': '英语',
    'PHYSICS': '物理', 'CHEMISTRY': '化学', 'BIOLOGY': '生物',
    'HISTORY': '历史', 'GEOGRAPHY': '地理', 'POLITICS': '政治'
  };

  validScores.forEach(score => {
    const subject = score.subject;
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { total: 0, count: 0 });
    }
    const data = subjectMap.get(subject)!;
    data.total += score.score || 0;
    data.count += 1;
  });

  const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject: subjectLabels[subject] || subject,
    averageScore: Math.round((data.total / data.count) * 10) / 10,
    examCount: data.count
  })).sort((a, b) => b.averageScore - a.averageScore);

  return {
    recentExams,
    upcomingExams,
    averageScore,
    subjectPerformance: subjectPerformance.slice(0, 5) // 取前5个科目
  };
};



/**
 * @description 获取快速统计数据
 */
const getQuickStats = async (currentMonth: Date, nextMonth: Date) => {
  // 本月来源渠道统计
  const sourceChannelGroups = await prisma.customer.groupBy({
    by: ['sourceChannel'],
    where: {
      createdAt: { gte: currentMonth, lt: nextMonth },
      sourceChannel: { not: null }
    },
    _count: { id: true }
  });

  const channelMap: Record<string, string> = {
    'JIAZHANG_TUIJIAN': '家长推荐',
    'PENGYOU_QINQI': '朋友亲戚',
    'XUESHENG_SHEJIAO': '学生社交圈',
    'GUANGGAO_CHUANDAN': '广告传单',
    'DITUI_XUANCHUAN': '地推宣传',
    'WEIXIN_GONGZHONGHAO': '微信公众号',
    'DOUYIN': '抖音',
    'QITA_MEITI': '其他媒体',
    'HEZUO': '合作',
    'QITA': '其他'
  };

  const totalChannelCustomers = sourceChannelGroups.reduce((sum, g) => sum + g._count.id, 0);
  const topSourceChannels = sourceChannelGroups
    .map(group => ({
      channel: channelMap[group.sourceChannel || ''] || group.sourceChannel || '未知',
      count: group._count.id,
      percentage: totalChannelCustomers > 0 ? Math.round((group._count.id / totalChannelCustomers) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 最近活动记录 - 从数据库查询真实数据
  const recentActivities: Array<{
    type: string;
    description: string;
    timestamp: string;
  }> = [];
  
  // 获取最近的客户创建记录
  const recentCustomers = await prisma.customer.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 最近24小时
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { name: true, createdAt: true }
  });

  recentCustomers.forEach(customer => {
    recentActivities.push({
      type: 'customer',
      description: `新增客户：${customer.name}`,
      timestamp: customer.createdAt.toISOString()
    });
  });

  // 获取最近的考试记录
  const recentExams = await prisma.exam.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: { name: true, createdAt: true }
  });

  recentExams.forEach(exam => {
    recentActivities.push({
      type: 'exam',
      description: `新增考试：${exam.name}`,
      timestamp: exam.createdAt.toISOString()
    });
  });

  // 获取最近的成长记录
  const recentGrowthLogs = await prisma.growthLog.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: {
      enrollment: {
        include: {
          student: { select: { name: true } }
        }
      },
      tag: { select: { text: true } }
    }
  });

  recentGrowthLogs.forEach((log) => {
    recentActivities.push({
      type: 'growth',
      description: `${log.enrollment.student.name} 新增成长标签：${log.tag.text}`,
      timestamp: log.createdAt.toISOString()
    });
  });

  // 按时间排序，取最新的5条
    recentActivities
  const finalActivities = recentActivities.slice(0, 5);

  return {
    topSourceChannels,
    recentActivities: finalActivities
  };
};