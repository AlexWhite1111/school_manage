// 统一成长报告组件库入口文件

// 核心组件
export { default as StudentInfoHeader } from './core/StudentInfoHeader';
export { default as GrowthOverview } from './core/GrowthOverview';

// Hooks
export { useUnifiedGrowthData, useGrowthData, useExamData } from '@/hooks/useUnifiedGrowthData';
export { 
  useGrowthConfig, 
  PRESET_CONFIGS, 
  DEFAULT_CONFIG,
  validateConfig,
  recommendConfig,
  getEnabledFeatures,
  isFeatureEnabled
} from '@/hooks/useGrowthConfig';

// 类型定义
export type {
  UnifiedReportConfig,
  PresetConfigKey,
  UnifiedGrowthData,
  UnifiedDataState,
  UnifiedStudentGrowthReportProps,
  StudentInfoHeaderProps,
  GrowthOverviewProps,
  ExamHistory,
  Identifier,
  IdentifierInfo
} from '@/types/unifiedGrowthReport';

// 预设配置常量 - 方便外部使用
export const GROWTH_REPORT_PRESETS = {
  /** 详细模式 - 包含考试分析、标签管理等完整功能 */
  DETAILED_WITH_EXAMS: 'DETAILED_WITH_EXAMS' as const,
  
  /** 专业模式 - 专注于成长预测和卡尔曼分析 */
  PROFESSIONAL_ANALYSIS: 'PROFESSIONAL_ANALYSIS' as const,
  
  /** 紧凑模式 - 简化显示，适合快速查看 */
  ENHANCED_COMPACT: 'ENHANCED_COMPACT' as const
} as const;

// 类型导入
import type { UnifiedReportConfig } from '@/types/unifiedGrowthReport';

// 工具函数
export const createGrowthReportConfig = (
  preset: keyof typeof GROWTH_REPORT_PRESETS,
  overrides?: Partial<UnifiedReportConfig>
): Partial<UnifiedReportConfig> => {
  return {
    ...(overrides || {}),
    // 这里可以添加预设配置的合并逻辑
  };
}; 