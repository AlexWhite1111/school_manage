import apiClient from '@/lib/apiClient';

// ================================
// 类型定义（统一导出/导入）
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

// ================================
// 下载工具
// ================================

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

export const generateTimestampedFilename = (baseName: string, extension: string = 'csv'): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${baseName}_${timestamp}.${extension}`;
};

// ================================
// 导入（Excel）
// ================================

export const importCustomers = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('excel', file);

  const response = await apiClient.post('/excel/import-customers', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data as ImportResult;
};

export const downloadImportTemplate = async (): Promise<void> => {
  const response = await apiClient.get('/excel/import-template', { responseType: 'blob' });
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  downloadFile(blob, '客户数据导入模板.xlsx');
};

// ================================
// 导出（Excel / CSV）
// ================================

// Excel（xlsx）：POST /excel/export-customers
export const exportCustomersExcel = async (filters?: ExportFilters): Promise<Blob> => {
  const response = await apiClient.post('/excel/export-customers', { filters }, { responseType: 'blob' });
  return new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
};

// CSV：GET /export/customers
export const exportCustomersCsv = async (params?: ExportCustomersParams): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value as string);
    });
  }
  const url = `/export/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get(url, { responseType: 'blob', headers: { Accept: 'text/csv' } });
  return response.data as Blob;
};

// CSV：GET /export/growth-logs
export const exportGrowthLogsCsv = async (params?: ExportGrowthLogsParams): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value as string);
    });
  }
  const url = `/export/growth-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get(url, { responseType: 'blob', headers: { Accept: 'text/csv' } });
  return response.data as Blob;
};

// CSV：GET /export/finance
export const exportFinanceCsv = async (params?: ExportFinanceParams): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value as string);
    });
  }
  const url = `/export/finance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get(url, { responseType: 'blob', headers: { Accept: 'text/csv' } });
  return response.data as Blob;
};

