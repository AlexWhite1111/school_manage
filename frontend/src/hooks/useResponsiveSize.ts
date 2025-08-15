import { useResponsive } from './useResponsive';
import { theme } from 'antd';

/**
 * 响应式尺寸定义，统一管理 paddings / fontSize / 间距等
 */
export interface ResponsiveSizes {
  cardPadding: string | number;
  fontSize: {
    title: string | number;
    subtitle: string | number;
    body: string | number;
    caption: string | number;
  };
  gridGutter: number;         // antd <Row gutter> 间距
  containerMaxWidth: string;  // 页面（或卡片）最大宽度
  componentSpacing: string | number;   // 组件之间的外边距
}

/**
 * 依据屏幕宽度返回一套设计尺寸
 * - Mobile : < 768px
 * - Tablet : 768 – 992px
 * - Desktop: ≥ 992px
 */
export const useResponsiveSize = (): ResponsiveSizes => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { token } = theme.useToken();

  if (isMobile) {
    return {
      cardPadding: token.marginSM,
      fontSize: {
        title: token.fontSizeXL,
        subtitle: token.fontSizeLG,
        body: token.fontSize,
        caption: token.fontSizeSM
      },
      gridGutter: 8,
      containerMaxWidth: '100%',
      componentSpacing: token.marginSM
    };
  }

  if (isTablet) {
    return {
      cardPadding: token.margin,
      fontSize: {
        title: token.fontSizeXL,
        subtitle: token.fontSizeLG,
        body: token.fontSizeLG,
        caption: token.fontSize
      },
      gridGutter: 12,
      containerMaxWidth: '100%',
      componentSpacing: token.margin
    };
  }

  // Desktop（默认）
  return {
    cardPadding: token.marginLG,
    fontSize: {
      title: token.fontSizeHeading3,
      subtitle: token.fontSizeXL,
      body: token.fontSizeLG,
      caption: token.fontSize
    },
    gridGutter: 16,
    containerMaxWidth: '1200px',
    componentSpacing: token.marginLG
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