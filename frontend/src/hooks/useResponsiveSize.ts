import { useResponsive } from './useResponsive';
import { designTokens } from '@/theme/designTokens';

/**
 * 响应式尺寸定义，统一管理 paddings / fontSize / 间距等
 */
export interface ResponsiveSizes {
  cardPadding: string;
  fontSize: {
    title: string;
    subtitle: string;
    body: string;
    caption: string;
  };
  gridGutter: number;         // antd <Row gutter> 间距
  containerMaxWidth: string;  // 页面（或卡片）最大宽度
  componentSpacing: string;   // 组件之间的外边距
}

/**
 * 依据屏幕宽度返回一套设计尺寸
 * - Mobile : < 768px
 * - Tablet : 768 – 992px
 * - Desktop: ≥ 992px
 */
export const useResponsiveSize = (): ResponsiveSizes => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile) {
    return {
      cardPadding: designTokens.spacing.sm,
      fontSize: {
        title: designTokens.fontSize.lg,
        subtitle: designTokens.fontSize.md,
        body: designTokens.fontSize.sm,
        caption: designTokens.fontSize.xs
      },
      gridGutter: 8,
      containerMaxWidth: '100%',
      componentSpacing: designTokens.spacing.sm
    };
  }

  if (isTablet) {
    return {
      cardPadding: designTokens.spacing.md,
      fontSize: {
        title: designTokens.fontSize.xl,
        subtitle: designTokens.fontSize.lg,
        body: designTokens.fontSize.md,
        caption: designTokens.fontSize.sm
      },
      gridGutter: 12,
      containerMaxWidth: '100%',
      componentSpacing: designTokens.spacing.md
    };
  }

  // Desktop（默认）
  return {
    cardPadding: designTokens.spacing.lg,
    fontSize: {
      title: designTokens.fontSize.xxl,
      subtitle: designTokens.fontSize.xl,
      body: designTokens.fontSize.md,
      caption: designTokens.fontSize.sm
    },
    gridGutter: 16,
    containerMaxWidth: '1200px',
    componentSpacing: designTokens.spacing.lg
  };
};

/**
 * 根据屏幕尺寸动态计算 <Col span>，方便列表/卡片响应式布局
 *
 * getColSpan('lg') => 16 | 24 | …
 * getColSpan('md') =>  8 | 12 | …
 * getColSpan('sm') =>  6 |  8 | …
 */
export const useResponsiveColumns = () => {
  const { isMobile, isTablet } = useResponsive();

  const getColSpan = (size: 'sm' | 'md' | 'lg') => {
    if (isMobile) return 24;                           // 一行一列
    if (isTablet) {
      return size === 'lg' ? 24 : size === 'md' ? 12 : 8;
    }
    // Desktop
    return size === 'lg' ? 16 : size === 'md' ? 8 : 6;
  };

  return { getColSpan };
};

export default useResponsiveSize;