import { theme } from 'antd';

// 设计token系统 - 统一样式规范
export const designTokens = {
  colors: {
    primary: 'var(--ant-color-primary)',
    success: 'var(--ant-color-success)', 
    warning: 'var(--ant-color-warning)',
    error: 'var(--ant-color-error)',
    info: 'var(--ant-color-info)',
    textPrimary: 'var(--ant-color-text)',
    textSecondary: 'var(--ant-color-text-secondary)',
    textTertiary: 'var(--ant-color-text-tertiary)',
    background: 'var(--ant-color-bg-container)',
    backgroundSecondary: 'var(--ant-color-bg-layout)',
    border: 'var(--ant-color-border)',
    borderSecondary: 'var(--ant-color-border-secondary)'
  },
  
  fontSize: {
    xs: 'var(--ant-font-size-sm)',     // 12px
    sm: 'var(--ant-font-size)',        // 14px  
    md: 'var(--ant-font-size-lg)',     // 16px
    lg: 'var(--ant-font-size-xl)',     // 20px
    xl: 'var(--ant-font-size-xxl)',    // 24px
    xxl: '28px'                        // 自定义大号字体
  },
  
  spacing: {
    xs: 'var(--ant-margin-xs)',        // 8px
    sm: 'var(--ant-margin-sm)',        // 12px
    md: 'var(--ant-margin)',           // 16px
    lg: 'var(--ant-margin-lg)',        // 24px
    xl: 'var(--ant-margin-xl)',        // 32px
    xxl: '48px'                        // 自定义大间距
  },
  
  borderRadius: {
    sm: 'var(--ant-border-radius-sm)', // 4px
    md: 'var(--ant-border-radius)',    // 6px
    lg: 'var(--ant-border-radius-lg)'  // 8px
  },
  
  shadow: {
    sm: 'var(--ant-box-shadow)',
    md: 'var(--ant-box-shadow-secondary)',
    lg: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
  }
};

// 语义化颜色映射
export const semanticColors = {
  growth: designTokens.colors.success,
  decline: designTokens.colors.error,
  stable: designTokens.colors.warning,
  excellent: '#52c41a',
  good: '#1890ff', 
  needsImprovement: '#faad14',
  poor: '#ff4d4f'
};

// 数据可视化色彩方案
export const chartColors = {
  primary: [
    'var(--ant-color-primary)',
    'var(--ant-color-primary-bg)',
    'var(--ant-color-primary-border)'
  ],
  categorical: [
    '#1890ff', '#13c2c2', '#52c41a', '#faad14', 
    '#f759ab', '#722ed1', '#fa541c', '#2f54eb'
  ],
  sequential: {
    blue: ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff', '#096dd9', '#0050b3'],
    green: ['#f6ffed', '#d9f7be', '#b7eb8f', '#95de64', '#73d13d', '#52c41a', '#389e0d', '#237804'],
    red: ['#fff2e8', '#ffd8bf', '#ffbb96', '#ff9c6e', '#ff7a45', '#ff4d4f', '#d4380d', '#a8071a']
  }
};

// 响应式断点
export const breakpoints = {
  xs: 480,
  sm: 576, 
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600
};

export default designTokens; 