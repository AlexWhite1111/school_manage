// 样式工具函数 - 解决Antd margin样式冲突问题

import type { CSSProperties } from 'react';

// 安全的margin样式设置，避免与Antd的margin简写属性冲突
export const safeMarginStyle = (margins: {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}): CSSProperties => {
  const { top, right, bottom, left } = margins;
  
  // 使用具体的margin属性而不是简写，避免与Antd冲突
  const style: CSSProperties = {};
  
  if (top !== undefined) style.marginTop = typeof top === 'number' ? `${top}px` : top;
  if (right !== undefined) style.marginInlineEnd = typeof right === 'number' ? `${right}px` : right;
  if (bottom !== undefined) style.marginBottom = typeof bottom === 'number' ? `${bottom}px` : bottom;
  if (left !== undefined) style.marginInlineStart = typeof left === 'number' ? `${left}px` : left;
  
  return style;
};

// 预定义的常用margin样式
export const marginStyles = {
  // 垂直间距
  mb8: safeMarginStyle({ bottom: 8 }),
  mb12: safeMarginStyle({ bottom: 12 }),
  mb16: safeMarginStyle({ bottom: 16 }),
  mb24: safeMarginStyle({ bottom: 24 }),
  
  // 水平间距
  mr4: safeMarginStyle({ right: 4 }),
  mr8: safeMarginStyle({ right: 8 }),
  mr16: safeMarginStyle({ right: 16 }),
  
  // 左侧间距
  ml4: safeMarginStyle({ left: 4 }),
  ml8: safeMarginStyle({ left: 8 }),
  
  // 顶部间距
  mt16: safeMarginStyle({ top: 16 }),
  mt24: safeMarginStyle({ top: 24 }),
  
  // 重置margin
  reset: { margin: 0 } as CSSProperties,
  
  // 全部设置为0
  none: safeMarginStyle({ top: 0, right: 0, bottom: 0, left: 0 })
};

// 响应式margin工具
export const responsiveMargin = (
  mobile: Partial<typeof marginStyles>, 
  desktop: Partial<typeof marginStyles>,
  isMobile: boolean
): CSSProperties => {
  const selectedStyles = isMobile ? mobile : desktop;
  
  // 合并所有选中的样式对象
  return Object.values(selectedStyles).reduce((acc, style) => {
    return { ...acc, ...style };
  }, {} as CSSProperties);
};