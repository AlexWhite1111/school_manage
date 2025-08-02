// API相关类型定义，严格按照后端API文档和Prisma schema

// ============================================
// 认证相关类型
// ============================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// ============================================
// 客户相关类型 (根据Prisma schema)
// ============================================

export enum CustomerStatus {
  POTENTIAL = 'POTENTIAL',
  INITIAL_CONTACT = 'INITIAL_CONTACT',
  INTERESTED = 'INTERESTED',
  TRIAL_CLASS = 'TRIAL_CLASS',
  ENROLLED = 'ENROLLED',
  LOST = 'LOST',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export interface Parent {
  id?: number;
  name: string;
  relationship?: string;
  phone?: string;
  wechatId?: string;
}

export interface Customer {
  id: number;
  name: string;
  gender?: Gender;
  birthDate?: string;
  school?: string;
  grade?: string;
  address?: string;
  sourceChannel?: string;
  firstContactDate?: string;
  status: CustomerStatus;
  nextFollowUpDate?: string;
  createdAt: string;
  updatedAt?: string;
  parents: Parent[];
  tags: number[];
  communicationLogs?: CommunicationLog[];
}

export interface CreateCustomerRequest {
  name: string;
  gender?: Gender;
  birthDate?: string;
  school?: string;
  grade?: string;
  address?: string;
  sourceChannel?: string;
  firstContactDate?: string;
  status?: CustomerStatus;
  nextFollowUpDate?: string;
  parents: Omit<Parent, 'id'>[];
  tags: number[];
}

export interface CustomerStats {
  totalCustomers: number;
  statusCounts: Record<CustomerStatus, number>;
  monthlyNewCustomers: number;
}

// ============================================
// 标签相关类型
// ============================================

export enum TagType {
  FAMILY_JOB = 'FAMILY_JOB',
  FAMILY_INCOME = 'FAMILY_INCOME',
  FAMILY_EDUCATION_CONCEPT = 'FAMILY_EDUCATION_CONCEPT',
  FAMILY_FOCUS = 'FAMILY_FOCUS',
  FAMILY_ROLE = 'FAMILY_ROLE',
  CHILD_PERSONALITY = 'CHILD_PERSONALITY',
  CHILD_ACADEMIC_LEVEL = 'CHILD_ACADEMIC_LEVEL',
  CHILD_DISCIPLINE = 'CHILD_DISCIPLINE',
  GROWTH_POSITIVE = 'GROWTH_POSITIVE',
  GROWTH_NEGATIVE = 'GROWTH_NEGATIVE',
}

export interface Tag {
  id: number;
  text: string;
  type: TagType;
  isPredefined: boolean;
  isPersonal: boolean;
  createdById?: number;
  usageCount: number;
  deletedAt?: string;
  deletedById?: number;
  creator?: {
    id: number;
    username: string;
  };
  deletedBy?: {
    id: number;
    username: string;
  };
}

export interface CreateTagRequest {
  text: string;
  type: TagType;
  isPersonal?: boolean;
}

export interface TagStats {
  totalPersonalTags: number;
  totalUsage: number;
  deletedCount?: number;
  byType: Record<string, { count: number; usage: number }>;
}

// ============================================
// 沟通记录相关类型
// ============================================

export interface CommunicationLog {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  customerId: number;
}

export interface CreateCommunicationLogRequest {
  content: string;
}

// ============================================
// 班级和学生相关类型 - 重构支持多班级
// ============================================

export interface Class {
  id: number;
  name: string;
  studentCount?: number;
  createdAt?: string;
}

export interface CreateClassRequest {
  name: string;
}

export interface ClassEnrollment {
  id: number;
  enrollmentDate?: string;
  classId: number;
  studentId: number;
  class?: {
    id: number;
    name: string;
  };
  student?: {
    id: number;
    name: string;
  };
}

// 新增：支持多班级的学生信息
export interface MultiClassStudent {
  id: number;
  name: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate?: string;
  school?: string;
  grade?: string;
  status: string;
  createdAt: string;
  // 支持多个班级的注册信息
  enrollments: {
    id: number;
    enrollmentDate?: string;
    classId: number;
    className: string;
    // 该班级的当日考勤
    todayAttendance?: {
      AM?: AttendanceStatus | null;
      PM?: AttendanceStatus | null;
    };
  }[];
  // 最近成长标签（跨所有班级）
  recentGrowthTags?: {
    id: number;
    text: string;
    type: TagType;
    createdAt: string;
    className?: string; // 标记来自哪个班级
  }[];
  // 统计信息
  stats?: {
    totalAttendanceDays: number;
    presentRate: number;
    growthTagsCount: number;
    lastActivityDate?: string;
  };
}

// 重构：单班级视图的学生信息（简化版）
export interface ClassStudent {
  id: number;
  name: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate?: string;
  school?: string;
  grade?: string;
  status: string;
  
  // 当前班级的注册信息
  enrollmentId: number;
  enrollmentDate?: string;
  
  // 当日考勤信息
  todayAttendance?: {
    AM?: AttendanceStatus | null;
    PM?: AttendanceStatus | null;
  };
  
  // 最近成长标签（限当前班级）
  recentGrowthTags?: {
    id: number;
    text: string;
    type: TagType;
    createdAt: string;
  }[];
  
  // 其他班级信息（用于展示学生是否在多个班级）
  otherEnrollments?: {
    id: number;
    className: string;
  }[];
  
  // 快速统计
  quickStats?: {
    weeklyAttendanceRate: number;
    recentPositiveTags: number;
    recentNegativeTags: number;
  };
}

export interface EnrollStudentsRequest {
  studentIds: number[];
}

export interface RemoveStudentsRequest {
  enrollmentIds: number[];
}

// 新增：班级学生查询参数
export interface GetClassStudentsParams {
  includeOtherEnrollments?: boolean; // 是否包含其他班级信息
  includeStats?: boolean; // 是否包含统计信息
  includeRecentTags?: boolean; // 是否包含最近标签
  date?: string; // 指定日期的考勤（默认今天）
}

// ============================================
// 考勤相关类型
// ============================================

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  NO_SHOW = 'NO_SHOW',
}

export enum AttendanceSlot {
  AM = 'AM',
  PM = 'PM',
}

export interface AttendanceRecord {
  id: number;
  recordDate: string;
  timeSlot: AttendanceSlot;
  status: AttendanceStatus;
  createdAt: string;
  enrollmentId: number;
}

export interface CreateAttendanceRecordRequest {
  enrollmentId: number;
  status: AttendanceStatus;
  timeSlot: AttendanceSlot;
}

// ============================================
// 成长记录相关类型
// ============================================

export interface GrowthLog {
  id: number;
  createdAt: string;
  enrollmentId: number;
  tagId: number;
}

export interface CreateGrowthLogRequest {
  enrollmentId: number;
  tagId: number;
}

// ============================================
// 财务相关类型
// ============================================

export interface FinancialOrder {
  id: number;
  name: string;
  totalDue: number;
  coursePeriodStart?: string;
  coursePeriodEnd?: string;
  dueDate?: string;
  createdAt: string;
  studentId: number;
  payments: Payment[];
}

export interface CreateFinancialOrderRequest {
  studentId: number;
  name: string;
  totalDue: number;
  dueDate?: string;
  coursePeriodStart?: string;
  coursePeriodEnd?: string;
}

export interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  notes?: string;
  createdAt: string;
  orderId: number;
}

export interface CreatePaymentRequest {
  amount: number;
  paymentDate: string;
  notes?: string;
}

// ============================================
// 仪表盘相关类型
// ============================================

export interface DashboardFinancialSummary {
  monthlyReceived: number;
  monthlyDue: number;
  totalOutstanding: number;
}

// Dashboard API 类型
export interface FollowUpCustomer {
  id: number;
  name: string;
  sourceChannel: string;
  nextFollowUpDate: string;
  phone?: string;
  parentName?: string;
  parentRelationship?: string;
  status?: CustomerStatus;
}

export interface DashboardSummary {
  financial: {
    monthlyReceived: number;
    monthlyDue: number;
    totalOutstanding: number;
  };
  followUps: FollowUpCustomer[];
}

// ============================================
// 通用API类型
// ============================================

export interface ApiError {
  message: string;
  code: string | number;
  data?: any;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 

// ============================================
// 数据分析相关类型 (Analytics)
// ============================================

/**
 * 客户漏斗分析数据
 */
export interface CustomerFunnelData {
  // 各阶段客户数量
  stages: {
    stage: CustomerStatus;
    count: number;
    percentage: number; // 相对于潜在客户的百分比
    conversionRate?: number; // 从上一阶段的转化率
  }[];
  
  // 总体统计
  totalNewCustomers: number;
  finalEnrolledCount: number;
  overallConversionRate: number;
  averageConversionDays?: number;
}

/**
 * 来源渠道分析数据
 */
export interface SourceChannelAnalysis {
  channels: {
    channel: string;
    customerCount: number;
    enrolledCount: number;
    conversionRate: number;
    totalRevenue?: number; // 如果有财务数据关联
  }[];
}

/**
 * 客户分析时间对比数据
 */
export interface CustomerAnalyticsComparison {
  current: CustomerFunnelData;
  previous?: CustomerFunnelData;
  periodType: 'previous_period' | 'same_period_last_year';
}

/**
 * 学生成长报告数据 (基于现有的StudentGrowthReport端点)
 */
export interface StudentGrowthAnalytics {
  studentId: number;
  studentName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  
  // 成长趋势数据 (按日期聚合)
  growthTrend: {
    date: string;
    positiveCount: number; // GROWTH_POSITIVE 标签数量
    negativeCount: number; // GROWTH_NEGATIVE 标签数量
  }[];
  
  // 高频标签统计
  topTags: {
    positive: {
      tagId: number;
      tagText: string;
      count: number;
    }[];
    negative: {
      tagId: number;
      tagText: string;
      count: number;
    }[];
  };
  
  // 考勤概览
  attendanceSummary: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    noShowDays: number;
    attendanceRate: number;
  };
  
  // 整体成长得分 (可选的计算指标)
  overallScore?: {
    current: number;
    trend: 'improving' | 'stable' | 'declining';
  };
}

/**
 * 数据分析请求参数
 */
export interface AnalyticsTimeRangeParams {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  compareWith?: {
    type: 'previous_period' | 'same_period_last_year';
    startDate: string;
    endDate: string;
  };
}

/**
 * 客户分析筛选参数
 */
export interface CustomerAnalyticsParams extends AnalyticsTimeRangeParams {
  sourceChannel?: string; // 按来源渠道筛选
  customerTags?: number[]; // 按客户标签筛选
}

/**
 * 学生成长分析筛选参数
 */
export interface StudentGrowthAnalyticsParams extends AnalyticsTimeRangeParams {
  classId?: number; // 按班级筛选
  gradeLevel?: string; // 按年级筛选
}

/**
 * 核心分析指标卡片数据
 */
export interface AnalyticsKeyMetrics {
  newCustomers: {
    current: number;
    change?: number; // 相对于对比期间的变化
    changePercentage?: number;
  };
  conversionRate: {
    current: number;
    change?: number;
    changePercentage?: number;
  };
  averageConversionDays: {
    current: number;
    change?: number;
    changePercentage?: number;
  };
  totalRevenue?: {
    current: number;
    change?: number;
    changePercentage?: number;
  };
} 