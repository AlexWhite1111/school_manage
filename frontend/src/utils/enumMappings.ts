// 枚举映射工具函数 - 统一映射显示为中文
// 数据库通过 @map 存储中文，但前端代码使用英文标识符

// 年级枚举映射
export const GRADE_LABELS: Record<string, string> = {
  'CHU_YI': '初一',
  'CHU_ER': '初二', 
  'CHU_SAN': '初三',
  'GAO_YI': '高一',
  'GAO_ER': '高二',
  'GAO_SAN': '高三'
};

// 来源渠道枚举映射
export const SOURCE_CHANNEL_LABELS: Record<string, string> = {
  'JIAZHANG_TUIJIAN': '家长推荐',
  'PENGYOU_QINQI': '朋友亲戚',
  'XUESHENG_SHEJIAO': '学生社交圈',
  'GUANGGAO_CHUANDAN': '广告传单',
  'DITUI_XUANCHUAN': '地推宣传',
  'WEIXIN_GONGZHONGHAO': '微信公众号',
  'DOUYIN': '抖音',
  'QITA_MEITI': '其他媒体',
  'HEZUO': '合作',
  'QITA': '其他'
};

// 客户状态枚举映射
export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  'POTENTIAL': '潜在用户',
  'INITIAL_CONTACT': '初步沟通',
  'INTERESTED': '意向用户',
  'TRIAL_CLASS': '试课',
  'ENROLLED': '报名',
  'LOST': '流失客户'
};

// 性别枚举映射
export const GENDER_LABELS: Record<string, string> = {
  'MALE': '男',
  'FEMALE': '女',
  'OTHER': '其他'
};

// 用户角色枚举映射
export const USER_ROLE_LABELS: Record<string, string> = {
  'SUPER_ADMIN': '超级管理员',
  'MANAGER': '管理员',
  'TEACHER': '教师',
  'STUDENT': '学生'
};

// 考勤状态枚举映射
export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  'PRESENT': '已到',
  'LATE': '迟到',
  'ABSENT': '请假',
  'NO_SHOW': '未到'
};

// 时间段枚举映射
export const ATTENDANCE_SLOT_LABELS: Record<string, string> = {
  'AM': '上午',
  'PM': '下午'
};

// 科目枚举映射
export const SUBJECT_LABELS: Record<string, string> = {
  'CHINESE': '语文',
  'MATH': '数学',
  'ENGLISH': '英语',
  'PHYSICS': '物理',
  'CHEMISTRY': '化学',
  'BIOLOGY': '生物',
  'HISTORY': '历史',
  'GEOGRAPHY': '地理',
  'POLITICS': '政治'
};

// 考试类型枚举映射
export const EXAM_TYPE_LABELS: Record<string, string> = {
  'DAILY_QUIZ': '日常测验',
  'WEEKLY_TEST': '周测',
  'MONTHLY_EXAM': '月考',
  'MIDTERM': '期中考试',
  'FINAL': '期末考试'
};

// 标签类型枚举映射
export const TAG_TYPE_LABELS: Record<string, string> = {
  'FAMILY_JOB': '家庭职业',
  'FAMILY_INCOME': '家庭收入',
  'FAMILY_EDUCATION_CONCEPT': '家庭教育理念',
  'FAMILY_FOCUS': '家庭关注点',
  'FAMILY_ROLE': '家庭角色',
  'CHILD_PERSONALITY': '孩子性格',
  'CHILD_ACADEMIC_LEVEL': '孩子学业水平',
  'CHILD_DISCIPLINE': '孩子纪律',
  'GROWTH_POSITIVE': '成长正面',
  'GROWTH_NEGATIVE': '成长负面',
  'EXAM_POSITIVE': '考试正面',
  'EXAM_NEGATIVE': '考试负面'
};

// === 工具函数 ===

export const getGradeLabel = (grade: string): string => {
  return GRADE_LABELS[grade] || grade || '-';
};

export const getSourceChannelLabel = (sourceChannel: string): string => {
  return SOURCE_CHANNEL_LABELS[sourceChannel] || sourceChannel || '-';
};

export const getCustomerStatusLabel = (status: string): string => {
  return CUSTOMER_STATUS_LABELS[status] || status || '-';
};

export const getGenderLabel = (gender: string): string => {
  return GENDER_LABELS[gender] || gender || '-';
};

export const getUserRoleLabel = (role: string): string => {
  return USER_ROLE_LABELS[role] || role || '-';
};

export const getAttendanceStatusLabel = (status: string): string => {
  return ATTENDANCE_STATUS_LABELS[status] || status || '-';
};

export const getAttendanceSlotLabel = (slot: string): string => {
  return ATTENDANCE_SLOT_LABELS[slot] || slot || '-';
};

export const getSubjectLabel = (subject: string): string => {
  return SUBJECT_LABELS[subject] || subject || '-';
};

export const getExamTypeLabel = (examType: string): string => {
  return EXAM_TYPE_LABELS[examType] || examType || '-';
};

export const getTagTypeLabel = (tagType: string): string => {
  return TAG_TYPE_LABELS[tagType] || tagType || '-';
}; 