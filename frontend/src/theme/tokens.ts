// src/theme/tokens.ts: 定义应用的设计语言，包括颜色、字体、间距等Token

import { theme, ThemeConfig } from 'antd';

// 语义颜色Token（与 /docs/design/tokens-proposal.json 对齐）
export const semanticTokens = {
  color: {
    primary: '#1677ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1677ff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.88)',
    secondary: 'rgba(0, 0, 0, 0.65)',
    tertiary: 'rgba(0, 0, 0, 0.45)',
    muted: '#8c8c8c',
  },
  bg: {
    layout: '#f5f5f5',
    container: '#ffffff',
  },
  border: {
    default: '#d9d9d9',
    secondary: '#e8e8e8',
    divider: 'rgba(5, 5, 5, 0.06)'
  },
  accent: {
    volcano: '#fa8c16',
    purple: '#722ed1'
  },
  status: {
    successBg: '#f6ffed',
    errorBg: '#fff2f0',
    warningBg: '#fffbe6'
  }
};

export const semanticTokensDark = {
  color: {
    primary: '#1677ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1677ff',
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.85)',
    secondary: 'rgba(255, 255, 255, 0.65)',
    tertiary: 'rgba(255, 255, 255, 0.45)',
    muted: '#8c8c8c',
  },
  bg: {
    layout: '#141414',
    container: '#1f1f1f',
  },
  border: {
    default: '#424242',
    secondary: '#303030',
    divider: 'rgba(255, 255, 255, 0.12)'
  },
  accent: {
    volcano: '#fa8c16',
    purple: '#722ed1'
  },
  status: {
    successBg: '#162312',
    errorBg: '#2a1215',
    warningBg: '#2b2111'
  }
};

// 导出与 AntD ConfigProvider 兼容的 ThemeConfig
export const getAntdTheme = (mode: 'light' | 'dark'): ThemeConfig => {
  const isDark = mode === 'dark';
  const tokens = isDark ? semanticTokensDark : semanticTokens;
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: tokens.color.primary,
      colorSuccess: tokens.color.success,
      colorWarning: tokens.color.warning,
      colorError: tokens.color.error,
      colorInfo: tokens.color.info,
      colorText: tokens.text.primary,
      colorTextSecondary: tokens.text.secondary,
      colorTextTertiary: tokens.text.tertiary,
      colorBorder: tokens.border.default,
      colorSplit: tokens.border.divider,
      colorBgLayout: tokens.bg.layout,
      colorBgContainer: tokens.bg.container,
    },
  };
};

// 便于外部直接拿到两套算法+tokens
export const lightThemeTokens: ThemeConfig = getAntdTheme('light');
export const darkThemeTokens: ThemeConfig = getAntdTheme('dark');

// ===============================
// 应用级扩展：统一导出的调色盘与CSS变量（仅此处集中配置）
// ===============================

// ---------- 基础与可访问性工具 ----------
// 轻量的颜色与对比度工具，供 a11y 相关逻辑复用
type RGB = { r: number; g: number; b: number };
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const hexToRgb = (hex: string): RGB => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};
const srgbToLinear = (c: number) => {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
};
const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};
export const contrastRatio = (fg: string, bg: string) => {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const light = Math.max(L1, L2) + 0.05;
  const dark = Math.min(L1, L2) + 0.05;
  return light / dark;
};
export const pickReadableText = (background: string, light = '#ffffff', dark = '#000000', threshold = 4.5) => {
  // 选择在指定背景上对比度更高且满足 AA 标准的文本颜色
  const crLight = contrastRatio(light, background);
  const crDark = contrastRatio(dark, background);
  const candidate = crLight >= threshold || crDark >= threshold
    ? (crLight >= crDark ? light : dark)
    : (crLight >= crDark ? light : dark);
  return candidate;
};

export type AppTokens = {
	gradients: {
		brandPrimary: string;
		contentPanel: string; // 页面/面板可用的渐变或纯色背景
	};
	colors: {
		subjectPalette: string[]; // 图表/词云复用的科目色板（优先使用 AntD 语义色 + 扩展色）
		wordCloudPalette: string[];
		overlayMask: string; // 浮层遮罩
		glassBackground: string; // 毛玻璃容器背景
		scrollbarThumb: string;
		scrollbarThumbHover: string;
		scrollbarTrack: string;
	};
	// 基础层
	base: {
		white: string;
		black: string;
		transparent: string;
		gray: string[]; // 0-12 灰阶（从浅到深）
	};
	// 文本与交互层
	text: {
		inverse: string; // 反色文本，用于深色背景
		disabled: string;
		placeholder: string;
		link: string;
		linkHover: string;
	};
	interaction: {
		focusRing: string;
		active: string;
		hover: string;
		selected: string;
	};
	// 组件层（仅差异化覆盖）
	components: {
		button: { ghostText: string };
		tag: { defaultBg: string };
		badge: { info: string };
		card: { subtleBg: string };
		table: { headerBg: string; border: string };
		notification: { infoBg: string };
	};
	// 图表层
	chart: {
		categorical: string[]; // 分类调色板
		sequential: string[]; // 渐变序列（单色系）
		diverging: string[]; // 发散配色（负-中-正）
		colorBlindSafe: string[]; // 色盲安全色板（Okabe–Ito）
		aux: { grid: string; axis: string; tooltipBg: string; referenceLine: string };
	};
	// 可访问性
	a11y: { contrastTextNormal: number; contrastTextLarge: number };
};

export const getAppTokens = (mode: 'light' | 'dark'): AppTokens => {
	const isDark = mode === 'dark';
	const ant = isDark ? semanticTokensDark : semanticTokens;

	// 统一的品牌渐变（用于大面积展示卡片/登录页等）
	const brandPrimary = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

	// 内容面板背景：暗色可使用中性渐变，亮色用容器色
	const contentPanel = isDark
		? 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)'
		: ant.bg.container;

	// 科目/词云色板：以语义色为主，补充部分品牌扩展色（集中管理）
	const subjectPalette = [
		'var(--ant-color-primary)',
		'var(--ant-color-success)',
		'var(--ant-color-warning)',
		'var(--ant-color-error)',
		'var(--ant-color-info)',
		'#13c2c2', // cyan 扩展
		'#eb2f96', // magenta 扩展
		'#a0d911', // lime 扩展
		'#2f54eb'  // geekblue 扩展
	];

	const wordCloudPalette = subjectPalette;

	// 灰阶刻度（浅->深），用于边框、背景过渡等
	const grayScaleLight = ['#ffffff','#fafafa','#f5f5f5','#f0f0f0','#e9e9e9','#d9d9d9','#bfbfbf','#8c8c8c','#595959','#434343','#262626','#1f1f1f','#000000'];
	const grayScaleDark = ['#000000','#141414','#1f1f1f','#262626','#303030','#424242','#595959','#8c8c8c','#bfbfbf','#d9d9d9','#e8e8e8','#f0f0f0','#ffffff'];

	// 图表用：单色序列（基于主色）
	const sequentialLight = ['#e6f4ff','#bae0ff','#91caff','#69b1ff','#4096ff','#1677ff'];
	const sequentialDark = ['#112545','#15395b','#1d4d7b','#2b6dac','#3e8ed0','#69b1ff'];

	// 图表用：发散色（负-中-正）
	const divergingLight = ['#ff7875','#ffd666', grayScaleLight[5], '#95de64','#5cdbd3'];
	const divergingDark = ['#ff7875','#ffd666', grayScaleDark[5], '#95de64','#5cdbd3'];

	// 色盲安全（Okabe–Ito）
	const colorBlindSafe = ['#000000','#E69F00','#56B4E9','#009E73','#F0E442','#0072B2','#D55E00','#CC79A7'];

	return {
		gradients: { brandPrimary, contentPanel },
		colors: {
			subjectPalette,
			wordCloudPalette,
			overlayMask: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.45)',
			glassBackground: isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
			scrollbarThumb: isDark ? '#555' : '#d4d4d4',
			scrollbarThumbHover: isDark ? 'var(--ant-color-text-tertiary)' : '#bfbfbf',
			scrollbarTrack: isDark ? 'var(--ant-color-bg-container)' : '#f8f9fa'
		},
		base: {
			white: '#ffffff',
			black: '#000000',
			transparent: 'transparent',
			gray: isDark ? grayScaleDark : grayScaleLight
		},
		text: {
			inverse: isDark ? '#000000' : '#ffffff',
			disabled: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.25)',
			placeholder: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.25)',
			link: ant.color.primary,
			linkHover: '#4096ff'
		},
		interaction: {
			focusRing: ant.color.primary,
			active: isDark ? '#2a2a2a' : '#e6f4ff',
			hover: isDark ? '#1f1f1f' : '#f5f5f5',
			selected: isDark ? '#111b26' : '#e6f7ff'
		},
		components: {
			button: { ghostText: isDark ? '#d6e4ff' : '#1d39c4' },
			tag: { defaultBg: isDark ? '#1f1f1f' : '#fafafa' },
			badge: { info: ant.color.info },
			card: { subtleBg: isDark ? '#141414' : '#ffffff' },
			table: { headerBg: isDark ? '#1f1f1f' : '#fafafa', border: isDark ? '#303030' : '#f0f0f0' },
			notification: { infoBg: isDark ? '#111b26' : '#e6f7ff' }
		},
		chart: {
			categorical: subjectPalette,
			sequential: isDark ? sequentialDark : sequentialLight,
			diverging: isDark ? divergingDark : divergingLight,
			colorBlindSafe,
			aux: {
				grid: isDark ? '#303030' : '#f0f0f0',
				axis: 'var(--ant-color-text-tertiary)',
				tooltipBg: 'var(--ant-color-bg-container)',
				referenceLine: isDark ? '#434343' : '#d9d9d9'
			}
		},
		a11y: { contrastTextNormal: 4.5, contrastTextLarge: 3 }
	};
};

// 将应用级变量注入为 CSS Variables，便于 CSS 与内联样式统一消费
export const applyAppCssVars = (mode: 'light' | 'dark') => {
	if (typeof document === 'undefined') return;
	const at = getAppTokens(mode);
	const isDark = mode === 'dark';
	const sem = isDark ? semanticTokensDark : semanticTokens;
	const root = document.documentElement;
	root.style.setProperty('--app-brand-gradient', at.gradients.brandPrimary);
	root.style.setProperty('--app-content-panel', at.gradients.contentPanel);
	root.style.setProperty('--app-overlay-mask', at.colors.overlayMask);
	root.style.setProperty('--app-glass-bg', at.colors.glassBackground);
	root.style.setProperty('--app-scrollbar-thumb', at.colors.scrollbarThumb);
	root.style.setProperty('--app-scrollbar-thumb-hover', at.colors.scrollbarThumbHover);
	root.style.setProperty('--app-scrollbar-track', at.colors.scrollbarTrack);
	// 新增常用的交互与图表辅助 CSS 变量，便于样式层复用
	root.style.setProperty('--app-focus-ring', at.interaction.focusRing);
	root.style.setProperty('--app-chart-grid', at.chart.aux.grid);
	root.style.setProperty('--app-chart-axis', at.chart.aux.axis);
	root.style.setProperty('--app-chart-tooltip-bg', at.chart.aux.tooltipBg);
  // 反色文本（用于深色背景上的可读文本）
  root.style.setProperty('--app-text-inverse', at.text.inverse);

	// 统一搜索框尺寸变量（桌面/移动）
	root.style.setProperty('--search-height-desktop', '44px');
	root.style.setProperty('--search-height-mobile', '40px');
	root.style.setProperty('--search-radius', '9999px');
	root.style.setProperty('--search-padding-h', '14px');

	// 统一暴露常用 AntD 语义色为 CSS Variables（与项目里使用的 --ant-color-* 命名对齐）
	root.style.setProperty('--ant-color-primary', sem.color.primary);
	root.style.setProperty('--ant-color-success', sem.color.success);
	root.style.setProperty('--ant-color-warning', sem.color.warning);
	root.style.setProperty('--ant-color-error', sem.color.error);
	root.style.setProperty('--ant-color-info', sem.color.info);
	root.style.setProperty('--ant-color-text', sem.text.primary);
	root.style.setProperty('--ant-color-text-secondary', sem.text.secondary);
	root.style.setProperty('--ant-color-text-tertiary', sem.text.tertiary);
	root.style.setProperty('--ant-color-bg-container', sem.bg.container);
	root.style.setProperty('--ant-color-bg-layout', sem.bg.layout);
	root.style.setProperty('--ant-color-border-secondary', sem.border.secondary);

	// 近似填充色系（用于 hover/fill 场景），避免项目中引用的 fill 变量为空
	const fill = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
	const fillSecondary = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
	const fillTertiary = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)';
	const fillQuaternary = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)';
	root.style.setProperty('--ant-color-fill', fill);
	root.style.setProperty('--ant-color-fill-secondary', fillSecondary);
	root.style.setProperty('--ant-color-fill-tertiary', fillTertiary);
	root.style.setProperty('--ant-color-fill-quaternary', fillQuaternary);
	// 主色背景（如 badge/选中态背景）
	root.style.setProperty('--ant-color-primary-bg', isDark ? '#111b26' : '#e6f7ff');

	// 统一卡片体验：圆角、阴影、背景、边框
	const cardRadius = '12px';
	const cardRadiusMobile = '10px';
	const cardShadow = isDark ? '0 1px 4px rgba(0,0,0,0.30)' : '0 1px 4px rgba(0,0,0,0.06)';
	const cardShadowHover = isDark ? '0 4px 12px rgba(0,0,0,0.40)' : '0 4px 12px rgba(0,0,0,0.12)';
	const cardBg = at.components.card.subtleBg;
	const cardBorderColor = at.components.table.border;
	root.style.setProperty('--app-card-radius', cardRadius);
	root.style.setProperty('--app-card-radius-mobile', cardRadiusMobile);
	root.style.setProperty('--app-card-shadow', cardShadow);
	root.style.setProperty('--app-card-shadow-hover', cardShadowHover);
	root.style.setProperty('--app-card-bg', cardBg);
	root.style.setProperty('--app-card-border-color', cardBorderColor);

  // 统一卡片默认内边距（桌面/移动）——全部由 spacing token 生成
  root.style.setProperty('--app-card-head-padding', 'var(--space-3) var(--space-4)');
  root.style.setProperty('--app-card-body-padding', 'var(--space-4)');
  // 移动端更紧凑：标题上下 var(--space-1)，左右 var(--space-2)；正文 var(--space-1)
  root.style.setProperty('--app-card-head-padding-mobile', 'var(--space-1) var(--space-2)');
  root.style.setProperty('--app-card-body-padding-mobile', 'var(--space-1)');

	// ========= Global Spacing Scale (8px 基线) =========
	root.style.setProperty('--space-0', '0px');
	root.style.setProperty('--space-1', '4px');
	root.style.setProperty('--space-2', '8px');
	root.style.setProperty('--space-3', '12px');
	root.style.setProperty('--space-4', '16px');
	root.style.setProperty('--space-5', '20px');
	root.style.setProperty('--space-6', '24px');
	root.style.setProperty('--space-7', '32px');
	root.style.setProperty('--space-8', '40px');

	// 页面级统一内边距与水平留白
  root.style.setProperty('--page-padding', 'var(--space-4)'); // 默认 16
  root.style.setProperty('--page-horizontal', 'var(--space-4)');
  root.style.setProperty('--page-vertical', 'var(--space-4)');
  // 移动端统一配置（单一来源）：更贴边但不贴屏
  // 仅使用容器内边距控制两侧留白，卡片不再额外加左右 margin
  root.style.setProperty('--page-horizontal-mobile', 'var(--space-1)'); // 4px
  root.style.setProperty('--page-vertical-mobile', 'var(--space-3)');   // 12px
  // 底部导航适配：为页面容器预留底部安全区
  // 统一再额外增加半厘米（~20px）高度，进一步避免与底部导航/系统手势区域重叠
  root.style.setProperty('--page-bottom-safe', 'calc(var(--space-7) + var(--space-5) + var(--space-5) + env(safe-area-inset-bottom))');

	// ========= Typography =========
	root.style.setProperty('--font-size-xs', '12px');
	root.style.setProperty('--font-size-sm', '13px');
	root.style.setProperty('--font-size-base', '14px');
	root.style.setProperty('--font-size-lg', '16px');
	root.style.setProperty('--font-size-xl', '18px');
	root.style.setProperty('--line-height-base', '1.5715');

  // ========= Dashboard Compact (Mobile) =========
  // 仅作变量入口，不在组件内写死尺寸
  root.style.setProperty('--dash-compact-gap', 'var(--space-2)');
  root.style.setProperty('--dash-compact-separator-opacity', '0.3');
  root.style.setProperty('--dash-compact-font', 'var(--font-size-sm)');
  root.style.setProperty('--dash-compact-number-font', 'var(--font-size-lg)');
  root.style.setProperty('--dash-compact-icon-size', '14px');
  root.style.setProperty('--dash-compact-row-padding', 'var(--space-2) 0');

  // ========= KPI Semantic Colors (map to AntD tokens) =========
  root.style.setProperty('--kpi-primary', 'var(--ant-color-primary)');
  root.style.setProperty('--kpi-success', 'var(--ant-color-success)');
  root.style.setProperty('--kpi-warning', 'var(--ant-color-warning)');
  root.style.setProperty('--kpi-error', 'var(--ant-color-error)');

	// ========= Radius =========
	root.style.setProperty('--radius-sm', '6px');
	root.style.setProperty('--radius-md', '8px');
	root.style.setProperty('--radius-lg', '12px');
};