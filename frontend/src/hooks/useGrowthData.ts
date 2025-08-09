import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { growthApi } from '@/api/growthApi';
import type { 
  GrowthTag, 
  GrowthLogRequest, 
  GrowthSummary,
  GrowthTagFilters,
  CreateGrowthTagRequest,
  UpdateGrowthTagRequest,
  BatchGrowthLogRequest
} from '@/api/growthApi';
import { getSentimentLabel, type GrowthSentiment } from '@/constants/growthConstants';

// ================================
// Growth数据管理Hook
// ================================

export const useGrowthData = () => {
  const [growthTags, setGrowthTags] = useState<GrowthTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载Growth标签
  const loadGrowthTags = useCallback(async (filters?: GrowthTagFilters) => {
    try {
      setLoading(true);
      setError(null);
      const tags = await growthApi.getGrowthTags(filters);
      setGrowthTags(tags);
      return tags;
    } catch (err) {
      const errorMessage = '加载Growth标签失败';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Load growth tags failed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 记录成长日志
  const recordGrowthLog = useCallback(async (data: GrowthLogRequest) => {
    // 前端数据验证
    if (!data.enrollmentId || data.enrollmentId <= 0) {
      const errorMessage = '无效的学生注册ID';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (!data.tagId || data.tagId <= 0) {
      const errorMessage = '无效的标签ID';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (data.weight && (data.weight < 1 || data.weight > 10)) {
      const errorMessage = '权重必须在1-10之间';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (data.context && data.context.length > 100) {
      const errorMessage = '上下文说明不能超过100个字符';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      const result = await growthApi.recordGrowthLog(data);
      
      // 找到对应的标签并显示成功消息
      const tag = growthTags.find(t => t.id === data.tagId);
      const sentimentLabel = tag?.sentiment ? getSentimentLabel(tag.sentiment as GrowthSentiment) : '';
      const weightText = data.weight ? ` (权重: ${data.weight})` : '';
      const contextText = data.context ? ` - ${data.context}` : '';
      
      message.success(`记录${sentimentLabel}"${tag?.text}"成功${weightText}${contextText}`);
      
      // 刷新标签使用统计
      await loadGrowthTags();
      
      return result;
    } catch (err) {
      const errorMessage = '记录成长日志失败';
      message.error(errorMessage);
      console.error('Record growth log failed:', err);
      throw err;
    }
  }, [growthTags, loadGrowthTags]);

  // 批量记录成长日志
  const batchRecordGrowthLogs = useCallback(async (records: GrowthLogRequest[]) => {
    try {
      const result = await growthApi.batchRecordGrowthLogs({ records });
      
      message.success(`批量记录完成：成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
      
      // 刷新标签使用统计
      await loadGrowthTags();
      
      return result;
    } catch (err) {
      const errorMessage = '批量记录失败';
      message.error(errorMessage);
      console.error('Batch record growth logs failed:', err);
      throw err;
    }
  }, [loadGrowthTags]);

  // 创建Growth标签
  const createGrowthTag = useCallback(async (data: CreateGrowthTagRequest) => {
    // 前端数据验证
    if (!data.text?.trim()) {
      const errorMessage = '标签名称不能为空';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (data.text.length < 2 || data.text.length > 20) {
      const errorMessage = '标签名称长度必须在2-20个字符之间';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (!['POSITIVE', 'NEGATIVE'].includes(data.sentiment)) {
      const errorMessage = '标签类型必须是正面表现或需要改进';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (data.defaultWeight < 1 || data.defaultWeight > 10) {
      const errorMessage = '权重必须在1-10之间';
      message.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      const newTag = await growthApi.createGrowthTag(data);
      const sentimentLabel = getSentimentLabel(data.sentiment as GrowthSentiment);
      message.success(`创建${sentimentLabel}标签"${newTag.text}"成功`);
      await loadGrowthTags();
      return newTag;
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message;
      const errorMessage = apiMsg || '创建标签失败';
      message.error(errorMessage);
      console.error('Create growth tag failed:', err);
      throw err;
    }
  }, [loadGrowthTags]);

  // 更新Growth标签
  const updateGrowthTag = useCallback(async (id: number, data: UpdateGrowthTagRequest) => {
    try {
      const updatedTag = await growthApi.updateGrowthTag(id, data);
      message.success(`更新标签"${updatedTag.text}"成功`);
      
      // 刷新标签列表
      await loadGrowthTags();
      
      return updatedTag;
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message;
      const errorMessage = apiMsg || '更新标签失败';
      message.error(errorMessage);
      console.error('Update growth tag failed:', err);
      throw err;
    }
  }, [loadGrowthTags]);

  // 删除Growth标签
  const deleteGrowthTag = useCallback(async (id: number) => {
    try {
      await growthApi.deleteGrowthTag(id);
      message.success('删除标签成功');
      
      // 刷新标签列表
      await loadGrowthTags();
    } catch (err) {
      const errorMessage = '删除标签失败';
      message.error(errorMessage);
      console.error('Delete growth tag failed:', err);
      throw err;
    }
  }, [loadGrowthTags]);

  // 初始化加载
  useEffect(() => {
    loadGrowthTags();
  }, [loadGrowthTags]);

  return {
    // 状态
    growthTags,
    loading,
    error,
    
    // 操作函数
    loadGrowthTags,
    recordGrowthLog,
    batchRecordGrowthLogs,
    createGrowthTag,
    updateGrowthTag,
    deleteGrowthTag,
    
    // 辅助函数
    getPositiveTags: () => growthTags.filter(tag => tag.sentiment === 'POSITIVE' && tag.isGrowthTag),
    getNegativeTags: () => growthTags.filter(tag => tag.sentiment === 'NEGATIVE' && tag.isGrowthTag),
    getTagById: (id: number) => growthTags.find(tag => tag.id === id),
    getTotalUsage: () => growthTags.reduce((sum, tag) => sum + tag.usageCount, 0),
  };
};

// ================================
// 学生成长数据Hook
// ================================

export const useStudentGrowthData = (enrollmentId?: number) => {
  const [growthSummary, setGrowthSummary] = useState<GrowthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载学生成长概况
  const loadStudentGrowthSummary = useCallback(async (id?: number) => {
    const targetId = id || enrollmentId;
    if (!targetId) return;

    try {
      setLoading(true);
      setError(null);
      const summary = await growthApi.getStudentGrowthSummary(targetId);
      setGrowthSummary(summary);
      return summary;
    } catch (err) {
      const errorMessage = '加载学生成长数据失败';
      setError(errorMessage);
      console.error('Load student growth summary failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  // 自动加载数据
  useEffect(() => {
    if (enrollmentId) {
      loadStudentGrowthSummary();
    }
  }, [enrollmentId, loadStudentGrowthSummary]);

  return {
    // 状态
    growthSummary,
    loading,
    error,
    
    // 操作函数
    loadStudentGrowthSummary,
    
    // 计算属性
    getOverallScore: () => {
      if (!growthSummary) return 0;
      const totalLevel = growthSummary.states.reduce((sum, state) => sum + state.level, 0);
      return totalLevel / (growthSummary.states.length || 1);
    },
    
    getPositiveStates: () => growthSummary?.states.filter(state => state.sentiment === 'POSITIVE') || [],
    getNegativeStates: () => growthSummary?.states.filter(state => state.sentiment === 'NEGATIVE') || [],
    
    getAverageConfidence: () => {
      if (!growthSummary) return 0;
      const totalConfidence = growthSummary.states.reduce((sum, state) => sum + state.confidence, 0);
      return totalConfidence / (growthSummary.states.length || 1);
    },
    
    getTotalObservations: () => {
      if (!growthSummary) return 0;
      return growthSummary.states.reduce((sum, state) => sum + state.totalObservations, 0);
    }
  };
}; 