import apiClient from '@/lib/apiClient';
import type { 
  CustomerFunnelData,
  SourceChannelAnalysis,
  CustomerAnalyticsComparison,
  StudentGrowthAnalytics,
  AnalyticsKeyMetrics,
  CustomerAnalyticsParams,
  StudentGrowthAnalyticsParams,
  AnalyticsTimeRangeParams,
  FinanceAnalyticsSummary,
  FinanceAnalyticsParams
} from '@/types/api';

// ================================
// 参数转换辅助函数
// ================================

/**
 * 将嵌套的时间参数转换为展平的查询参数格式
 */
const flattenTimeParams = (params: AnalyticsTimeRangeParams): Record<string, any> => {
  const flatParams: Record<string, any> = {
    startDate: params.startDate,
    endDate: params.endDate,
  };

  if (params.compareWith) {
    flatParams['compareWith.type'] = params.compareWith.type;
    flatParams['compareWith.startDate'] = params.compareWith.startDate;
    flatParams['compareWith.endDate'] = params.compareWith.endDate;
  }

  return flatParams;
};

/**
 * 将客户分析参数转换为展平格式
 */
const flattenCustomerAnalyticsParams = (params: CustomerAnalyticsParams): Record<string, any> => {
  const flatParams = flattenTimeParams(params);
  
  if (params.sourceChannel) {
    flatParams.sourceChannel = params.sourceChannel;
  }
  
  if (params.customerTags && params.customerTags.length > 0) {
    flatParams.customerTags = params.customerTags.join(',');
  }
  
  return flatParams;
};

/**
 * 将学生分析参数转换为展平格式
 */
const flattenStudentAnalyticsParams = (params: StudentGrowthAnalyticsParams): Record<string, any> => {
  const flatParams = flattenTimeParams(params);
  
  if (params.classId) {
    flatParams.classId = params.classId;
  }
  
  if (params.gradeLevel) {
    flatParams.gradeLevel = params.gradeLevel;
  }
  
  return flatParams;
};

// ================================
// 数据分析 API
// ================================

/**
 * 获取客户漏斗分析数据
 * @route GET /analytics/customer-funnel
 */
export const getCustomerFunnel = async (params: CustomerAnalyticsParams): Promise<CustomerFunnelData> => {
  try {
    const flatParams = flattenCustomerAnalyticsParams(params);
    const response = await apiClient.get<CustomerFunnelData>('/analytics/customer-funnel', { params: flatParams });
    console.log('📊 获取客户漏斗数据成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取客户漏斗数据失败:', error);
    throw error;
  }
};

/**
 * 获取客户漏斗分析数据（包含时间对比）
 * @route GET /analytics/customer-funnel-comparison
 */
export const getCustomerFunnelComparison = async (params: CustomerAnalyticsParams): Promise<CustomerAnalyticsComparison> => {
  try {
    const flatParams = flattenCustomerAnalyticsParams(params);
    const response = await apiClient.get<CustomerAnalyticsComparison>('/analytics/customer-funnel-comparison', { params: flatParams });
    console.log('📊 获取客户漏斗对比数据成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取客户漏斗对比数据失败:', error);
    throw error;
  }
};

/**
 * 获取来源渠道分析数据
 * @route GET /analytics/source-channels
 */
export const getSourceChannelAnalysis = async (params: CustomerAnalyticsParams): Promise<SourceChannelAnalysis> => {
  try {
    const flatParams = flattenCustomerAnalyticsParams(params);
    const response = await apiClient.get<SourceChannelAnalysis>('/analytics/source-channels', { params: flatParams });
    console.log('📊 获取来源渠道分析数据成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取来源渠道分析数据失败:', error);
    throw error;
  }
};

/**
 * 获取客户分析核心指标
 * @route GET /analytics/customer-key-metrics
 */
export const getCustomerKeyMetrics = async (params: CustomerAnalyticsParams): Promise<AnalyticsKeyMetrics> => {
  try {
    const flatParams = flattenCustomerAnalyticsParams(params);
    const response = await apiClient.get<AnalyticsKeyMetrics>('/analytics/customer-key-metrics', { params: flatParams });
    console.log('📊 获取客户核心指标成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取客户核心指标失败:', error);
    throw error;
  }
};

/**
 * 获取学生成长分析数据
 * @route GET /analytics/student-growth/by-public-id/:publicId
 */
export const getStudentGrowthAnalytics = async (
  publicId: string, 
  params: StudentGrowthAnalyticsParams
): Promise<StudentGrowthAnalytics> => {
  try {
    const flatParams = flattenStudentAnalyticsParams(params);
    const response = await apiClient.get<StudentGrowthAnalytics>(
      `/analytics/student-growth/by-public-id/${publicId}`, 
      { params: flatParams }
    );
    console.log('📊 获取学生成长分析数据成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取学生成长分析数据失败:', error);
    throw error;
  }
};

/**
 * 获取所有可用的学生列表（用于分析页面的学生选择器）
 * @route GET /analytics/students
 */
export const getStudentsForAnalytics = async (): Promise<{ id: number; publicId: string; name: string; classNames: string[] }[]> => {
  try {
    const response = await apiClient.get<{ id: number; publicId: string; name: string; classNames: string[] }[]>('/analytics/students');
    console.log('📊 获取分析用学生列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取分析用学生列表失败:', error);
    throw error;
  }
};

/**
 * 获取财务分析汇总
 * @route GET /analytics/finance/summary
 */
export const getFinanceAnalyticsSummary = async (
  params: FinanceAnalyticsParams
): Promise<FinanceAnalyticsSummary> => {
  try {
    const response = await apiClient.get<FinanceAnalyticsSummary>('/analytics/finance/summary', { params });
    return response.data;
  } catch (error) {
    // 兼容旧后端：404时回退到 /finance/summary
    // @ts-expect-error 兼容统一ApiError结构
    if (error && error.code === 404) {
      try {
        const fallback = await apiClient.get<FinanceAnalyticsSummary>('/finance/summary', { params });
        return fallback.data;
      } catch (e) {
        console.error('获取财务分析汇总失败(兼容路径回退也失败):', e);
        throw e;
      }
    }
    console.error('获取财务分析汇总失败:', error);
    throw error;
  }
};

// ================================
// 时间范围计算辅助函数
// ================================

/**
 * 计算时间范围参数的辅助函数
 */
export const calculateTimeRangeParams = (
  days: number, 
  includeComparison: boolean = false,
  comparisonType: 'previous_period' | 'same_period_last_year' = 'previous_period'
): AnalyticsTimeRangeParams => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days + 1); // 包含当天

  const params: AnalyticsTimeRangeParams = {
    startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD 格式
    endDate: endDate.toISOString().split('T')[0],
  };

  if (includeComparison) {
    if (comparisonType === 'previous_period') {
      // 上一周期：往前推相同天数
      const prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - days + 1);

      params.compareWith = {
        type: 'previous_period',
        startDate: prevStartDate.toISOString().split('T')[0],
        endDate: prevEndDate.toISOString().split('T')[0],
      };
    } else {
      // 去年同期
      const lastYearStartDate = new Date(startDate);
      lastYearStartDate.setFullYear(lastYearStartDate.getFullYear() - 1);
      const lastYearEndDate = new Date(endDate);
      lastYearEndDate.setFullYear(lastYearEndDate.getFullYear() - 1);

      params.compareWith = {
        type: 'same_period_last_year',
        startDate: lastYearStartDate.toISOString().split('T')[0],
        endDate: lastYearEndDate.toISOString().split('T')[0],
      };
    }
  }

  return params;
};

/**
 * 自定义时间范围参数
 */
export const createCustomTimeRangeParams = (
  startDate: string,
  endDate: string,
  includeComparison: boolean = false,
  comparisonType: 'previous_period' | 'same_period_last_year' = 'previous_period'
): AnalyticsTimeRangeParams => {
  const params: AnalyticsTimeRangeParams = {
    startDate,
    endDate,
  };

  if (includeComparison) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (comparisonType === 'previous_period') {
      const prevEndDate = new Date(start);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);

      params.compareWith = {
        type: 'previous_period',
        startDate: prevStartDate.toISOString().split('T')[0],
        endDate: prevEndDate.toISOString().split('T')[0],
      };
    } else {
      const lastYearStartDate = new Date(start);
      lastYearStartDate.setFullYear(lastYearStartDate.getFullYear() - 1);
      const lastYearEndDate = new Date(end);
      lastYearEndDate.setFullYear(lastYearEndDate.getFullYear() - 1);

      params.compareWith = {
        type: 'same_period_last_year',
        startDate: lastYearStartDate.toISOString().split('T')[0],
        endDate: lastYearEndDate.toISOString().split('T')[0],
      };
    }
  }

  return params;
}; 