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
  publicId: string;
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
  EXAM_POSITIVE = 'EXAM_POSITIVE',
  EXAM_NEGATIVE = 'EXAM_NEGATIVE',
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
  studentId: number;  // Internal DB reference - keep for backend compatibility
  class?: {
    id: number;
    name: string;
  };
  student?: {
    id: number;  // Internal DB reference
    name: string;
    publicId: string;  // External identifier
  };
}

// 新增：支持多班级的学生信息
export interface MultiClassStudent {
  student: {
    id: number;  // Internal DB reference
    publicId: string;  // External identifier
    name: string;
    school?: string;
    grade?: string;
  };
  classes: {
    id: number;
    name: string;
    description?: string;
    status: string;
    enrollmentId: number;
  }[];
  totalClasses: number;
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
  publicId?: string; // 学号，用于个人成长报告跳转
  
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

// ============================================
// 财务分析（Analytics Finance）
// ============================================

export interface FinanceAnalyticsKeyMetrics {
  totalReceived: number;
  totalDue: number;
  totalOutstanding: number;
}

export interface FinanceAnalyticsSummary {
  keyMetrics: FinanceAnalyticsKeyMetrics;
  revenueTrend: Array<{ date: string; amount: number }>;
  dueTrend: Array<{ date: string; amount: number }>;
  outstandingByStatus: Array<{ status: 'PAID_FULL' | 'PARTIAL_PAID' | 'UNPAID'; count: number }>;
  topDebtors: Array<{ studentId: number; studentName: string; totalOwed: number }>;
}

export interface FinanceAnalyticsParams {
  startDate: string;
  endDate: string;
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

// ============================================
// 考试系统相关类型
// ============================================

export enum Subject {
  CHINESE = 'CHINESE',
  MATH = 'MATH',
  ENGLISH = 'ENGLISH',
  PHYSICS = 'PHYSICS',
  CHEMISTRY = 'CHEMISTRY',
  BIOLOGY = 'BIOLOGY',
  HISTORY = 'HISTORY',
  GEOGRAPHY = 'GEOGRAPHY',
  POLITICS = 'POLITICS',
}

export enum ExamType {
  DAILY_QUIZ = 'DAILY_QUIZ',
  WEEKLY_TEST = 'WEEKLY_TEST',
  MONTHLY_EXAM = 'MONTHLY_EXAM',
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
}

export interface Exam {
  id: number;
  name: string;
  examType: ExamType;
  examDate: string;
  totalScore?: number;
  description?: string;
  classId: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedById?: number;
  class?: Class;
  createdBy?: {
    id: number;
    displayName?: string;
    username: string;
  };
  scores?: ExamScore[];
  subjects?: Subject[];
  totalStudents?: number;
  recordedScores?: number;
  completionRate?: number;
}

export interface ExamScore {
  id: number;
  score?: number;
  isAbsent: boolean;
  subject: Subject;
  examId: number;
  enrollmentId: number;
  createdAt: string;
  updatedAt: string;
  exam?: Exam;
  enrollment?: {
    id: number;
    studentId: number;
    student: Customer;
  };
  tags?: Array<{
    id: number;
    tag: Tag;
  }>;
}

export interface CreateExamRequest {
  name: string;
  examType: ExamType;
  examDate: string;
  totalScore?: number;
  description?: string;
  classId: number;
  subjects: Subject[];
}

export interface UpdateExamScoresRequest {
  enrollmentId: number;
  subject: Subject;
  score?: number;
  isAbsent?: boolean;
  tags?: number[];
}

export interface ExamDetails {
  exam: Exam;
  studentScores: Array<{
    student: Customer;
    enrollmentId: number;
    scores: Record<Subject, {
      id: number;
      score?: number;
      isAbsent: boolean;
      tags: Tag[];
    }>;
  }>;
  subjectStats: Record<Subject, {
    totalStudents: number;
    recordedScores: number;
    absentCount: number;
    scores: number[];
    average: number;
    highest: number;
    lowest: number;
  }>;
  subjects: Subject[];
}

export interface ExamFilters {
  name?: string;
  examType?: ExamType;
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
}

export interface StudentExamHistory {
  totalRecords: number;
  subjectAnalysis: Array<{
    subject: Subject;
    scores: Array<{
      examId: number;
      examName: string;
      examDate: string;
      examType: ExamType;
      className: string;
      score?: number;
      isAbsent: boolean;
      tags: Tag[];
    }>;
    totalExams: number;
    validScores: number;
    absentCount: number;
    average: number;
    highest: number;
    lowest: number;
    trend: 'improving' | 'declining' | 'stable';
    improvement: number;
  }>;
  allScores: ExamScore[];
}

// ============================================
// 家长反馈系统相关类型
// ============================================

export enum FeedbackType {
  ACADEMIC = 'ACADEMIC',
  BEHAVIOR = 'BEHAVIOR',
  HOMEWORK = 'HOMEWORK',
  SUGGESTION = 'SUGGESTION',
  COMPLAINT = 'COMPLAINT',
  PRAISE = 'PRAISE',
}

export enum FeedbackStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_REPLY = 'WAITING_REPLY',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  CLOSED = 'CLOSED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface ParentFeedback {
  id: number;
  content: string;
  feedbackType: FeedbackType;
  status: FeedbackStatus;
  priority: Priority;
  studentId: number;
  parentName: string;
  parentPhone?: string;
  assignedToId?: number;
  resolvedAt?: string;
  resolvedById?: number;
  createdAt: string;
  updatedAt: string;
  student?: Customer;
  assignedTo?: User;
  resolvedBy?: User;
  replies?: FeedbackReply[];
  tags?: Array<{
    id: number;
    tag: Tag;
  }>;
}

export interface FeedbackReply {
  id: number;
  content: string;
  feedbackId: number;
  authorId: number;
  isInternal: boolean;
  createdAt: string;
  feedback?: ParentFeedback;
  author?: User;
}

export interface CreateFeedbackRequest {
  content: string;
  feedbackType: FeedbackType;
  priority?: Priority;
  studentId: number;
  parentName: string;
  parentPhone?: string;
  tags?: number[];
}

export interface UpdateFeedbackRequest {
  status?: FeedbackStatus;
  assignedToId?: number;
  priority?: Priority;
  tags?: number[];
}

export interface CreateFeedbackReplyRequest {
  content: string;
  isInternal?: boolean;
}