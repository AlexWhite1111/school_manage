import apiClient from '@/lib/apiClient';
import type { 
  Customer, 
  CreateCustomerRequest, 
  CustomerStats,
  CommunicationLog,
  CreateCommunicationLogRequest,
  Tag,
  CreateTagRequest,
  TagType
} from '@/types/api';

// ================================
// 客户管理 API
// ================================

/**
 * 获取客户列表查询参数
 */
export interface GetCustomersParams {
  status?: string; // CustomerStatus 枚举值
  search?: string; // 按姓名或学校模糊搜索
  unclassed?: boolean; // 仅返回未加入任何班级的客户
  page?: number;
  limit?: number;
}

/**
 * 获取客户列表
 * @route GET /customers
 */
export const getCustomers = async (params?: GetCustomersParams): Promise<Customer[]> => {
  try {
    const response = await apiClient.get<Customer[]>('/customers', { params });
    console.log('📋 获取客户列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取客户列表失败:', error);
    throw error;
  }
};

/**
 * 获取CRM看板统计数据
 * @route GET /customers/stats
 */
export const getCustomerStats = async (): Promise<CustomerStats> => {
  try {
    const response = await apiClient.get<CustomerStats>('/customers/stats');
    console.log('📊 获取客户统计数据成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取客户统计数据失败:', error);
    throw error;
  }
};

/**
 * 创建新客户
 * @route POST /customers
 */
export const createCustomer = async (data: CreateCustomerRequest): Promise<Customer> => {
  try {
    const response = await apiClient.post<Customer>('/customers', data);
    console.log('✅ 创建客户成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建客户失败:', error);
    throw error;
  }
};

/**
 * 获取单个客户详情
 * @route GET /customers/:id
 */
export const getCustomerById = async (id: number): Promise<Customer> => {
  try {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    console.log('📄 获取客户详情成功:', response.data);
    return response.data;
  } catch (error) {
    console.error(`获取客户${id}详情失败:`, error);
    throw error;
  }
};

/**
 * 更新客户信息
 * @route PUT /customers/:id
 */
export const updateCustomer = async (id: number, data: Partial<CreateCustomerRequest>): Promise<Customer> => {
  try {
    const response = await apiClient.put<Customer>(`/customers/${id}`, data);
    console.log('🔄 更新客户信息成功:', response.data);
    return response.data;
  } catch (error) {
    console.error(`更新客户${id}信息失败:`, error);
    throw error;
  }
};

/**
 * 删除单个客户
 * @route DELETE /customers/:id
 */
export const deleteCustomer = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/customers/${id}`);
    console.log('🗑️ 删除客户成功:', id);
  } catch (error) {
    console.error(`删除客户${id}失败:`, error);
    throw error;
  }
};

/**
 * 批量删除客户
 * @route DELETE /customers
 */
export const deleteCustomers = async (ids: number[]): Promise<void> => {
  try {
    await apiClient.delete('/customers', { data: { ids } });
    console.log('🗑️ 批量删除客户成功:', ids);
  } catch (error) {
    console.error('批量删除客户失败:', error);
    throw error;
  }
};

// ================================
// 沟通记录管理 API
// ================================

/**
 * 为指定客户添加沟通纪要
 * @route POST /customers/:id/logs
 */
export const createCommunicationLog = async (
  customerId: number, 
  data: CreateCommunicationLogRequest
): Promise<CommunicationLog> => {
  try {
    const response = await apiClient.post<CommunicationLog>(`/customers/${customerId}/logs`, data);
    console.log('📝 添加沟通纪要成功:', response.data);
    return response.data;
  } catch (error) {
    console.error(`为客户${customerId}添加沟通纪要失败:`, error);
    throw error;
  }
};

/**
 * 更新沟通纪要
 * @route PUT /customers/logs/:logId
 */
export const updateCommunicationLog = async (
  logId: number, 
  data: CreateCommunicationLogRequest
): Promise<CommunicationLog> => {
  try {
    const response = await apiClient.put<CommunicationLog>(`/customers/logs/${logId}`, data);
    console.log('🔄 更新沟通纪要成功:', response.data);
    return response.data;
  } catch (error) {
    console.error(`更新沟通纪要${logId}失败:`, error);
    throw error;
  }
};

/**
 * 删除沟通纪要
 * @route DELETE /customers/logs/:logId
 */
export const deleteCommunicationLog = async (logId: number): Promise<void> => {
  try {
    await apiClient.delete(`/customers/logs/${logId}`);
    console.log('🗑️ 删除沟通纪要成功:', logId);
  } catch (error) {
    console.error(`删除沟通纪要${logId}失败:`, error);
    throw error;
  }
};

// ================================
// 标签管理 API
// ================================

/**
 * 获取标签列表
 * @route GET /tags
 */
export const getTags = async (type?: TagType): Promise<Tag[]> => {
  try {
    const params = type ? { type } : undefined;
    const response = await apiClient.get<Tag[]>('/tags', { params });
    console.log('🏷️ 获取标签列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取标签列表失败:', error);
    throw error;
  }
};

/**
 * 创建新的自定义标签
 * @route POST /tags
 */
export const createTag = async (data: CreateTagRequest): Promise<Tag> => {
  try {
    const response = await apiClient.post<Tag>('/tags', data);
    console.log('✅ 创建标签成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建标签失败:', error);
    throw error;
  }
};

// ================================
// 数据导入导出 API
// ================================

/**
 * 导出客户数据参数
 */
export interface ExportCustomersParams {
  status?: string;
  search?: string;
  page?: string;
  limit?: string;
}

/**
 * 导出客户数据为CSV
 * @route GET /export/customers
 */
export const exportCustomers = async (params?: ExportCustomersParams): Promise<Blob> => {
  try {
    const response = await apiClient.get('/export/customers', {
      params,
      responseType: 'blob'
    });
    console.log('📤 导出客户数据成功');
    return response.data;
  } catch (error) {
    console.error('导出客户数据失败:', error);
    throw error;
  }
};

/**
 * 导入结果接口
 */
export interface ImportResult {
  message: string;
  results: {
    success: number;
    failed: number;
  };
}

/**
 * 导入客户数据CSV文件
 * @route POST /import/customers
 */
export const importCustomers = async (file: File): Promise<ImportResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ImportResult>('/import/customers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('📥 导入客户数据成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('导入客户数据失败:', error);
    throw error;
  }
};

// ================================
// 辅助函数
// ================================

/**
 * 下载文件辅助函数
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
 * 生成带时间戳的文件名
 */
export const generateTimestampedFilename = (baseName: string, extension: string = 'csv'): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${baseName}_${timestamp}.${extension}`;
}; 