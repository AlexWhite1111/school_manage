// 预设标签列表 - 基于工作流文档
// 分离到独立文件以避免React Fast Refresh问题

export const PREDEFINED_POSITIVE_TAGS = [
  '演草工整', 
  '主动提问', 
  '按时完成作业', 
  '积极参与讨论', 
  '课前预习', 
  '作业整洁', 
  '主动帮助同学'
] as const;

export const PREDEFINED_NEGATIVE_TAGS = [
  '作业拖拉', 
  '上课走神', 
  '作业不整洁', 
  '缺乏主动性', 
  '容易分心', 
  '不按时完成作业', 
  '课堂参与度低', 
  '依赖他人', 
  '情绪波动大', 
  '缺乏自信'
] as const;

export type PredefinedPositiveTag = typeof PREDEFINED_POSITIVE_TAGS[number];
export type PredefinedNegativeTag = typeof PREDEFINED_NEGATIVE_TAGS[number]; 