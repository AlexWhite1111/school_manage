import apiClient from '@/lib/apiClient';
import type { 
  Exam, 
  ExamScore, 
  CreateExamRequest,
  UpdateExamScoresRequest,
  ExamDetails,
  ExamFilters
} from '@/types/api';

// ================================
// 考试管理API
// ================================

/**
 * 获取科目和考试类型元数据
 */
export const getExamMetadata = async (): Promise<{
  subjects: Array<{ value: string; label: string }>;
  examTypes: Array<{ value: string; label: string }>;
}> => {
  const response = await apiClient.get('/exams/meta/subjects');
  return response.data.data;
};

/**
 * 为班级创建新考试
 */
export const createExam = async (data: CreateExamRequest): Promise<{
  exam: Exam;
  studentCount: number;
  subjectCount: number;
}> => {
  const response = await apiClient.post('/exams', data);
  return response.data.data;
};

/**
 * 获取班级考试列表
 */
export const getClassExams = async (
  classId: number,
  filters?: ExamFilters
): Promise<Exam[]> => {
  const queryParams = new URLSearchParams();
  
  if (filters?.name) {
    queryParams.append('name', filters.name);
  }
  if (filters?.examType) {
    queryParams.append('examType', filters.examType);
  }
  if (filters?.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    queryParams.append('endDate', filters.endDate);
  }
  if (filters?.includeDeleted) {
    queryParams.append('includeDeleted', 'true');
  }

  const url = `/exams/class/${classId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * 获取考试详细信息和成绩
 */
export const getExamDetails = async (examId: number): Promise<ExamDetails> => {
  const response = await apiClient.get(`/exams/${examId}`);
  return response.data.data;
};

/**
 * 录入/更新考试成绩
 */
export const updateExamScores = async (
  examId: number,
  scoresData: UpdateExamScoresRequest[]
): Promise<ExamScore[]> => {
  const response = await apiClient.put(`/exams/${examId}/scores`, {
    scores: scoresData
  });
  return response.data.data;
};

/**
 * 软删除考试
 */
export const deleteExam = async (examId: number): Promise<void> => {
  await apiClient.delete(`/exams/${examId}`);
};

/**
 * 获取学生考试成绩历史 (通过publicId) - 主要API
 */
export const getStudentExamHistoryByPublicId = async (
  publicId: string,
  filters?: {
    classId?: number;
    subject?: string;
    examType?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{
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
    classAverage?: number;
    examTags?: any[];
  }>;
  allScores: any[];
  examTagsWordCloud?: Array<{
    text: string;
    value: number;
    type: 'positive' | 'negative';
  }>;
  student?: {
    id: number;
    name: string;
    publicId: string;
  };
}> => {
  const queryParams = new URLSearchParams();
  
  if (filters?.classId) {
    queryParams.append('classId', filters.classId.toString());
  }
  if (filters?.subject) {
    queryParams.append('subject', filters.subject);
  }
  if (filters?.examType) {
    queryParams.append('examType', filters.examType);
  }
  if (filters?.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    queryParams.append('endDate', filters.endDate);
  }

  const url = `/exams/students/by-public-id/${publicId}/exam-history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * 获取考试详细统计分析
 */
export const getExamStatistics = async (examId: number): Promise<{
  exam: {
    id: number;
    name: string;
    examType: string;
    examDate: string;
    totalScore: number;
    class: any;
  };
  overview: {
    totalStudents: number;
    participantCount: number;
    absentCount: number;
    participationRate: number;
    recordedScores: number;
    coverageRate: number;
  };
  subjectAnalysis: Array<{
    subject: string;
    studentCount: number;
    participantCount: number;
    absentCount: number;
    average: number;
    highest: number;
    lowest: number;
    passRate: number;
    excellentRate: number;
    standardDeviation: number;
    difficulty: string;
    percentiles?: {
      p25: number;
      p50: number;
      p75: number;
      p85: number;
      p90: number;
    } | null;
  }>;
  studentPerformance: {
    students: Array<{
      student: any;
      subjectCount: number;
      validCount: number;
      absentCount: number;
      average: number;
      highest: number;
      lowest: number;
      rank: number;
      performance: string;
    }>;
    distribution: {
      excellent: number;
      good: number;
      average: number;
      needs_improvement: number;
      absent: number;
    };
    topPerformers: any[];
    needsAttention: any[];
  };
  tagAnalysis: {
    totalTags: number;
    positiveCount: number;
    negativeCount: number;
    distribution: Record<string, number>;
    topTags: Array<{
      tagText: string;
      count: number;
      type: string;
    }>;
  };
  scoreDistribution: {
    ranges: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    percentiles: {
      p25: number;
      p50: number;
      p75: number;
      p85: number;
      p90: number;
    };
    average: number;
    median: number;
  };
}> => {
  const response = await apiClient.get(`/exams/${examId}/statistics`);
  return response.data.data;
};

/**
 * 获取班级科目的历史趋势分析
 */
export const getSubjectTrend = async (
  classId: number,
  subject: string,
  filters?: {
    examType?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{
  trend: Array<{
    examId: number;
    examName: string;
    examDate: string;
    examType: string;
    totalScore: number;
    totalStudents: number;
    participantCount: number;
    absentCount: number;
    averageScore: number;
    normalizedAverage: number;
    highestScore: number;
    lowestScore: number;
    participationRate: number;
    passRate: number;
    excellentRate: number;
  }>;
  summary: {
    totalExams: number;
    totalStudents: number;
    averageScore: number;
    averageParticipationRate: number;
    improvement: number;
  };
}> => {
  const queryParams = new URLSearchParams();
  
  if (filters?.examType && filters.examType !== 'all') {
    queryParams.append('examType', filters.examType);
  }
  if (filters?.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    queryParams.append('endDate', filters.endDate);
  }

  const url = `/exams/class/${classId}/subject/${subject}/trend${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * 获取班级科目下学生的成绩历史和趋势分析
 */
export const getSubjectStudentsAnalysis = async (
  classId: number,
  subject: string,
  filters?: {
    examType?: string;
    startDate?: string;
    endDate?: string;
    studentId?: number;
  }
): Promise<{
  students: Array<{
    studentId: number;
    studentName: string;
    enrollmentId: number;
    totalExams: number;
    validScores: number;
    absentCount: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    trend: 'improving' | 'declining' | 'stable';
    improvement: number;
    scores: Array<{
      examId: number;
      examName: string;
      examDate: string;
      examType: string;
      totalScore: number;
      score?: number;
      isAbsent: boolean;
      normalizedScore?: number;
      tags: Array<{
        id: number;
        text: string;
        type: string;
      }>;
    }>;
    participationRate: number;
  }>;
  examHistory: Array<{
    examId: number;
    examName: string;
    examDate: string;
    examType: string;
    totalStudents: number;
    validCount: number;
    absentCount: number;
    averageScore: number;
    participationRate: number;
  }>;
  overview: {
    totalStudents: number;
    totalExams: number;
    averageImprovement: number;
  };
}> => {
  const queryParams = new URLSearchParams();
  
  if (filters?.examType && filters.examType !== 'all') {
    queryParams.append('examType', filters.examType);
  }
  if (filters?.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    queryParams.append('endDate', filters.endDate);
  }
  if (filters?.studentId) {
    queryParams.append('studentId', filters.studentId.toString());
  }

  const url = `/exams/class/${classId}/subject/${subject}/students${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * 获取单次考试的特定科目详细分析
 */
export const getExamSubjectDetail = async (examId: number, subject: string, historyLimit?: number) => {
  const queryParams = new URLSearchParams();
  if (historyLimit) {
    queryParams.append('historyLimit', historyLimit.toString());
  }
  
  const url = `/exams/${examId}/subject/${subject}/detail${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data.data;
};

// ================================
// 工具函数
// ================================

/**
 * 生成带时间戳的文件名
 */
export const generateTimestampedFilename = (prefix: string, extension: string): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
};

/**
 * 下载文件
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
 * 导出考试成绩数据
 */
export const exportExamScores = async (examId: number): Promise<Blob> => {
  const response = await apiClient.get(`/exams/${examId}/export`, {
    responseType: 'blob'
  });
  return response.data;
};