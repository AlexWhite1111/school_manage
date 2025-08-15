// 统一的卡尔曼参数面板配置（布局、文本、范围等）

export const kalmanText = {
	titles: {
		quickPresets: '快速预设',
		baseInfo: '基础信息',
		core: '核心滤波参数',
		business: '业务参数',
	},
	labels: {
		processNoise: '过程噪声 (Q)',
		initialUncertainty: '初始不确定性 (P)',
		timeDecayFactor: '时间衰减因子 (λ)',
		minObservations: '最少观测次数',
		maxDaysBetween: '最大天数间隔',
	},
} as const;

export const kalmanLayout = {
	sectionGap: 'var(--space-6)',
	mobileSectionGap: 'var(--space-4)',
	topMargin: 'var(--space-3)',
	toolbarGap: 'var(--space-3)',
	rowGutter: [16, 16] as [number, number],
	innerGutter: [12, 12] as [number, number],
	labelMarginBottom: 8,
} as const;

export const colPairProps = { xs: 24, md: 12, lg: 12 } as const;
export const colSingleProps = { xs: 24, md: 24, lg: 24 } as const;

export const sliderConfigs = {
	processNoise: { min: 0.001, max: 1.0, step: 0.001, precision: 3, marks: { 0.001: '0.001', 0.1: '0.1', 0.5: '0.5', 1.0: '1.0' } },
	initialUncertainty: { min: 1.0, max: 100.0, step: 0.1, precision: 1, marks: { 1.0: '1.0', 10.0: '10.0', 50.0: '50.0', 100.0: '100.0' } },
	timeDecayFactor: { min: 0.001, max: 0.1, step: 0.001, precision: 3, marks: { 0.001: '0.001', 0.01: '0.01', 0.05: '0.05', 0.1: '0.1' } },
} as const;

// 统一按钮尺寸与层级
export const kalmanButtons = {
	headerSize: 'sm',           // 题头按钮尺寸（轻量化）
	resetHierarchy: 'tertiary', // 重置默认：轻量级
	saveHierarchy: 'secondary', // 保存配置：次级，保持轻量
	presetSize: 'sm',           // 预设方案按钮：小号
} as const;

// 题头标题宽度（为右侧按钮预留空间），避免遮挡
export const kalmanHeader = {
	titleMaxWidthOffsetPx: 160, // 根据按钮总宽度与边距预留
} as const;

// 成长标签管理面板配置（沿用统一规则）
export const tagPanelConfig = {
	headerButtonSize: 'sm',
	headerButtonHierarchy: 'secondary',
	groupTitleMargin: 8,
	listSize: 'small' as const,
	footerButtonSize: 'sm',
	footerButtonHierarchy: 'tertiary',
    positiveColor: 'var(--ant-color-success)',
    negativeColor: 'var(--ant-color-error)',
    metricsFontSize: 12,
    metricsGutter: 8,
} as const;

// 实验性功能开关
export const featureFlags = {
	showSystemMonitor: false,
} as const;

