// Growth标签系统统一常量定义
// 替代原有的predefinedTags.ts，解决新旧数据模型不一致问题

// Growth标签情感极性枚举
export type GrowthSentiment = 'POSITIVE' | 'NEGATIVE';

// Growth标签类型枚举（数据库存储）
export type GrowthTagType = 'GROWTH_POSITIVE' | 'GROWTH_NEGATIVE';

// 统一的标签类型显示文本
export const SENTIMENT_LABELS: Record<GrowthSentiment, string> = {
  POSITIVE: '正面表现',
  NEGATIVE: '需要改进'
};

// 情感极性到数据库类型的映射
export const SENTIMENT_TO_TYPE: Record<GrowthSentiment, GrowthTagType> = {
  POSITIVE: 'GROWTH_POSITIVE',
  NEGATIVE: 'GROWTH_NEGATIVE'
};

// 数据库类型到情感极性的映射
export const TYPE_TO_SENTIMENT: Record<GrowthTagType, GrowthSentiment> = {
  GROWTH_POSITIVE: 'POSITIVE',
  GROWTH_NEGATIVE: 'NEGATIVE'
};

// 预设标签配置（统一格式）
export const PREDEFINED_GROWTH_TAGS: Array<{
  text: string;
  sentiment: GrowthSentiment;
  defaultWeight: number;
}> = [
  // 正面表现标签
  { text: '演草工整', sentiment: 'POSITIVE', defaultWeight: 5 },
  { text: '主动提问', sentiment: 'POSITIVE', defaultWeight: 7 },
  { text: '按时完成作业', sentiment: 'POSITIVE', defaultWeight: 6 },
  { text: '积极参与讨论', sentiment: 'POSITIVE', defaultWeight: 7 },
  { text: '课前预习', sentiment: 'POSITIVE', defaultWeight: 8 },
  { text: '作业整洁', sentiment: 'POSITIVE', defaultWeight: 5 },
  { text: '主动帮助同学', sentiment: 'POSITIVE', defaultWeight: 8 },
  
  // 需要改进标签
  { text: '作业拖拉', sentiment: 'NEGATIVE', defaultWeight: 6 },
  { text: '上课走神', sentiment: 'NEGATIVE', defaultWeight: 7 },
  { text: '作业不整洁', sentiment: 'NEGATIVE', defaultWeight: 4 },
  { text: '缺乏主动性', sentiment: 'NEGATIVE', defaultWeight: 6 },
  { text: '容易分心', sentiment: 'NEGATIVE', defaultWeight: 5 },
  { text: '不按时完成作业', sentiment: 'NEGATIVE', defaultWeight: 7 },
  { text: '课堂参与度低', sentiment: 'NEGATIVE', defaultWeight: 6 },
  { text: '依赖他人', sentiment: 'NEGATIVE', defaultWeight: 5 },
  { text: '情绪波动大', sentiment: 'NEGATIVE', defaultWeight: 6 },
  { text: '缺乏自信', sentiment: 'NEGATIVE', defaultWeight: 5 }
];

// 获取情感极性的显示文本
export const getSentimentLabel = (sentiment: GrowthSentiment): string => {
  return SENTIMENT_LABELS[sentiment];
};

// 获取情感极性的颜色
export const getSentimentColor = (sentiment: GrowthSentiment): string => {
  return sentiment === 'POSITIVE' ? 'var(--ant-color-success)' : 'var(--ant-color-error)';
};

// 权重等级描述
export const WEIGHT_LABELS: Record<number, string> = {
  1: '轻微',
  2: '轻微',
  3: '轻微',
  4: '一般',
  5: '一般',
  6: '一般',
  7: '明显',
  8: '明显',
  9: '非常明显',
  10: '非常明显'
};

// 获取权重描述
export const getWeightLabel = (weight: number): string => {
  const normalizedWeight = Math.max(1, Math.min(10, Math.round(weight)));
  return WEIGHT_LABELS[normalizedWeight] || '一般';
};

// 获取权重颜色
export const getWeightColor = (weight: number): string => {
  if (weight <= 3) return 'var(--ant-color-error)';
  if (weight <= 6) return 'var(--ant-color-warning)';
  return 'var(--ant-color-success)';
};