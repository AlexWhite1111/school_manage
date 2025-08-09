import apiClient from '../lib/apiClient';

// ================================
// Growth API 类型定义
// ================================

export interface GrowthTag {
  id: number;
  text: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  defaultWeight: number;
  usageCount: number;
  type: 'GROWTH_POSITIVE' | 'GROWTH_NEGATIVE';
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isGrowthTag: boolean;
  recentUsage: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export interface GrowthTagFilters {
  sentiment?: 'POSITIVE' | 'NEGATIVE';
  search?: string;
  isActive?: boolean;
  orderBy?: 'usageCount' | 'createdAt' | 'text';
  order?: 'asc' | 'desc';
}

export interface CreateGrowthTagRequest {
  text: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  defaultWeight: number;
  description?: string;
  type?: 'GROWTH_POSITIVE' | 'GROWTH_NEGATIVE';
}

export interface UpdateGrowthTagRequest {
  text?: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE';
  defaultWeight?: number;
  isActive?: boolean;
}

export interface GrowthLogRequest {
  enrollmentId: number;
  tagId: number;
  weight?: number;
  context?: string;
}

export interface GrowthLogResponse {
  id: number;
  createdAt: string;
  enrollmentId: number;
  tagId: number;
  weight: number;
  tag: {
    id: number;
    text: string;
    sentiment: 'POSITIVE' | 'NEGATIVE';
  };
  student: {
    id: number;
    name: string;
    publicId: string;
  };
  class: {
    id: number;
    name: string;
  };
}

export interface BatchGrowthLogRequest {
  records: Array<{
    enrollmentId: number;
    tagId: number;
    weight?: number;
  }>;
}

export interface BatchResponse {
  successCount: number;
  failedCount: number;
  results: Array<{
    index: number;
    success: boolean;
    data?: any;
    error?: string;
  }>;
}

export interface GrowthLogFilters {
  enrollmentId?: number;
  tagId?: number;
  startDate?: string;
  endDate?: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE';
  classId?: number;
  minWeight?: number;
  maxWeight?: number;
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'weight';
  order?: 'asc' | 'desc';
}

export interface GrowthLogsResponse {
  logs: Array<{
    id: number;
    createdAt: string;
    weight: number;
    tag: {
      id: number;
      text: string;
      sentiment: 'POSITIVE' | 'NEGATIVE';
    };
    student: {
      id: number;
      name: string;
      publicId: string;
    };
    class: {
      id: number;
      name: string;
    };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GrowthSummary {
  student: {
    id: number;
    name: string;
    publicId: string;
    grade?: string;
  };
  class: {
    id: number;
    name: string;
  };
  enrollment: {
    id: number;
    enrollmentDate?: string;
  };
  states: Array<{
    tagId: number;
    tagName: string;
    sentiment: 'POSITIVE' | 'NEGATIVE';
    level: number;
    trend: number;
    trendDirection: 'UP' | 'DOWN' | 'STABLE';
    confidence: number;
    totalObservations: number;
    lastUpdatedAt: string;
  }>;
  overallTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  lastActivityDate?: string;
}

export interface ChartFilters {
  tagId?: number;
  period?: 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  includeConfidence?: boolean;
  dataPoints?: number;
}

export interface ChartData {
  tagId: number;
  tagName: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  timeSeriesData: Array<{
    date: string;
    level: number;
    trend: number;
    confidenceUpper: number;
    confidenceLower: number;
    actualEvents: number;
  }>;
  currentState: {
    level: number;
    trend: number;
    confidence: number;
    lastUpdated: string;
  };
}

export interface KalmanConfig {
  id: string;
  name: string;
  description?: string;
  processNoise: number;
  initialUncertainty: number;
  timeDecayFactor: number;
  minObservations: number;
  maxDaysBetween: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigUpdate {
  name?: string;
  description?: string;
  processNoise?: number;
  initialUncertainty?: number;
  timeDecayFactor?: number;
  minObservations?: number;
  maxDaysBetween?: number;
}

export interface ConfigCreate {
  name: string;
  description?: string;
  processNoise: number;
  initialUncertainty: number;
  timeDecayFactor: number;
  minObservations: number;
  maxDaysBetween: number;
}

export interface QuickStudent {
  enrollmentId: number;
  student: {
    id: number;
    name: string;
    publicId: string;
    grade?: string;
  };
  class: {
    id: number;
    name: string;
  };
  recentActivityCount: number;
}

export interface QuickStudentFilters {
  classId?: number;
  search?: string;
  limit?: number;
  includeInactive?: boolean;
  hasGrowthData?: boolean;
  orderBy?: 'name' | 'recentActivity' | 'enrollmentDate';
  order?: 'asc' | 'desc';
}

export interface QuickClass {
  id: number;
  name: string;
  studentCount: number;
  activeStudentCount: number;
}

// ================================
// Growth API 类
// ================================

export class GrowthApi {
  // Growth标签管理
  static async getGrowthTags(filters?: GrowthTagFilters): Promise<GrowthTag[]> {
    const queryParams = new URLSearchParams();
    
    if (filters?.sentiment) {
      queryParams.append('sentiment', filters.sentiment);
    }
    if (filters?.search) {
      queryParams.append('search', filters.search);
    }
    if (filters?.isActive !== undefined) {
      queryParams.append('isActive', filters.isActive.toString());
    }
    if (filters?.orderBy) {
      queryParams.append('orderBy', filters.orderBy);
    }
    if (filters?.order) {
      queryParams.append('order', filters.order);
    }

    const url = `/growth/tags${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data.data;
  }

  static async createGrowthTag(data: CreateGrowthTagRequest): Promise<GrowthTag> {
    const response = await apiClient.post('/growth/tags', data);
    return response.data.data;
  }

  static async updateGrowthTag(id: number, data: UpdateGrowthTagRequest): Promise<GrowthTag> {
    const response = await apiClient.put(`/growth/tags/${id}`, data);
    return response.data.data;
  }

  static async deleteGrowthTag(id: number): Promise<void> {
    await apiClient.delete(`/growth/tags/${id}`);
  }

  // 成长日志记录
  static async recordGrowthLog(data: GrowthLogRequest): Promise<GrowthLogResponse> {
    const response = await apiClient.post('/growth/logs', data);
    return response.data.data;
  }

  static async batchRecordGrowthLogs(data: BatchGrowthLogRequest): Promise<BatchResponse> {
    const response = await apiClient.post('/growth/logs/batch', data);
    return response.data.data;
  }

  static async getGrowthLogs(filters: GrowthLogFilters): Promise<GrowthLogsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `/growth/logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data.data;
  }

  // 学生成长状态查询
  static async getStudentGrowthSummary(enrollmentId: number): Promise<GrowthSummary> {
    const response = await apiClient.get(`/growth/students/${enrollmentId}/summary`);
    return response.data.data;
  }

  static async getStudentGrowthSummaryByPublicId(publicId: string): Promise<GrowthSummary> {
    const response = await apiClient.get(`/growth/students/by-public-id/${publicId}/summary`);
    return response.data.data;
  }

  static async getStudentGrowthChart(enrollmentId: number, filters?: ChartFilters): Promise<ChartData> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/growth/students/${enrollmentId}/chart${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data.data;
  }

  static async getStudentGrowthChartByPublicId(publicId: string, filters?: ChartFilters): Promise<ChartData> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/growth/students/by-public-id/${publicId}/chart${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data.data;
  }

  // 系统配置管理
  static async getActiveGrowthConfig(): Promise<KalmanConfig> {
    const response = await apiClient.get('/growth/config');
    return response.data.data;
  }

  static async updateGrowthConfig(id: string, data: ConfigUpdate): Promise<KalmanConfig> {
    const response = await apiClient.put(`/growth/config/${id}`, data);
    return response.data.data;
  }

  static async createGrowthConfig(data: ConfigCreate): Promise<KalmanConfig> {
    const response = await apiClient.post('/growth/config', data);
    return response.data.data;
  }

  // 辅助查询接口
  static async getQuickStudents(filters?: QuickStudentFilters): Promise<QuickStudent[]> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/growth/quick/students${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response.data.data;
  }

  static async getQuickClasses(): Promise<QuickClass[]> {
    const response = await apiClient.get('/growth/quick/classes');
    return response.data.data;
  }

  // 系统健康检查
  static async getSystemHealth(): Promise<any> {
    const response = await apiClient.get('/growth/system/health');
    return response.data.data;
  }
}

// 导出默认实例
export const growthApi = GrowthApi;