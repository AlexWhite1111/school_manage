// 枚举映射工具函数
// 用于将数据库枚举值转换为中文显示文本

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

// 工具函数：获取年级中文名称
export const getGradeLabel = (grade: string): string => {
  return GRADE_LABELS[grade] || grade || '-';
};

// 工具函数：获取来源渠道中文名称
export const getSourceChannelLabel = (sourceChannel: string): string => {
  return SOURCE_CHANNEL_LABELS[sourceChannel] || sourceChannel || '-';
}; 