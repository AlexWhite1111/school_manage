import React from 'react';
import { DatePicker, Button, Space, theme as themeApi } from 'antd';
import type { DatePickerProps, RangePickerProps } from 'antd/es/date-picker';
import dayjs, { Dayjs } from 'dayjs';
import {
  UNIFIED_DATE_FORMAT,
  getUnifiedAntdPresets,
  UNIFIED_TIME_RANGE_PRESETS,
  UNIFIED_RANGE_PICKER_DROPDOWN_CLASS,
} from '@/config/timeRange';
import { UNIFIED_MOBILE_PRESET_GROUPS } from '@/config/timeRange';
import { useResponsive } from '@/hooks/useResponsive';

const { RangePicker } = DatePicker;

export interface UnifiedRangePickerProps extends Omit<RangePickerProps, 'presets' | 'format' | 'renderExtraFooter'> {
  // 是否允许自定义选择（即手动选日期）。规范里允许，但默认预设为主。
  allowCustom?: boolean;
}

// 统一样式与交互的封装 RangePicker
const UnifiedRangePicker: React.FC<UnifiedRangePickerProps> = ({
  value,
  onChange,
  allowCustom = true,
  ...rest
}) => {
  const { isMobile } = useResponsive();
  const { token } = themeApi.useToken();
  const presetsMap = React.useMemo(() => {
    const map = new Map(UNIFIED_TIME_RANGE_PRESETS.map(p => [p.key, p]));
    return map;
  }, []);
  const antdPresets = React.useMemo(() => (isMobile ? undefined : getUnifiedAntdPresets()), [isMobile]);

  const renderMobileHeader = () => {
    if (!isMobile) return null;
    return (
      <div className="unified-quickbar">
        {UNIFIED_MOBILE_PRESET_GROUPS.map((row, rowIdx) => (
          <div key={rowIdx} className="unified-quickbar-row">
            {row.map(key => {
              const preset = presetsMap.get(key)!;
              return (
                <Button
                  key={key}
                  size="small"
                  onClick={() => onChange?.(preset.getValue() as any, ['', ''] as any)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderPanel = (panelNode: React.ReactNode) => {
    if (!isMobile) return panelNode;
    return (
      <div>
        {renderMobileHeader()}
        {panelNode}
      </div>
    );
  };

  // 仅透传规范允许的属性，并统一 format、presets、顺序与样式
  return (
    <RangePicker
      value={value as any}
      onChange={(dates, dateStrings) => onChange?.(dates as any, dateStrings as any)}
      presets={antdPresets}
      format={UNIFIED_DATE_FORMAT}
      placement={rest.placement ?? 'bottomLeft'}
      separator={rest.separator ?? '~'}
      allowClear={rest.allowClear ?? true}
      inputReadOnly={rest.inputReadOnly ?? false}
      showNow={rest.showNow ?? false}
      getPopupContainer={rest.getPopupContainer ?? (() => document.body)}
      // 移动端优化：Antd v5 自带移动端适配，此处保留默认交互；
      // 如需强制竖向双日历，后续可通过 class 注入样式增强
      dropdownClassName={`${UNIFIED_RANGE_PICKER_DROPDOWN_CLASS} ${rest.dropdownClassName ?? ''}`.trim()}
      panelRender={renderPanel}
      {...rest}
    />
  );
};

export default UnifiedRangePicker;

