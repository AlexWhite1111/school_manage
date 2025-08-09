/**
 * 考试成绩计算工具函数
 * 统一处理各种考试相关的计算逻辑，避免代码重复
 */

export interface ScoreStatistics {
  averageScore: number;
  normalizedAverageScore: number;
  highestScore: number;
  lowestScore: number;
  participationRate: number;
  passRate: number;
  excellentRate: number;
  excellentLine: number;
}

export interface NormalizedScoreData {
  originalScore: number;
  normalizedScore: number;
}

/**
 * 计算归一化分数（转换为100分制）
 */
export const calculateNormalizedScores = (scores: number[], totalScore: number): number[] => {
  return scores.map(score => (score / totalScore) * 100);
};

/**
 * 计算优秀线（基于班级规模的自适应标准）
 * @param normalizedScores 归一化分数数组
 */
export const calculateExcellentLine = (normalizedScores: number[]): number => {
  const studentCount = normalizedScores.length;
  
  if (studentCount === 0) {
    return 90; // 无学生时返回默认值
  }
  
  const sortedScores = [...normalizedScores].sort((a, b) => b - a);
  
  let topCount: number;
  
  if (studentCount >= 10) {
    // 大班级：前25%
    topCount = Math.ceil(studentCount * 0.25);
  } else if (studentCount >= 4) {
    // 中小班级：前4名
    topCount = Math.min(4, studentCount);
  } else {
    // 极小班级：第1名就是优秀线
    topCount = 1;
  }
  
  const topScores = sortedScores.slice(0, topCount);
  return Math.round((topScores.reduce((sum, score) => sum + score, 0) / topScores.length) * 100) / 100;
};

/**
 * 计算平均分
 */
export const calculateAverage = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

/**
 * 计算科目统计数据
 */
export const calculateSubjectStatistics = (
  scores: Array<{ score: number | null; isAbsent: boolean }>,
  totalScore: number
): ScoreStatistics => {
  // 过滤有效成绩
  const validScores = scores.filter(s => !s.isAbsent && s.score !== null);
  const scoreValues = validScores.map(s => s.score!);
  
  if (scoreValues.length === 0) {
    return {
      averageScore: 0,
      normalizedAverageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      participationRate: 0,
      passRate: 0,
      excellentRate: 0,
      excellentLine: 90
    };
  }
  
  // 计算归一化分数
  const normalizedScores = calculateNormalizedScores(scoreValues, totalScore);
  const excellentLine = calculateExcellentLine(normalizedScores);
  
  return {
    averageScore: calculateAverage(scoreValues),
    normalizedAverageScore: calculateAverage(normalizedScores),
    highestScore: Math.max(...scoreValues),
    lowestScore: Math.min(...scoreValues),
    participationRate: scores.length > 0 ? (validScores.length / scores.length) * 100 : 0,
    passRate: normalizedScores.length > 0 ? (normalizedScores.filter(score => score >= 60).length / normalizedScores.length) * 100 : 0,
    excellentRate: normalizedScores.length > 0 ? (normalizedScores.filter(score => score >= excellentLine).length / normalizedScores.length) * 100 : 0,
    excellentLine: excellentLine
  };
};

/**
 * 计算学生排名和百分位
 */
export const calculateRanksAndPercentiles = (
  scores: Array<{ id: number; score: number | null; isAbsent: boolean }>
): Array<{ id: number; rank: number | null; percentile: string | null }> => {
  // 过滤有效成绩并排序
  const validScores = scores.filter(s => !s.isAbsent && s.score !== null);
  const sortedValidScores = validScores.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  return scores.map(score => {
    if (score.isAbsent || score.score === null) {
      return { id: score.id, rank: null, percentile: null };
    }
    
    const rank = sortedValidScores.findIndex(s => s.id === score.id) + 1;
    const percentile = ((validScores.length - rank + 1) / validScores.length * 100).toFixed(1);
    
    return { id: score.id, rank, percentile };
  });
};

/**
 * 生成分数分布数据
 */
export const generateScoreDistribution = (
  originalScores: number[], 
  normalizedScores: number[], 
  totalScore: number
) => {
  const ranges = [
    { range: '90-100', min: 90, max: 100 },
    { range: '80-89', min: 80, max: 89 },
    { range: '70-79', min: 70, max: 79 },
    { range: '60-69', min: 60, max: 69 },
    { range: '50-59', min: 50, max: 59 },
    { range: '0-49', min: 0, max: 49 }
  ];

  // 原始分分布
  const originalDistribution = ranges.map(range => {
    const adjustedMin = (range.min / 100) * totalScore;
    const adjustedMax = (range.max / 100) * totalScore;
    
    const count = originalScores.filter(score => 
      score >= adjustedMin && score <= adjustedMax
    ).length;
    
    const percentage = originalScores.length > 0 ? (count / originalScores.length) * 100 : 0;
    
    return {
      range: range.range,
      count,
      percentage: Math.round(percentage * 100) / 100
    };
  });

  // 归一化分分布
  const normalizedDistribution = ranges.map(range => {
    const count = normalizedScores.filter(score => 
      score >= range.min && score <= range.max
    ).length;
    
    const percentage = normalizedScores.length > 0 ? (count / normalizedScores.length) * 100 : 0;
    
    return {
      range: range.range,
      count,
      percentage: Math.round(percentage * 100) / 100
    };
  });

  const excellentLine = calculateExcellentLine(normalizedScores);

  return {
    original: originalDistribution.filter(r => r.count > 0),
    normalized: normalizedDistribution.filter(r => r.count > 0),
    excellentLine: excellentLine,
    totalScore: totalScore
  };
}; 