import apiClient from '@/lib/apiClient';

// ================================
// 财务模块类型定义
// ================================

/**
 * 学生财务概览数据（根据后端实际返回结构调整）
 */
export interface StudentFinanceSummary {
  studentId: number;           // 后端返回 studentId
  publicId: string;            // 学生公共ID
  studentName: string;         // 后端返回 studentName
  school: string;              // ✅ 学校信息（确保不为null）
  grade?: string;              // ✅ 年级信息
  totalDue: string;           // 后端返回字符串格式的 Decimal
  totalPaid: string;          // 后端返回 totalPaid（字符串）
  totalOwed: string;          // 后端返回 totalOwed（字符串）
  paymentStatus: 'PAID_FULL' | 'PARTIAL_PAID' | 'UNPAID'; // 后端实际状态值
  lastUpdateDate: string;     // ✅ 最后更新时间
  orderCount: number;         // ✅ 订单数量
  lastOrderDate?: string;     // ✅ 最近订单日期
  recentAttendance?: {
    present: number;
    late: number;
    absent: number;
    noShow: number;
  };
}

/**
 * 订单信息
 */
export interface FinancialOrder {
  id: number;
  name: string;
  totalDue: string;           // 字符串格式
  coursePeriodStart?: string;
  coursePeriodEnd?: string;
  dueDate?: string;
  createdAt: string;
  student: {
    id: number;
    name: string;
  };
  payments: Payment[];
  // 计算字段（后端返回）
  totalPaid: string;          // 字符串格式
  remainingAmount: string;    // 字符串格式
  orderStatus: 'UNPAID' | 'PARTIAL_PAID' | 'PAID_FULL'; // 后端实际状态值
}

/**
 * 收款记录
 */
export interface Payment {
  id: number;
  amount: string;             // 字符串格式
  paymentDate: string;
  notes?: string;
  createdAt: string;
  orderId: number;
}

/**
 * 家长信息
 */
export interface ParentInfo {
  id: number;
  name: string;
  relationship?: string;
  phone?: string;
  wechatId?: string;
}

/**
 * 学生详细财务信息
 */
export interface StudentFinanceDetails {
  student: {
    id: number;
    publicId: string;
    name: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    birthDate?: string;
    school?: string;
    grade?: string;
    address?: string;
    status?: 'POTENTIAL' | 'INITIAL_CONTACT' | 'INTERESTED' | 'TRIAL_CLASS' | 'ENROLLED' | 'LOST';
    parents: ParentInfo[];
  };
  financialSummary?: {        // 可能需要前端计算
    totalDue: string;
    totalPaid: string;
    totalOwed: string;
    paymentStatus: 'PAID_FULL' | 'PARTIAL_PAID' | 'UNPAID';
  };
  orders: FinancialOrder[];
}

/**
 * 创建订单请求数据
 */
export interface CreateOrderRequest {
  // 后端以 publicId 作为学生公开ID字段
  publicId: string;
  // 兼容旧字段（可选，不再使用）
  studentId?: number;
  name: string;
  totalDue: string | number;
  coursePeriodStart?: string;
  coursePeriodEnd?: string;
  dueDate?: string;
}

/**
 * 更新订单请求数据
 */
export interface UpdateOrderRequest {
  name?: string;
  totalDue?: string | number;
  coursePeriodStart?: string;
  coursePeriodEnd?: string;
  dueDate?: string;
}

/**
 * 创建收款记录请求数据
 */
export interface CreatePaymentRequest {
  amount: string | number;
  paymentDate: string;
  notes?: string;
}

/**
 * 更新收款记录请求数据
 */
export interface UpdatePaymentRequest {
  amount?: string | number;
  paymentDate?: string;
  notes?: string;
}

// ================================
// 财务API函数
// ================================

/**
 * 获取学生财务状况总览
 * @route GET /finance/student-summaries
 */
export const getStudentFinanceSummaries = async (): Promise<StudentFinanceSummary[]> => {
  try {
    const response = await apiClient.get<StudentFinanceSummary[]>('/finance/student-summaries');
    console.log('📊 学生财务总览 API 响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取学生财务总览失败:', error);
    throw error;
  }
};

/**
 * 获取单个学生的详细财务信息
 * @route GET /finance/students/by-public-id/:publicId/details
 */
export const getStudentFinanceDetails = async (publicId: string): Promise<StudentFinanceDetails> => {
  try {
    const response = await apiClient.get<StudentFinanceDetails>(`/finance/students/by-public-id/${publicId}/details`);
    console.log(`💰 学生 ${publicId} 财务详情 API 响应:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`获取学生 ${publicId} 财务详情失败:`, error);
    throw error;
  }
};

/**
 * 通过publicId获取单个学生的详细财务信息
 * @route GET /finance/students/public/:publicId/details
 */
export const getStudentFinanceDetailsByPublicId = async (publicId: string): Promise<StudentFinanceDetails> => {
  try {
    const response = await apiClient.get<StudentFinanceDetails>(`/finance/students/public/${publicId}/details`);
    console.log(`💰 学生 ${publicId} 财务详情 API 响应:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`获取学生 ${publicId} 财务详情失败:`, error);
    throw error;
  }
};

/**
 * 为学生创建新订单
 * @route POST /finance/orders
 */
export const createOrder = async (orderData: CreateOrderRequest): Promise<FinancialOrder> => {
  try {
    const response = await apiClient.post<FinancialOrder>('/finance/orders', orderData);
    console.log('📝 创建订单 API 响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建订单失败:', error);
    throw error;
  }
};

/**
 * 更新订单信息
 * @route PUT /finance/orders/:orderId
 */
export const updateOrder = async (orderId: number, orderData: UpdateOrderRequest): Promise<FinancialOrder> => {
  try {
    const response = await apiClient.put<FinancialOrder>(`/finance/orders/${orderId}`, orderData);
    console.log(`📝 更新订单 ${orderId} API 响应:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`更新订单 ${orderId} 失败:`, error);
    throw error;
  }
};

/**
 * 删除订单
 * @route DELETE /finance/orders/:orderId
 */
export const deleteOrder = async (orderId: number): Promise<void> => {
  try {
    await apiClient.delete(`/finance/orders/${orderId}`);
    console.log(`🗑️ 删除订单 ${orderId} 成功`);
  } catch (error) {
    console.error(`删除订单 ${orderId} 失败:`, error);
    throw error;
  }
};

/**
 * 为订单添加收款记录
 * @route POST /finance/orders/:orderId/payments
 */
export const addPaymentToOrder = async (orderId: number, paymentData: CreatePaymentRequest): Promise<Payment> => {
  try {
    const response = await apiClient.post<Payment>(`/finance/orders/${orderId}/payments`, paymentData);
    console.log(`💵 为订单 ${orderId} 添加收款记录 API 响应:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`为订单 ${orderId} 添加收款记录失败:`, error);
    throw error;
  }
};

/**
 * 更新收款记录
 * @route PUT /finance/payments/:paymentId
 */
export const updatePayment = async (paymentId: number, paymentData: UpdatePaymentRequest): Promise<Payment> => {
  try {
    const response = await apiClient.put<Payment>(`/finance/payments/${paymentId}`, paymentData);
    console.log(`💵 更新收款记录 ${paymentId} API 响应:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`更新收款记录 ${paymentId} 失败:`, error);
    throw error;
  }
};

/**
 * 删除收款记录
 * @route DELETE /finance/payments/:paymentId
 */
export const deletePayment = async (paymentId: number): Promise<void> => {
  try {
    await apiClient.delete(`/finance/payments/${paymentId}`);
    console.log(`🗑️ 删除收款记录 ${paymentId} 成功`);
  } catch (error) {
    console.error(`删除收款记录 ${paymentId} 失败:`, error);
    throw error;
  }
}; 