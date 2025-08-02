import apiClient from '@/lib/apiClient';
import type { 
  Class, 
  CreateClassRequest,
  ClassStudent,
  MultiClassStudent,
  GetClassStudentsParams,
  Customer,
  EnrollStudentsRequest,
  RemoveStudentsRequest,
  AttendanceRecord,
  CreateAttendanceRecordRequest,
  GrowthLog,
  CreateGrowthLogRequest,
  Tag,
  CreateTagRequest,
  TagType,
  TagStats
} from '@/types/api';
import { AttendanceStatus, AttendanceSlot } from '@/types/api';

// ================================
// 班级管理API
// ================================

/**
 * 获取所有班级列表
 */
export const getClasses = async (): Promise<Class[]> => {
  const response = await apiClient.get('/classes');
  return response.data;
};

/**
 * 创建新班级
 */
export const createClass = async (data: CreateClassRequest): Promise<Class> => {
  const response = await apiClient.post('/classes', data);
  return response.data;
};

/**
 * 删除班级
 */
export const deleteClass = async (classId: number): Promise<void> => {
  await apiClient.delete(`/classes/${classId}`);
};

// ================================
// 班级学生管理API - 重构支持多班级
// ================================

/**
 * 获取指定班级的学生列表（重构版）
 */
export const getClassStudents = async (
  classId: number, 
  params?: GetClassStudentsParams
): Promise<ClassStudent[]> => {
  const queryParams = new URLSearchParams();
  
  if (params?.includeOtherEnrollments) {
    queryParams.append('includeOtherEnrollments', 'true');
  }
  if (params?.includeStats) {
    queryParams.append('includeStats', 'true');
  }
  if (params?.includeRecentTags) {
    queryParams.append('includeRecentTags', 'true');
  }
  if (params?.date) {
    queryParams.append('date', params.date);
  }

  const url = `/classes/${classId}/students${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * 新增：获取学生的多班级信息
 */
export const getStudentMultiClassInfo = async (studentId: number): Promise<MultiClassStudent> => {
  const response = await apiClient.get(`/students/${studentId}/multi-class-info`);
  return response.data;
};

/**
 * 获取可报名的学生列表（排除已在当前班级的学生）
 */
export const getEnrollableStudents = async (
  classId?: number, 
  params?: GetEnrollableStudentsParams
): Promise<Customer[]> => {
  const queryParams = new URLSearchParams();
  
  // 获取已报名和试听的学生（用逗号分隔多状态）
  queryParams.append('status', 'ENROLLED,TRIAL_CLASS');
  
  // 如果指定了班级ID，让后端过滤掉已在该班级的学生
  if (classId) {
    queryParams.append('excludeClassId', classId.toString());
  }
  
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const url = `/customers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('获取可报名学生失败:', error);
    throw error;
  }
};

/**
 * 将学生添加到班级
 */
export const enrollStudentsToClass = async (
  classId: number, 
  data: EnrollStudentsRequest
): Promise<any> => {
  const response = await apiClient.post(`/classes/${classId}/enrollments`, data);
  return response.data;
};

/**
 * 从班级中移除学生
 */
export const removeStudentsFromClass = async (data: RemoveStudentsRequest): Promise<void> => {
  await apiClient.delete('/classes/enrollments', { data });
};

// ================================
// 考勤管理API - 优化版
// ================================

/**
 * 记录考勤（支持批量和单个）
 */
export const recordAttendance = async (data: CreateAttendanceRecordRequest): Promise<AttendanceRecord> => {
  const response = await apiClient.post('/attendance-records', data);
  return response.data;
};

/**
 * 新增：批量记录考勤
 */
export const batchRecordAttendance = async (records: CreateAttendanceRecordRequest[]): Promise<AttendanceRecord[]> => {
  const response = await apiClient.post('/attendance-records/batch', { records });
  return response.data;
};

/**
 * 新增：获取学生考勤历史
 */
export const getStudentAttendanceHistory = async (
  enrollmentId: number, 
  startDate?: string, 
  endDate?: string
): Promise<AttendanceRecord[]> => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  
  const url = `/attendance-records/${enrollmentId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

// ================================
// 成长记录API
// ================================

/**
 * 记录成长日志
 */
export const recordGrowthLog = async (data: CreateGrowthLogRequest): Promise<GrowthLog> => {
  const response = await apiClient.post('/growth-logs', data);
  return response.data;
};

/**
 * 获取学生成长报告
 */
export const getStudentGrowthReport = async (
  studentId: number, 
  params?: GetGrowthReportParams
): Promise<StudentGrowthReport> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  const url = `/students/${studentId}/report${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * 获取学生成长报告（通过publicId）
 */
export const getStudentGrowthReportByPublicId = async (
  publicId: string, 
  params?: GetGrowthReportParams
): Promise<StudentGrowthReport> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  const url = `/students/${publicId}/report${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

// ================================
// 标签管理API
// ================================

/**
 * 获取成长标签
 */
export const getGrowthTags = async (
  type?: 'positive' | 'negative' | 'all', 
  includeDeleted?: boolean
): Promise<Tag[]> => {
  const queryParams = new URLSearchParams();
  
  if (type && type !== 'all') {
    const tagType = type === 'positive' ? 'GROWTH_POSITIVE' : 'GROWTH_NEGATIVE';
    queryParams.append('type', tagType);
  }

  if (includeDeleted) {
    queryParams.append('includeDeleted', 'true');
  }

  const url = `/tags${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * 创建新的成长标签
 */
export const createGrowthTag = async (data: CreateTagRequest): Promise<Tag> => {
  const response = await apiClient.post('/tags', data);
  return response.data;
};

/**
 * 软删除个人自定义标签
 */
export const deleteGrowthTag = async (tagId: number): Promise<void> => {
  await apiClient.delete(`/tags/${tagId}`);
};

/**
 * 恢复已删除的标签
 */
export const restoreGrowthTag = async (tagId: number): Promise<void> => {
  await apiClient.post(`/tags/${tagId}/restore`);
};

/**
 * 永久删除标签（硬删除）
 */
export const permanentDeleteGrowthTag = async (tagId: number): Promise<void> => {
  await apiClient.delete(`/tags/${tagId}/permanent`);
};

/**
 * 获取用户标签统计
 */
export const getUserTagStats = async (includeDeleted?: boolean): Promise<TagStats> => {
  const queryParams = new URLSearchParams();
  
  if (includeDeleted) {
    queryParams.append('includeDeleted', 'true');
  }

  const url = `/tags/my-stats${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * 清理未使用的个人标签
 */
export const cleanupUnusedTags = async (minUsageCount?: number): Promise<{ deletedCount: number }> => {
  const response = await apiClient.post('/tags/cleanup', { minUsageCount });
  return response.data;
};

// ================================
// 工具函数 - 增强版
// ================================

/**
 * 获取当前时间段
 */
export const getCurrentTimeSlot = (): AttendanceSlot => {
  const hour = new Date().getHours();
  return hour < 12 ? AttendanceSlot.AM : AttendanceSlot.PM;
};

/**
 * 格式化考勤状态
 */
export const formatAttendanceStatus = (status: AttendanceStatus | null | undefined): string => {
  if (!status) return '未记录';
  
  const statusMap = {
    PRESENT: '已到',
    LATE: '迟到',
    ABSENT: '请假',
    NO_SHOW: '未到'
  };
  
  return statusMap[status] || '未知';
};

/**
 * 获取考勤状态颜色
 */
export const getAttendanceStatusColor = (status: AttendanceStatus | null | undefined): string => {
  if (!status) return '#d9d9d9';
  
  const colorMap = {
    PRESENT: '#52c41a',
    LATE: '#faad14',
    ABSENT: '#1890ff',
    NO_SHOW: '#ff4d4f'
  };
  
  return colorMap[status] || '#d9d9d9';
};

/**
 * 新增：获取考勤状态的简短文本
 */
export const getAttendanceStatusShort = (status: AttendanceStatus | null | undefined): string => {
  if (!status) return '-';
  
  const shortMap = {
    PRESENT: '✓',
    LATE: '迟',
    ABSENT: '假',
    NO_SHOW: '✗'
  };
  
  return shortMap[status] || '-';
};

/**
 * 新增：计算考勤率
 */
export const calculateAttendanceRate = (records: AttendanceRecord[]): number => {
  if (records.length === 0) return 0;
  
  const presentCount = records.filter(record => 
    record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE
  ).length;
  
  return Math.round((presentCount / records.length) * 100);
};

/**
 * 新增：格式化学生姓名（处理可能的undefined）
 */
export const formatStudentName = (name: string | undefined): string => {
  return name && name.trim() ? name : '未知学生';
};

/**
 * 新增：生成学生头像背景色
 */
export const getStudentAvatarColor = (gender?: 'MALE' | 'FEMALE' | 'OTHER'): string => {
  const colorMap = {
    MALE: '#1890ff',
    FEMALE: '#eb2f96',
    OTHER: '#722ed1'
  };
  
  return colorMap[gender || 'OTHER'] || '#722ed1';
};

/**
 * 新增：导出成长记录
 */
export const exportGrowthLogs = async (params?: ExportGrowthLogsParams): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  
  if (params?.studentId) {
    queryParams.append('studentId', params.studentId);
  }
  if (params?.classId) {
    queryParams.append('classId', params.classId);
  }
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  const url = `/export/growth-logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url, {
    responseType: 'blob'
  });
  
  return response.data;
};

/**
 * 工具函数：下载文件
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 工具函数：生成带时间戳的文件名
 */
export const generateTimestampedFilename = (baseName: string, extension: string = 'csv'): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  return `${baseName}_${timestamp}.${extension}`;
};

// ================================
// 保持原有的接口定义
// ================================

export interface GetEnrollableStudentsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExportGrowthLogsParams {
  studentId?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
}

export interface StudentGrowthReport {
  student: {
    id: number;
    name: string;
    school?: string;
    grade?: string;
  };
  wordCloud: {
    text: string;
    value: number;
    type: 'positive' | 'negative';
  }[];
  positiveTagsRanking: {
    tagId: number;
    text: string;
    count: number;
  }[];
  negativeTagsRanking: {
    tagId: number;
    text: string;
    count: number;
  }[];
  growthTrend: {
    date: string;
    positiveCount: number;
    negativeCount: number;
  }[];
  summary: {
    totalLogs: number;
    positiveRatio: number;
    negativeRatio: number;
    mostFrequentTag: {
      text: string;
      count: number;
      type: 'positive' | 'negative';
    };
  };
}

export interface GetGrowthReportParams {
  startDate?: string;
  endDate?: string;
} 

// ================================
// 成长统计API（学生列表）
// ================================

export interface StudentGrowthStatsSummary {
  studentId: number;
  totalLogs: number;
  positiveRatio: number;
  negativeRatio: number;
  lastActivityDate?: string;
}

/**
 * 批量获取学生成长统计
 */
export const getStudentsGrowthStats = async (studentIds: number[]): Promise<StudentGrowthStatsSummary[]> => {
  if (studentIds.length === 0) return [];
  const idsParam = studentIds.join(',');
  const response = await apiClient.get(`/students/growth-stats?ids=${idsParam}`);
  return response.data;
}; 