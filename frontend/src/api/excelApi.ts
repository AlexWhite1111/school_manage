// src/api/excelApi.ts
import apiClient from '@/lib/apiClient';

// ================================
// 类型定义
// ================================

export interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    importedCount: number;
    skippedCount: number;
    errors: string[];
  };
  errors?: string[];
}

export interface ExportFilters {
  status?: string[];
  grade?: string[];
  school?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// ================================
// Excel 导入导出 API
// ================================

/**
 * 导入客户数据
 */
export const importCustomers = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('excel', file);

  const response = await apiClient.post('/excel/import-customers', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * 导出客户数据
 */
export const exportCustomers = async (filters?: ExportFilters): Promise<void> => {
  const response = await apiClient.post('/excel/export-customers', 
    { filters },
    {
      responseType: 'blob', // 重要：处理二进制文件
    }
  );

  // 创建下载链接
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // 从响应头获取文件名（如果有）
  const contentDisposition = response.headers['content-disposition'];
  let fileName = '客户数据导出.xlsx';
  
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (fileNameMatch && fileNameMatch[1]) {
      fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
    }
  }
  
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  // 清理
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
};

/**
 * 下载导入模板
 */
export const downloadImportTemplate = async (): Promise<void> => {
  const response = await apiClient.get('/excel/import-template', {
    responseType: 'blob',
  });

  // 创建下载链接
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '客户数据导入模板.xlsx';
  document.body.appendChild(link);
  link.click();
  
  // 清理
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
};

/**
 * 导出学生成长记录 (预留功能)
 */
export const exportGrowthLogs = async (studentId: string, options?: {
  startDate?: string;
  endDate?: string;
}): Promise<void> => {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);

  const response = await apiClient.get(
    `/excel/export-growth-logs/${studentId}?${params.toString()}`,
    {
      responseType: 'blob',
    }
  );

  // 处理下载逻辑...
  // TODO: 当后端实现后完善此功能
}; 