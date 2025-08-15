// Growth 颜色强度与映射配置（统一入口）
// 规则：
// - 正面强度越大 → 越蓝（primary family）
// - 负面强度越大 → 越红（error family）
// - 稳定/接近0 → 次级文字色

export const growthColorThresholds = {
  // 根据业务自定义：强度阈值（绝对值）
  level: [0.5, 1.5] as [number, number],
  trend: [0.2, 0.8] as [number, number],
  stableEpsilon: 0.1,
} as const;

const pickIntensityIndex = (magnitude: number, [t1, t2]: [number, number]): 0 | 1 | 2 => {
  if (magnitude >= t2) return 2;
  if (magnitude >= t1) return 1;
  return 0;
};

// 提供CSS变量缺省回退，避免部分主题变量不存在导致无色显示
const cssVar = (name: string, fallback: string) => `var(${name}, ${fallback})`;

const primaryByIndex = (idx: 0 | 1 | 2): string =>
  idx === 2
    ? cssVar('--ant-color-primary-active', '#0958d9')
    : idx === 1
    ? cssVar('--ant-color-primary-hover', '#4096ff')
    : cssVar('--ant-color-primary', '#1677ff');

const redByIndex = (idx: 0 | 1 | 2): string =>
  idx === 2
    ? cssVar('--ant-color-error-active', '#d9363e')
    : idx === 1
    ? cssVar('--ant-color-error-hover', '#ff7875')
    : cssVar('--ant-color-error', '#ff4d4f');

const successByIndex = (idx: 0 | 1 | 2): string =>
  idx === 2
    ? cssVar('--ant-color-success-active', '#389e0d')
    : idx === 1
    ? cssVar('--ant-color-success-hover', '#95de64')
    : cssVar('--ant-color-success', '#52c41a');

// 根据“水平”强度与情感极性返回颜色
// 水平颜色：统一使用主色（蓝系）按强度分档，不区分正负面
export function getLevelColor(level: number): string {
  const idx = pickIntensityIndex(Math.abs(level), growthColorThresholds.level);
  return primaryByIndex(idx);
}

// 根据趋势（可正可负）返回颜色；正→蓝，负→红，近零→次级文本色
// 趋势颜色：区分情感极性
// - 正面标签：趋势↑(>=0) 绿色分档，趋势↓ 红色分档
// - 负面标签：趋势↑(>=0) 红色分档（变差），趋势↓ 绿色分档（改善）
export function getTrendColor(trend: number, sentiment: 'POSITIVE' | 'NEGATIVE'): string {
  const { stableEpsilon, trend: thresholds } = growthColorThresholds;
  if (Math.abs(trend) < stableEpsilon) return cssVar('--ant-color-text-secondary', 'rgba(0,0,0,0.45)');
  const idx = pickIntensityIndex(Math.abs(trend), thresholds);
  const isPositiveTrend = trend >= 0;
  const isGood = (sentiment === 'POSITIVE' && isPositiveTrend) || (sentiment === 'NEGATIVE' && !isPositiveTrend);
  return isGood ? successByIndex(idx) : redByIndex(idx);
}

export default {
  growthColorThresholds,
  getLevelColor,
  getTrendColor,
};

