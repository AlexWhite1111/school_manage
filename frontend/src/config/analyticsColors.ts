// 客户转换阶段颜色统一配置
// 说明：按阶段语义映射颜色，避免仅按索引取色导致语义混乱

// 统一的客户阶段/状态颜色（专业配色：Ant Design 主色系 6 档明度）
// 说明：均选用各色系 6 阶（可读性与识别度最佳），保证在浅色背景上有良好对比
export const FUNNEL_STAGE_COLOR: Record<string, string> = {
	POTENTIAL: '#8c8c8c',   // neutral-6：潜在（中性）
	INITIAL_CONTACT: '#2f54eb', // geekblue-6：初步沟通（建立联系）
	INTERESTED: '#13c2c2',  // cyan-6：产生兴趣（冷转暖）
	TRIAL_CLASS: '#faad14', // gold-6：试课（提醒/关注）
	ENROLLED: '#52c41a',    // green-6：已报名（成功）
	LOST: '#f5222d',        // red-6：流失（风险）
};

export const getFunnelStageColor = (stage: string): string => {
	return FUNNEL_STAGE_COLOR[stage] || 'var(--ant-color-primary)';
};

// 统一的客户阶段中文标签
export const CUSTOMER_STATUS_LABELS_CN: Record<string, string> = {
	POTENTIAL: '潜在客户',
	INITIAL_CONTACT: '初步沟通',
	INTERESTED: '意向客户',
	TRIAL_CLASS: '试课',
	ENROLLED: '已报名',
	LOST: '流失客户',
};

// 元信息聚合：label + color，便于界面直接使用
export const CUSTOMER_STATUS_META: Record<string, { label: string; color: string }> = Object.keys(FUNNEL_STAGE_COLOR).reduce((acc, key) => {
	acc[key] = { label: CUSTOMER_STATUS_LABELS_CN[key] || key, color: FUNNEL_STAGE_COLOR[key] };
	return acc;
}, {} as Record<string, { label: string; color: string }>);

export const getCustomerStatusLabel = (status: string): string => CUSTOMER_STATUS_META[status]?.label || status;
export const getCustomerStatusColor = (status: string): string => CUSTOMER_STATUS_META[status]?.color || 'var(--ant-color-primary)';

