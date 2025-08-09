import apiClient from '@/lib/apiClient';

// Dashboard 摘要数据类型定义 (扩展版本)
export interface DashboardSummaryResponse {
  financial: {
    monthlyReceived: number;      // 本月实收
    monthlyDue: number;           // 本月应收  
    totalOutstanding: number;     // 当前待收总额
  };
  followUps: {
    id: number;
    name: string;
    sourceChannel: string;
    nextFollowUpDate: string;
    phone?: string;
    parentName?: string;
    parentRelationship?: string;
    status?: string;
  }[];
  overview: {
    totalStudents: number;        // 总学生数
    totalClasses: number;         // 总班级数
    activeExams: number;          // 活跃考试数
    pendingFollowUps: number;     // 待跟进客户数
  };
  customerStats: {
    totalCustomers: number;       // 总客户数
    newThisMonth: number;         // 本月新增客户
    conversionRate: number;       // 转化率
    statusDistribution: { status: string; count: number; percentage: number }[];
  };
  attendance: {
    todayAttendanceRate: number;  // 今日出勤率
    weeklyAttendanceRate: number; // 本周出勤率
    totalPresentToday: number;    // 今日出勤人数
    totalAbsentToday: number;     // 今日缺勤人数
  };
  examStats: {
    recentExams: number;          // 最近考试数量
    upcomingExams: number;        // 即将到来的考试
    averageScore: number;         // 平均分数
    subjectPerformance: { subject: string; averageScore: number; examCount: number }[];
  };
  growthActivity: {
    totalGrowthLogs: number;      // 总成长记录数
    positiveLogsThisWeek: number; // 本周正面记录
    negativeLogsThisWeek: number; // 本周负面记录
    mostActiveClasses: { className: string; logsCount: number }[];
  };
  quickStats: {
    topSourceChannels: { channel: string; count: number; percentage: number }[];
    recentActivities: { type: string; description: string; timestamp: string }[];
  };
}

/**
 * 获取核心仪表盘的摘要数据
 * API: GET /dashboard/summary
 * 
 * 根据 DashboardWorkflow.md:
 * - 财务速览：本月实收、本月应收、当前待收总额
 * - 待办提醒：所有"下次跟进日期"为今天的客户
 */
export const getDashboardSummary = async (): Promise<DashboardSummaryResponse> => {
  try {
    const response = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary');
    console.log('📊 Dashboard API 原始响应:', response.data);
    return response.data; // 后端直接返回数据，不需要 .data 包装
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    throw error;
  }
};

/**
 * 刷新仪表盘数据 (手动刷新按钮使用)
 */
export const refreshDashboardData = async (): Promise<DashboardSummaryResponse> => {
  // 添加缓存清除参数，确保获取最新数据
  try {
    const response = await apiClient.get<DashboardSummaryResponse>(
      `/dashboard/summary?_t=${Date.now()}`
    );
    console.log('🔄 Dashboard 刷新响应:', response.data);
    return response.data; // 后端直接返回数据，不需要 .data 包装
  } catch (error) {
    console.error('刷新仪表盘数据失败:', error);
    throw error;
  }
}; 