import apiClient from '@/lib/apiClient';

// Dashboard 摘要数据类型定义 (基于 API 文档)
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
  }[];
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