import dayjs, { Dayjs } from 'dayjs';

// 统一的时间格式
export const UNIFIED_DATE_FORMAT = 'YYYY-MM-DD';

// 统一下拉面板类名（用于全局样式控制）
export const UNIFIED_RANGE_PICKER_DROPDOWN_CLASS = 'unified-time-range-dropdown';

// “所有”范围的边界（用于将“所有”映射为超大时间区间）
export const ALL_RANGE_START = dayjs('1970-01-01');
export const ALL_RANGE_END = dayjs('2100-01-01');

export interface UnifiedPresetItem {
  key: 'last7d' | 'last15d' | 'last1m' | 'last3m' | 'last6m' | 'last1y' | 'all';
  label: string;
  getValue: () => [Dayjs, Dayjs];
}

// 统一预设项（顺序固定、文案统一）
export const UNIFIED_TIME_RANGE_PRESETS: UnifiedPresetItem[] = [
  {
    key: 'last7d',
    label: '7天',
    getValue: () => [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'last15d',
    label: '15天',
    getValue: () => [dayjs().subtract(14, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'last1m',
    label: '1月',
    getValue: () => [dayjs().subtract(1, 'month').add(1, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'last3m',
    label: '3月',
    getValue: () => [dayjs().subtract(3, 'month').add(1, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'last6m',
    label: '6月',
    getValue: () => [dayjs().subtract(6, 'month').add(1, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'last1y',
    label: '1年',
    getValue: () => [dayjs().subtract(1, 'year').add(1, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    key: 'all',
    label: '所有',
    getValue: () => [ALL_RANGE_START.startOf('day'), ALL_RANGE_END.endOf('day')],
  },
];

// 为移动端头部快捷分组提供统一顺序（不要在组件里写死）
export const UNIFIED_MOBILE_PRESET_GROUPS: Array<Array<UnifiedPresetItem['key']>> = [
  ['last7d', 'last15d', 'last1m', 'last3m'],
  ['last6m', 'last1y', 'all']
];

// 输出给 Ant Design RangePicker 的 presets 属性
export const getUnifiedAntdPresets = () =>
  UNIFIED_TIME_RANGE_PRESETS.map(preset => ({
    label: preset.label,
    value: preset.getValue(),
  }));

// 工具：判断是否选择了“所有”范围
export const isAllRange = (range: [Dayjs, Dayjs] | null | undefined) => {
  if (!range) return true;
  const [start, end] = range;
  return !!start && !!end && start.isSame(ALL_RANGE_START, 'day') && end.isSame(ALL_RANGE_END, 'day');
};

