import { theme, ThemeConfig } from 'antd';
import { lightThemeColors, darkThemeColors } from './tokens';

export const getAntdTheme = (themeMode: 'light' | 'dark'): ThemeConfig => {
  const isDark = themeMode === 'dark';
  const colors = isDark ? darkThemeColors : lightThemeColors;

  return {
    // 算法配置，darkAlgorithm是官方提供的暗色算法
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,

    // 全局Token配置
    token: {
      // 品牌主色
      colorPrimary: colors.primary,
      
      // 基础背景色
      colorBgLayout: colors.bodyBg,
      
      // 组件容器背景色
      colorBgContainer: colors.componentBg,

      // 文本色
      colorText: colors.textPrimary,
      colorTextSecondary: colors.textSecondary,
      colorTextTertiary: colors.textTertiary,

      // 边框和分割线
      colorBorder: colors.border,
      colorSplit: colors.divider,
    },
    
    // 组件级别Token配置 (可选，用于更精细的控制)
    components: {
      Layout: {
        bodyBg: colors.bodyBg,
        headerBg: colors.componentBg,
        siderBg: colors.componentBg,
        footerBg: colors.bodyBg,
        headerPadding: '0 24px',
      },
      Card: {
        actionsBg: colors.componentBg,
      },
    },
  };
}; 