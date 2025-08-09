import dayjs from 'dayjs';
import type { GrowthSummary } from '../api/growthApi';

// ================================
// Growth 计算工具函数
// ================================

export const growthUtils = {
  /**
   * 计算变化率
   */
  calculateChangeRate: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  },

  /**
   * 格式化成长分数
   */
  formatGrowthScore: (score: number, precision: number = 1): string => {
    return score.toFixed(precision);
  },

  /**
   * 获取趋势方向
   */
  getTrendDirection: (trend: number): 'UP' | 'DOWN' | 'STABLE' => {
    if (trend > 0.1) return 'UP';
    if (trend < -0.1) return 'DOWN';
    return 'STABLE';
  },

  /**
   * 格式化置信度
   */
  formatConfidence: (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  },

  /**
   * 根据趋势获取颜色
   */
  getColorByTrend: (direction: 'UP' | 'DOWN' | 'STABLE'): string => {
    switch (direction) {
      case 'UP': return '#52c41a';
      case 'DOWN': return '#ff4d4f';
      case 'STABLE': return '#faad14';
      default: return '#8c8c8c';
    }
  },

  /**
   * 根据情感极性获取颜色
   */
  getColorBySentiment: (sentiment: 'POSITIVE' | 'NEGATIVE'): string => {
    return sentiment === 'POSITIVE' ? '#52c41a' : '#ff4d4f';
  },

  /**
   * 计算整体趋势
   */
  calculateOverallTrend: (states: GrowthSummary['states']): 'IMPROVING' | 'DECLINING' | 'STABLE' => {
    if (states.length === 0) return 'STABLE';
    
    const improvingCount = states.filter(s => s.trendDirection === 'UP').length;
    const decliningCount = states.filter(s => s.trendDirection === 'DOWN').length;
    
    if (improvingCount > decliningCount) return 'IMPROVING';
    if (decliningCount > improvingCount) return 'DECLINING';
    return 'STABLE';
  },

  /**
   * 计算成长分数
   */
  calculateGrowthScore: (states: GrowthSummary['states']): number => {
    if (states.length === 0) return 0;
    
    const totalScore = states.reduce((sum, state) => {
      // 权重基于置信度和观测次数
      const weight = state.confidence * Math.min(state.totalObservations / 10, 1);
      return sum + (state.level * weight);
    }, 0);
    
    const totalWeight = states.reduce((sum, state) => {
      const weight = state.confidence * Math.min(state.totalObservations / 10, 1);
      return sum + weight;
    }, 0);
    
    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;
  },

  /**
   * 获取权重描述
   */
  getWeightDescription: (weight: number): string => {
    if (weight >= 8) return '非常显著';
    if (weight >= 6) return '显著';
    if (weight >= 4) return '一般';
    if (weight >= 2) return '轻微';
    return '微弱';
  },

  /**
   * 获取置信度描述
   */
  getConfidenceDescription: (confidence: number): string => {
    if (confidence >= 0.8) return '高置信度';
    if (confidence >= 0.6) return '中等置信度';
    if (confidence >= 0.4) return '低置信度';
    return '极低置信度';
  },

  /**
   * 格式化时间
   */
  formatTimeAgo: (dateString: string): string => {
    const date = dayjs(dateString);
    const now = dayjs();
    const diffDays = now.diff(date, 'day');
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  },

  /**
   * 生成趋势描述
   */
  generateTrendDescription: (state: GrowthSummary['states'][0]): string => {
    const { tagName, trendDirection, sentiment, totalObservations } = state;
    const direction = trendDirection === 'UP' ? '上升' : trendDirection === 'DOWN' ? '下降' : '稳定';
    const type = sentiment === 'POSITIVE' ? '正面' : '负面';
    
    return `${tagName}(${type})趋势${direction}，共${totalObservations}次观测`;
  },

  /**
   * 验证权重范围
   */
  isValidWeight: (weight: number): boolean => {
    return Number.isInteger(weight) && weight >= 1 && weight <= 10;
  },

  /**
   * 生成词云数据
   */
  generateWordCloudData: (states: GrowthSummary['states']): Array<{
    text: string;
    value: number;
    type: 'positive' | 'negative';
  }> => {
    return states
      .filter(state => state.totalObservations > 0)
      .map(state => ({
        text: state.tagName,
        value: state.totalObservations,
        type: state.sentiment === 'POSITIVE' ? 'positive' as const : 'negative' as const
      }))
      .sort((a, b) => b.value - a.value);
  }
};

// ================================
// Growth 分析工具函数
// ================================

export const growthAnalytics = {
  /**
   * 分析学生成长状态
   */
  analyzeStates: (states: GrowthSummary['states']) => {
    const positiveStates = states.filter(s => s.sentiment === 'POSITIVE');
    const negativeStates = states.filter(s => s.sentiment === 'NEGATIVE');
    
    const totalObservations = states.reduce((sum, s) => sum + s.totalObservations, 0);
    const positiveObservations = positiveStates.reduce((sum, s) => sum + s.totalObservations, 0);
    const negativeObservations = negativeStates.reduce((sum, s) => sum + s.totalObservations, 0);
    
    const averageConfidence = states.length > 0 
      ? states.reduce((sum, s) => sum + s.confidence, 0) / states.length 
      : 0;
    
    const mostActiveTag = states.reduce((max, current) => 
      current.totalObservations > max.totalObservations ? current : max
    , states[0] || null);
    
    const recentlyUpdated = states.filter(s => {
      const daysSinceUpdate = dayjs().diff(dayjs(s.lastUpdatedAt), 'day');
      return daysSinceUpdate <= 7;
    });

    return {
      totalStates: states.length,
      positiveStates: positiveStates.length,
      negativeStates: negativeStates.length,
      totalObservations,
      positiveObservations,
      negativeObservations,
      positiveRatio: totalObservations > 0 ? positiveObservations / totalObservations : 0,
      negativeRatio: totalObservations > 0 ? negativeObservations / totalObservations : 0,
      averageConfidence,
      mostActiveTag,
      recentlyUpdatedCount: recentlyUpdated.length,
      overallScore: growthUtils.calculateGrowthScore(states),
      overallTrend: growthUtils.calculateOverallTrend(states)
    };
  },

  /**
   * 生成成长总结
   */
  generateSummary: (states: GrowthSummary['states'], student: GrowthSummary['student']) => {
    const analysis = growthAnalytics.analyzeStates(states);
    
    const strengthAreas = states
      .filter(s => s.sentiment === 'POSITIVE' && s.trendDirection === 'UP')
      .sort((a, b) => b.level - a.level)
      .slice(0, 3);
    
    const improvementAreas = states
      .filter(s => s.sentiment === 'NEGATIVE' && s.totalObservations > 2)
      .sort((a, b) => b.totalObservations - a.totalObservations)
      .slice(0, 3);
    
    return {
      student,
      analysis,
      strengthAreas: strengthAreas.map(state => ({
        tagName: state.tagName,
        level: state.level,
        trend: state.trendDirection,
        description: `在${state.tagName}方面表现优秀，趋势向好`
      })),
      improvementAreas: improvementAreas.map(state => ({
        tagName: state.tagName,
        level: state.level,
        trend: state.trendDirection,
        suggestion: `建议关注${state.tagName}方面的改进`
      })),
      overallAssessment: analysis.positiveRatio > 0.7 
        ? '整体表现优秀，继续保持' 
        : analysis.positiveRatio > 0.5 
        ? '整体表现良好，有提升空间' 
        : '需要重点关注和改进'
    };
  }
};

// ================================
// 数据转换工具函数
// ================================

export const growthDataTransform = {
  /**
   * 转换Growth状态为排名数据
   */
  transformToRankings: (states: GrowthSummary['states']) => {
    const positiveRanking = states
      .filter(s => s.sentiment === 'POSITIVE')
      .sort((a, b) => b.totalObservations - a.totalObservations)
      .slice(0, 10)
      .map(state => ({
        tagId: state.tagId,
        text: state.tagName,
        count: state.totalObservations
      }));

    const negativeRanking = states
      .filter(s => s.sentiment === 'NEGATIVE')
      .sort((a, b) => b.totalObservations - a.totalObservations)
      .slice(0, 10)
      .map(state => ({
        tagId: state.tagId,
        text: state.tagName,
        count: state.totalObservations
      }));

    return { positiveRanking, negativeRanking };
  },

  /**
   * 转换Growth状态为趋势数据
   */
  transformToTrendData: (states: GrowthSummary['states'], dateRange: { startDate: string; endDate: string }) => {
    // 生成日期序列
    const start = dayjs(dateRange.startDate);
    const end = dayjs(dateRange.endDate);
    const days = end.diff(start, 'day') + 1;
    
    const trendData = [];
    
    for (let i = 0; i < days; i++) {
      const date = start.add(i, 'day').format('YYYY-MM-DD');
      
      // 简单模拟：基于状态数据生成趋势
      const positiveCount = states
        .filter(s => s.sentiment === 'POSITIVE')
        .reduce((sum, s) => sum + Math.round(s.totalObservations / days), 0);
      
      const negativeCount = states
        .filter(s => s.sentiment === 'NEGATIVE')
        .reduce((sum, s) => sum + Math.round(s.totalObservations / days), 0);
      
      trendData.push({
        date,
        // 去除随机抖动，直接按均分统计，等待真实按日聚合数据替换
        positiveCount: Math.max(0, positiveCount),
        negativeCount: Math.max(0, negativeCount)
      });
    }
    
    return trendData;
  },

  /**
   * 生成汇总数据
   */
  generateSummaryData: (states: GrowthSummary['states']) => {
    const analysis = growthAnalytics.analyzeStates(states);
    const mostFrequentTag = analysis.mostActiveTag;
    
    return {
      totalLogs: analysis.totalObservations,
      positiveRatio: analysis.positiveRatio,
      negativeRatio: analysis.negativeRatio,
      mostFrequentTag: mostFrequentTag ? {
        text: mostFrequentTag.tagName,
        count: mostFrequentTag.totalObservations,
        type: mostFrequentTag.sentiment === 'POSITIVE' ? 'positive' as const : 'negative' as const
      } : {
        text: '暂无数据',
        count: 0,
        type: 'positive' as const
      }
    };
  }
};

export default {
  ...growthUtils,
  analytics: growthAnalytics,
  transform: growthDataTransform
}; 