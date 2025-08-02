import { useState, useEffect } from 'react';

export interface ScreenSize {
  isMobile: boolean;    // < 768px
  isTablet: boolean;    // 768px - 992px
  isDesktop: boolean;   // >= 992px
  isSmall: boolean;     // < 576px (超小屏)
  width: number;
}

/**
 * 响应式Hook - 监听屏幕尺寸变化
 * 统一使用Ant Design的断点标准
 * xs: < 576px, sm: >= 576px, md: >= 768px, lg: >= 992px, xl: >= 1200px, xxl: >= 1600px
 * @returns 屏幕尺寸信息
 */
export const useResponsive = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return {
      width,
      isSmall: width < 576,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 992,
      isDesktop: width >= 992
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize({
        width,
        isSmall: width < 576,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 992,
        isDesktop: width >= 992
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}; 