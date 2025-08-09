import { useMemo } from 'react';
import type { 
  UnifiedReportConfig, 
  PresetConfigKey 
} from '@/types/unifiedGrowthReport';

// ================================
// 默认配置
// ================================

export const DEFAULT_CONFIG: UnifiedReportConfig = {
  features: {
    examAnalysis: true,
    growthPrediction: true,
    kalmanConfig: false,
    tagManagement: true,
    pdfExport: true,
    wordCloud: true,
    radarChart: true,
  },
  viewMode: 'detailed',
  layout: {
    showHeader: true,
    showSidebar: false,
    columnsCount: 2,
  },
  filters: {
    timeRange: undefined,
    subjects: [],
    tagTypes: [],
  },
};

// ================================
// 预设配置
// ================================

export const PRESET_CONFIGS: Record<PresetConfigKey, UnifiedReportConfig> = {
  // 对应原 StudentGrowthReport - 最丰富的功能
  DETAILED_WITH_EXAMS: {
    features: {
      examAnalysis: true,        // ✅ 完整的考试历史分析
      tagManagement: true,       // ✅ ExamTagManager
      pdfExport: true,          // ✅ html2canvas + jsPDF
      wordCloud: true,          // ✅ 基础词云
      radarChart: true,         // ✅ RadarChart (Recharts)
      growthPrediction: false,  // ❌ 无
      kalmanConfig: false,      // ❌ 无
    },
    viewMode: 'detailed',
    layout: {
      showHeader: true,
      showSidebar: false,
      columnsCount: 2,
    },
    filters: {
      timeRange: undefined,
      subjects: [],
      tagTypes: [],
    },
  },
  
  // 对应原 StudentGrowthReportPage - 专业分析
  PROFESSIONAL_ANALYSIS: {
    features: {
      examAnalysis: false,      // ❌ 无
      tagManagement: false,     // ❌ 无
      pdfExport: false,        // ❌ 无
      wordCloud: false,        // ❌ 无
      radarChart: false,       // ❌ 无
      growthPrediction: true,  // ✅ GrowthPredictionPanel
      kalmanConfig: true,      // ✅ 专业预测分析
    },
    viewMode: 'professional',
    layout: {
      showHeader: true,
      showSidebar: false,
      columnsCount: 1,
    },
    filters: {
      timeRange: undefined,
      subjects: [],
      tagTypes: [],
    },
  },
  
  // 对应原 EnhancedStudentGrowthReport - 增强功能
  ENHANCED_COMPACT: {
    features: {
      examAnalysis: false,      // ❌ 无
      tagManagement: false,     // ❌ 无
      pdfExport: true,         // ✅ 导出功能
      wordCloud: true,         // ✅ 高级词云
      radarChart: false,       // ❌ 无
      growthPrediction: false, // ❌ 无
      kalmanConfig: true,      // ✅ 配置面板
    },
    viewMode: 'compact',
    layout: {
      showHeader: true,
      showSidebar: false,
      columnsCount: 3,
    },
    filters: {
      timeRange: undefined,
      subjects: [],
      tagTypes: [],
    },
  },
};

// ================================
// 配置管理Hook
// ================================

/**
 * 配置管理Hook
 * 
 * @param presetKey - 预设配置键
 * @param customConfig - 自定义配置（会覆盖预设配置）
 * @returns 最终的配置对象
 */
export const useGrowthConfig = (
  presetKey?: PresetConfigKey,
  customConfig?: Partial<UnifiedReportConfig>
): UnifiedReportConfig => {
  return useMemo(() => {
    // 选择基础配置
    let baseConfig: UnifiedReportConfig;
    
    if (presetKey && PRESET_CONFIGS[presetKey]) {
      baseConfig = PRESET_CONFIGS[presetKey];
    } else {
      baseConfig = DEFAULT_CONFIG;
    }
    
    // 如果没有自定义配置，直接返回基础配置
    if (!customConfig) {
      return baseConfig;
    }
    
    // 深度合并配置
    return {
      ...baseConfig,
      ...customConfig,
      features: {
        ...baseConfig.features,
        ...customConfig.features,
      },
      layout: {
        ...baseConfig.layout,
        ...customConfig.layout,
      },
      filters: {
        ...baseConfig.filters,
        ...customConfig.filters,
      },
    };
  }, [presetKey, customConfig]);
};

// ================================
// 配置验证和工具函数
// ================================

/**
 * 验证配置的有效性
 */
export const validateConfig = (config: Partial<UnifiedReportConfig>): string[] => {
  const errors: string[] = [];
  
  // 验证视图模式
  if (config.viewMode && !['compact', 'detailed', 'professional'].includes(config.viewMode)) {
    errors.push('Invalid viewMode: must be compact, detailed, or professional');
  }
  
  // 验证列数
  if (config.layout?.columnsCount && ![1, 2, 3].includes(config.layout.columnsCount)) {
    errors.push('Invalid columnsCount: must be 1, 2, or 3');
  }
  
  // 验证时间范围
  if (config.filters?.timeRange) {
    const [start, end] = config.filters.timeRange;
    if (!start || !end || new Date(start) > new Date(end)) {
      errors.push('Invalid timeRange: start date must be before end date');
    }
  }
  
  return errors;
};

/**
 * 根据数据完整性推荐最佳配置
 */
export const recommendConfig = (
  hasExamData: boolean,
  hasGrowthData: boolean,
  hasKalmanConfig: boolean
): PresetConfigKey => {
  if (hasExamData && hasGrowthData) {
    return 'DETAILED_WITH_EXAMS';
  } else if (hasGrowthData && hasKalmanConfig) {
    return 'PROFESSIONAL_ANALYSIS';
  } else {
    return 'ENHANCED_COMPACT';
  }
};

/**
 * 获取配置的功能列表（用于调试）
 */
export const getEnabledFeatures = (config: UnifiedReportConfig): string[] => {
  return Object.entries(config.features)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
};

/**
 * 检查配置是否启用了某个功能
 */
export const isFeatureEnabled = (
  config: UnifiedReportConfig,
  feature: keyof UnifiedReportConfig['features']
): boolean => {
  return config.features[feature] === true;
}; 