// src/theme/tokens.ts: 定义应用的设计语言，包括颜色、字体、间距等Token

// 品牌主色
export const primaryColors = {
  blue: '#1677ff', // Ant Design 默认主色
  gold: '#faad14',
  green: '#52c41a',
};

// 中性色板 - Light Theme
export const lightThemeColors = {
  primary: primaryColors.blue,
  // 背景色
  bodyBg: '#f5f5f5', // 整体背景色
  componentBg: '#ffffff', // 组件背景，如卡片
  // 文本色
  textPrimary: 'rgba(0, 0, 0, 0.88)',
  textSecondary: 'rgba(0, 0, 0, 0.65)',
  textTertiary: 'rgba(0, 0, 0, 0.45)',
  // 边框和分割线
  border: '#d9d9d9',
  divider: 'rgba(5, 5, 5, 0.06)',
};

// 中性色板 - Dark Theme
export const darkThemeColors = {
  primary: primaryColors.blue,
  // 背景色
  bodyBg: '#141414',
  componentBg: '#1f1f1f',
  // 文本色
  textPrimary: 'rgba(255, 255, 255, 0.85)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textTertiary: 'rgba(255, 255, 255, 0.45)',
  // 边框和分割线
  border: '#424242',
  divider: 'rgba(255, 255, 255, 0.12)',
}; 