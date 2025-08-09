import { useState, useEffect, useCallback, useMemo } from 'react';
import { growthApi } from '@/api/growthApi';
import * as examApi from '@/api/examApi';
import type { 
  Identifier,
  IdentifierInfo,
  UseUnifiedGrowthDataReturn,
  UseUnifiedGrowthDataOptions,
  UnifiedGrowthData
} from '@/types/unifiedGrowthReport';
import type { GrowthSummary, KalmanConfig, ChartData } from '@/api/growthApi';
import type { ExamHistory } from '@/types/unifiedGrowthReport';

// ================================
// 工具函数
// ================================

/**
 * 智能识别标识符类型
 */
const analyzeIdentifier = (identifier: Identifier): IdentifierInfo => {
  const stringValue = String(identifier);
  const isNumeric = /^\d+$/.test(stringValue);
  
  let type: IdentifierInfo['type'];
  if (isNumeric) {
    // 纯数字一般是 enrollmentId 或 studentId
    // 根据业务逻辑，我们默认认为是 enrollmentId
    type = 'enrollmentId';
  } else {
    // 非纯数字认为是 publicId
    type = 'publicId';
  }
  
  return {
    value: identifier,
    type,
    isNumeric
  };
};

/**
 * 获取成长数据
 */
const fetchGrowthData = async (identifierInfo: IdentifierInfo): Promise<GrowthSummary> => {
  if (identifierInfo.isNumeric) {
    // 数字ID，调用 enrollmentId 版本
    return await growthApi.getStudentGrowthSummary(Number(identifierInfo.value));
  } else {
    // 字符串ID，调用 publicId 版本
    return await growthApi.getStudentGrowthSummaryByPublicId(String(identifierInfo.value));
  }
};

/**
 * 获取考试数据
 */
const fetchExamData = async (
  identifierInfo: IdentifierInfo,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<ExamHistory> => {
  if (identifierInfo.isNumeric) {
    // 如果是数字ID，我们无法直接调用API，因为后端只支持publicId
    // 需要先通过其他方式获取publicId，或者抛出错误提示
    console.warn('数字ID不支持直接获取考试历史，需要publicId');
    throw new Error('考试历史查询需要使用publicId，不支持数字ID');
  } else {
    // 字符串ID，使用 publicId 版本，传递日期范围参数
    return await examApi.getStudentExamHistoryByPublicId(
      String(identifierInfo.value),
      dateRange
    );
  }
};

/**
 * 获取卡尔曼配置
 */
const fetchKalmanConfig = async (): Promise<KalmanConfig> => {
  return await growthApi.getActiveGrowthConfig();
};

/**
 * 获取图表数据（可选）
 */
const fetchChartData = async (
  identifierInfo: IdentifierInfo,
  growthData: GrowthSummary
): Promise<ChartData | null> => {
  try {
    if (growthData?.enrollment?.id) {
      return await growthApi.getStudentGrowthChart(growthData.enrollment.id, {
        // 可以根据需要添加筛选条件
      });
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch chart data:', error);
    return null;
  }
};

// ================================
// 主Hook
// ================================

/**
 * 统一的成长数据获取Hook
 * 
 * @param identifier - 学生标识符 (publicId 或 enrollmentId)
 * @param options - 配置选项
 * @returns 统一的数据状态和操作方法
 */
export const useUnifiedGrowthData = (
  identifier: Identifier,
  options: UseUnifiedGrowthDataOptions = {}
): UseUnifiedGrowthDataReturn => {
  const {
    enableExamData = true,
    enableConfig = true,
    enableChartData = false,
    dateRange
  } = options;

  // 状态管理
  const [growthData, setGrowthData] = useState<GrowthSummary | null>(null);
  const [examData, setExamData] = useState<ExamHistory | null>(null);
  const [config, setConfig] = useState<KalmanConfig | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 分析标识符
  const identifierInfo = useMemo(() => analyzeIdentifier(identifier), [identifier]);

  // 计算是否完全加载
  const isFullyLoaded = useMemo(() => {
    if (loading) return false;
    
    const hasRequiredGrowthData = !!growthData;
    const hasRequiredExamData = !enableExamData || !!examData;
    const hasRequiredConfig = !enableConfig || !!config;
    const hasRequiredChartData = !enableChartData || !!chartData;
    
    return hasRequiredGrowthData && hasRequiredExamData && hasRequiredConfig && hasRequiredChartData;
  }, [loading, growthData, examData, config, chartData, enableExamData, enableConfig, enableChartData]);

  // 数据加载函数
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading unified growth data for identifier:', identifier, identifierInfo);
      
      // 第一优先级：成长数据（必需）
      const growthDataPromise = fetchGrowthData(identifierInfo);
      
      // 第二优先级：考试数据（可选）
      const examDataPromise = enableExamData 
        ? fetchExamData(identifierInfo, dateRange)
        : Promise.resolve(null);
      
      // 第三优先级：配置数据（可选）
      const configPromise = enableConfig 
        ? fetchKalmanConfig()
        : Promise.resolve(null);
      
      // 并行获取核心数据
      const [growth, exam, kalmanConfig] = await Promise.all([
        growthDataPromise,
        examDataPromise,
        configPromise
      ]);

      // 更新状态
      setGrowthData(growth);
      setExamData(exam);
      setConfig(kalmanConfig);
      
      // 第四优先级：图表数据（完全可选，失败不影响主流程）
      if (enableChartData && growth) {
        try {
          const chart = await fetchChartData(identifierInfo, growth);
          setChartData(chart);
        } catch (chartError) {
          console.warn('Chart data fetch failed, but continuing:', chartError);
          setChartData(null);
        }
      }
      
      console.log('Successfully loaded unified growth data:', {
        growth: !!growth,
        exam: !!exam,
        config: !!kalmanConfig
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据加载失败';
      console.error('Failed to load unified growth data:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [identifier, identifierInfo, enableExamData, enableConfig, enableChartData, dateRange]);

  // 重新获取数据
  const refetch = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // 设置错误（外部调用）
  const setErrorExternal = useCallback((newError: string | null) => {
    setError(newError);
  }, []);

  // 数据加载副作用
  useEffect(() => {
    if (identifier) {
      loadAllData();
    }
  }, [identifier, loadAllData]);

  // 清理函数
  useEffect(() => {
    return () => {
      // 组件卸载时清理状态
      setGrowthData(null);
      setExamData(null);
      setConfig(null);
      setChartData(null);
      setError(null);
    };
  }, []);

  return {
    // 数据状态
    growthData,
    examData,
    config,
    chartData,
    loading,
    error,
    isFullyLoaded,
    
    // 操作方法
    refetch,
    setError: setErrorExternal
  };
};

// ================================
// 辅助Hook
// ================================

/**
 * 仅获取成长数据的轻量级Hook
 */
export const useGrowthData = (identifier: Identifier) => {
  return useUnifiedGrowthData(identifier, {
    enableExamData: false,
    enableConfig: false,
    enableChartData: false
  });
};

/**
 * 仅获取考试数据的Hook
 */
export const useExamData = (identifier: Identifier, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  
  return useUnifiedGrowthData(identifier, {
    enableExamData: enabled,
    enableConfig: false,
    enableChartData: false
  });
};

/**
 * 获取配置数据的Hook
 */
export const useGrowthConfig = (options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  
  // 对于配置数据，我们使用一个占位符标识符，因为配置是全局的
  return useUnifiedGrowthData('config', {
    enableExamData: false,
    enableConfig: enabled,
    enableChartData: false
  });
};