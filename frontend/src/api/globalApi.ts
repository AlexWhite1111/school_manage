import apiClient from '@/lib/apiClient';

// 导出参数类型定义
export interface ExportCustomersParams {
  status?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export interface ExportGrowthLogsParams {
  studentId?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportFinanceParams {
  startDate?: string;
  endDate?: string;
}

// 导入结果类型
export interface ImportResult {
  message: string;
  results: {
    success: number;
    failed: number;
  };
}

/**
 * 导出客户信息的CSV文件
 * @route GET /export/customers
 */
export const exportCustomers = async (params?: ExportCustomersParams): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
  }

  const url = `/export/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await apiClient.get(url, {
    responseType: 'blob',
    headers: {
      'Accept': 'text/csv'
    }
  });

  return response.data;
};

/**
 * 导出学生成长记录的CSV文件
 * @route GET /export/growth-logs
 */
export const exportGrowthLogs = async (params?: ExportGrowthLogsParams): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
  }

  const url = `/export/growth-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await apiClient.get(url, {
    responseType: 'blob',
    headers: {
      'Accept': 'text/csv'
    }
  });

  return response.data;
};

/**
 * 导出财务数据的CSV文件
 * @route GET /export/finance
 */
export const exportFinance = async (params?: ExportFinanceParams): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
  }

  const url = `/export/finance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await apiClient.get(url, {
    responseType: 'blob',
    headers: {
      'Accept': 'text/csv'
    }
  });

  return response.data;
};

/**
 * 导入客户信息的CSV文件
 * @route POST /import/customers
 */
export const importCustomers = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ImportResult>('/import/customers', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

/**
 * 下载文件的通用函数
 * @param blob 文件数据
 * @param filename 文件名
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 生成带时间戳的文件名
 * @param baseName 基础文件名
 * @param extension 文件扩展名
 */
export const generateTimestampedFilename = (baseName: string, extension: string = 'csv'): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${baseName}_${timestamp}.${extension}`;
}; 