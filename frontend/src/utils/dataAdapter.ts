import type { GrowthSummary } from '../api/growthApi';
import type { StudentGrowthReport } from '../api/studentLogApi';
import { growthDataTransform } from './growthUtils';

// ================================
// 数据适配器 - Growth API → StudentGrowthReport
// ================================

/**
 * 将Growth API数据转换为StudentGrowthReport格式
 * @param growthData Growth API返回的数据
 * @param examData 考试数据（可选）
 * @param dateRange 日期范围
 * @returns StudentGrowthReport格式的数据
 */
export const adaptGrowthDataToReport = (
  growthData: GrowthSummary,
  examData?: any,
  dateRange?: { startDate: string; endDate: string }
): StudentGrowthReport => {
  // 1. 学生基本信息适配
  const student = {
    id: growthData.student.id,
    publicId: growthData.student.publicId,
    name: growthData.student.name,
    school: undefined, // Growth API暂不包含学校信息
    grade: growthData.student.grade
  };

  // 2. 生成词云数据
  const wordCloud = extendedTransform.transformToWordCloud(growthData.states);

  // 3. 生成正面/负面标签排名
  const { positiveRanking, negativeRanking } = extendedTransform.transformToRankings(growthData.states);

  // 4. 生成趋势数据
  const growthTrend = dateRange 
    ? extendedTransform.transformToTrendData(growthData.states, dateRange)
    : [];

  // 5. 生成汇总数据
  const summary = extendedTransform.generateSummaryData(growthData.states);

  // 6. 考试分析数据（如果提供）
  const examAnalysis = examData ? {
    totalRecords: examData.totalRecords || 0,
    subjectAnalysis: examData.subjectAnalysis || [],
    allScores: examData.allScores || [],
    examTagsWordCloud: examData.examTagsWordCloud || []
  } : undefined;

  return {
    student,
    wordCloud,
    positiveTagsRanking: positiveRanking,
    negativeTagsRanking: negativeRanking,
    examAnalysis,
    growthTrend,
    summary
  };
};

/**
 * 扩展growthDataTransform，添加词云转换功能
 */
const extendedTransform = {
  ...growthDataTransform,
  
  /**
   * 转换Growth状态为词云数据
   */
  transformToWordCloud: (states: GrowthSummary['states']) => {
    return states
      .filter(state => state.totalObservations > 0)
      .map(state => ({
        text: state.tagName,
        value: state.totalObservations,
        type: state.sentiment === 'POSITIVE' ? 'positive' as const : 'negative' as const
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20); // 限制词云数量
  }
};

// 更新growthDataTransform导出
export { extendedTransform as growthDataTransform };

// ================================
// 考试数据适配器
// ================================

/**
 * 适配考试历史数据为StudentGrowthReport的examAnalysis格式
 * @param examHistoryData examApi.getStudentExamHistory返回的数据
 * @returns examAnalysis格式的数据
 */
export const adaptExamDataToAnalysis = (examHistoryData: any) => {
  if (!examHistoryData) {
    return undefined;
  }

  // 确保subjectAnalysis数据结构完整
  const adaptedSubjectAnalysis = (examHistoryData.subjectAnalysis || []).map((subject: any) => ({
    ...subject,
    classAverage: subject.classAverage || subject.average || 0, // 确保有classAverage字段
    classExcellentLine: subject.classExcellentLine,
    standardizedAverage: subject.standardizedAverage,
    examTags: subject.examTags || []
  }));

  return {
    totalRecords: examHistoryData.totalRecords || 0,
    subjectAnalysis: adaptedSubjectAnalysis,
    allScores: examHistoryData.allScores || [],
    examTagsWordCloud: examHistoryData.examTagsWordCloud || [],
    student: examHistoryData.student // 包含新的学生信息
  };
};

// ================================
// 数据合并工具
// ================================

/**
 * 合并Growth数据和考试数据
 * @param growthData Growth API数据
 * @param examData 考试API数据
 * @param dateRange 日期范围
 * @returns 完整的StudentGrowthReport数据
 */
export const mergeGrowthAndExamData = (
  growthData: GrowthSummary,
  examData?: any,
  dateRange?: { startDate: string; endDate: string }
): StudentGrowthReport => {
  // 适配考试数据
  const adaptedExamData = adaptExamDataToAnalysis(examData);
  
  // 生成完整报告数据
  return adaptGrowthDataToReport(growthData, adaptedExamData, dateRange);
};

// ================================
// 错误处理和数据验证
// ================================

/**
 * 验证Growth数据的完整性
 * @param data Growth数据
 * @returns 是否有效
 */
export const validateGrowthData = (data: any): data is GrowthSummary => {
  return (
    data &&
    typeof data === 'object' &&
    data.student &&
    typeof data.student.id === 'number' &&
    typeof data.student.name === 'string' &&
    Array.isArray(data.states) &&
    typeof data.overallTrend === 'string'
  );
};

/**
 * 验证考试数据的完整性
 * @param data 考试数据
 * @returns 是否有效
 */
export const validateExamData = (data: any): boolean => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.totalRecords === 'number' &&
    Array.isArray(data.subjectAnalysis)
  );
};

/**
 * 创建空的StudentGrowthReport数据结构
 * @param studentId 学生ID
 * @param studentName 学生姓名
 * @returns 空的报告数据
 */
export const createEmptyReport = (publicId: string, studentName: string): StudentGrowthReport => {
  return {
    student: {
      id: 0, // deprecated - will be removed
      publicId,
      name: studentName,
      school: undefined,
      grade: undefined
    },
    wordCloud: [],
    positiveTagsRanking: [],
    negativeTagsRanking: [],
    examAnalysis: undefined,
    growthTrend: [],
    summary: {
      totalLogs: 0,
      positiveRatio: 0,
      negativeRatio: 0,
      mostFrequentTag: {
        text: '暂无数据',
        count: 0,
        type: 'positive'
      }
    }
  };
};

// ================================
// 数据转换辅助函数
// ================================

/**
 * 安全地获取数值，提供默认值
 * @param value 原始值
 * @param defaultValue 默认值
 * @returns 安全的数值
 */
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * 安全地获取字符串，提供默认值
 * @param value 原始值
 * @param defaultValue 默认值
 * @returns 安全的字符串
 */
export const safeString = (value: any, defaultValue: string = ''): string => {
  return typeof value === 'string' ? value : defaultValue;
};

/**
 * 安全地获取数组，提供默认值
 * @param value 原始值
 * @param defaultValue 默认值
 * @returns 安全的数组
 */
export const safeArray = <T>(value: any, defaultValue: T[] = []): T[] => {
  return Array.isArray(value) ? value : defaultValue;
};

// ================================
// 调试和日志工具
// ================================

/**
 * 记录数据适配过程的调试信息
 * @param stage 阶段名称
 * @param data 数据
 */
export const logDataAdaptation = (stage: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 数据适配 - ${stage}:`, data);
  }
};

/**
 * 比较适配前后的数据结构
 * @param originalData 原始数据
 * @param adaptedData 适配后的数据
 */
export const compareDataStructures = (originalData: any, adaptedData: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.group('📊 数据结构对比');
    console.log('原始数据:', originalData);
    console.log('适配后数据:', adaptedData);
    console.groupEnd();
  }
}; 