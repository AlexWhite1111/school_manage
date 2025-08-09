// 统一成长报告系统类型定义
import type { GrowthSummary, KalmanConfig, ChartData } from '@/api/growthApi';

// 考试历史数据类型（基于examApi返回的实际格式）
export interface ExamHistory {
  totalRecords: number;
  subjectAnalysis: Array<{
    subject: string;
    scores: any[];
    totalExams: number;
    validScores: number;
    absentCount: number;
    average: number;
    highest: number;
    lowest: number;
    trend: 'improving' | 'declining' | 'stable';
    improvement: number;
  }>;
  allScores: any[];
}

// ================================
// 配置相关类型
// ================================

export interface UnifiedReportConfig {
  // 功能模块开关
  features: {
    examAnalysis: boolean;          // 考试分析
    growthPrediction: boolean;      // 成长预测
    kalmanConfig: boolean;          // 卡尔曼配置
    tagManagement: boolean;         // 标签管理
    pdfExport: boolean;            // PDF导出
    wordCloud: boolean;            // 词云显示
    radarChart: boolean;           // 雷达图
  };
  
  // 显示模式
  viewMode: 'compact' | 'detailed' | 'professional';
  
  // 布局配置
  layout: {
    showHeader: boolean;
    showSidebar: boolean;
    columnsCount: 1 | 2 | 3;
  };
  
  // 数据筛选
  filters: {
    timeRange?: [string, string];
    subjects?: string[];
    tagTypes?: string[];
  };
}

// 预设配置枚举
export type PresetConfigKey = 'DETAILED_WITH_EXAMS' | 'PROFESSIONAL_ANALYSIS' | 'ENHANCED_COMPACT';

// ================================
// 数据相关类型
// ================================

export interface UnifiedGrowthData {
  growthData: GrowthSummary | null;
  examData: ExamHistory | null;
  config: KalmanConfig | null;
  chartData?: ChartData | null;
}

export interface UnifiedDataState extends UnifiedGrowthData {
  loading: boolean;
  error: string | null;
  isFullyLoaded: boolean;
}

// ================================
// 组件相关类型
// ================================

export interface BaseComponentProps {
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface StudentInfoHeaderProps extends BaseComponentProps {
  student?: GrowthSummary['student'];
  onBack?: () => void;
  showActions?: boolean;
}

export interface GrowthOverviewProps extends BaseComponentProps {
  data: GrowthSummary | null;
  viewMode: UnifiedReportConfig['viewMode'];
}

export interface ExamAnalysisPanelProps extends BaseComponentProps {
  data: ExamHistory | null;
  showDetails?: boolean;
  onSubjectClick?: (subjectData: any) => void;
}

export interface GrowthPredictionPanelProps extends BaseComponentProps {
  data: GrowthSummary | null;
  config: KalmanConfig | null;
}

export interface KalmanConfigPanelProps extends BaseComponentProps {
  config: KalmanConfig | null;
  onConfigChange?: (config: KalmanConfig) => void;
}

// ================================
// 主组件接口
// ================================

export interface UnifiedStudentGrowthReportProps {
  identifier: Identifier;  // Support both publicId and enrollmentId
  config?: Partial<UnifiedReportConfig>;
  onBack?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

// ================================
// Hook 相关类型
// ================================

export interface UseUnifiedGrowthDataOptions {
  enableExamData?: boolean;
  enableConfig?: boolean;
  enableChartData?: boolean;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface UseUnifiedGrowthDataReturn extends UnifiedDataState {
  refetch: () => Promise<void>;
  setError: (error: string | null) => void;
}

// ================================
// 事件相关类型
// ================================

export interface ReportEvent {
  type: 'view_change' | 'export' | 'filter_change' | 'config_change';
  payload: any;
  timestamp: number;
}

export type ReportEventHandler = (event: ReportEvent) => void;

// ================================
// 工具类型
// ================================

export type Identifier = string | number;

export interface IdentifierInfo {
  value: Identifier;
  type: 'publicId' | 'enrollmentId' | 'studentId';
  isNumeric: boolean;
}