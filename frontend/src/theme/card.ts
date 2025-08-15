import type { CSSProperties } from 'react';

// 统一卡片规范：在此集中配置，避免碎片化
// 仅依赖全局 CSS 变量（由 tokens.applyAppCssVars 注入），不直接写死颜色值

export type CardDensity = 'compact' | 'normal' | 'spacious';
export type CardVariant = 'elevated' | 'outlined' | 'flat';

export interface UnifiedCardOptions {
  density?: CardDensity;
  variant?: CardVariant;
  isMobile?: boolean;
}

export interface UnifiedCardComputedStyles {
  style: CSSProperties;
  styles: { header?: CSSProperties; body?: CSSProperties };
}

const densityToPadding: Record<CardDensity, { head: string; body: string }> = {
  // 使用统一 CSS 变量，避免硬编码数值
  compact: { head: 'var(--app-card-head-padding-mobile)', body: 'var(--app-card-body-padding-mobile)' },
  normal: { head: 'var(--app-card-head-padding)', body: 'var(--app-card-body-padding)' },
  // 宽松态：基于全局 8px 基线变量组合
  spacious: { head: 'var(--space-4) var(--space-5)', body: 'var(--space-5)' }
};

/**
 * 生成统一的 Card 样式（不依赖运行时主题对象，只使用 CSS 变量）
 */
export const getUnifiedCardStyles = (opts: UnifiedCardOptions = {}): UnifiedCardComputedStyles => {
  const density: CardDensity = opts.density || 'normal';
  const variant: CardVariant = opts.variant || 'elevated';

  // 圆角：移动端稍小，桌面端标准
  const borderRadius = `var(--app-card-radius${opts.isMobile ? '-mobile' : ''})`;

  // 阴影 & 边框：按变体区分
  const baseStyle: CSSProperties = {
    borderRadius,
    background: 'var(--app-card-bg)'
  };

  if (variant === 'elevated') {
    baseStyle.boxShadow = 'var(--app-card-shadow)';
    baseStyle.border = '1px solid var(--app-card-border-color)';
  } else if (variant === 'outlined') {
    baseStyle.boxShadow = 'none';
    baseStyle.border = '1px solid var(--app-card-border-color)';
  } else if (variant === 'flat') {
    baseStyle.boxShadow = 'none';
    baseStyle.border = '1px solid transparent';
  }

  const { head, body } = densityToPadding[density];

  return {
    style: baseStyle,
    styles: { header: { padding: head }, body: { padding: body } },
  };
};

/**
 * 预设：在大多数场景下直接使用
 */
export const UnifiedCardPresets = {
  mobileCompact: (isMobile: boolean): UnifiedCardComputedStyles =>
    getUnifiedCardStyles({ density: 'compact', variant: 'elevated', isMobile }),
  desktopDefault: (isMobile: boolean): UnifiedCardComputedStyles =>
    getUnifiedCardStyles({ density: 'normal', variant: 'elevated', isMobile }),
  outlined: (isMobile: boolean): UnifiedCardComputedStyles =>
    getUnifiedCardStyles({ density: 'normal', variant: 'outlined', isMobile }),
};

