特例清单（最多 10 处）

说明：以下为暂不替换为通用 tokens 的硬编码颜色，原因包括第三方图表库的渐变限制、品牌分级色需求或临时可视化强调。后续可在图表主题集中化后消除。

1. `frontend/src/features/student-log/StudentLogPage.tsx` 中线性渐变背景：`linear-gradient(135deg, #1890ff 0%, #722ed1 100%)`
2. `frontend/src/components/layout/AppLayout.tsx` 顶部装饰条：`linear-gradient(90deg, #1890ff, transparent)`
3. `frontend/src/components/unified-growth-report/charts/SubjectRadarChart.tsx` 多系列分类色数组中固定品牌色序列
4. `frontend/src/features/analytics/components/*` 多图表 demo 颜色列表示例（待统一到 chart theme）
5. `frontend/src/index.css` 自定义滚动条暗色轨道颜色 `#2a2a2a` 与拇指态 `#555/#666`（浏览器兼容保留）
6. `frontend/src/pages/ExamSubjectDetailPage.tsx` 勋章颜色 `#FFD700/#C0C0C0/#CD7F32`（金银铜特殊含义）
7. `frontend/src/components/dashboard/ExamStatsCard.tsx` 前三名背景 `#fa8c16`（榜单强调，待品牌确认）
8. `frontend/src/components/advanced/IntelligentWordCloud.tsx` HSL 动态色生成（运行时算法生成，不落固定 token）
9. `frontend/src/assets/styles/global.css` 少量历史遗留背景色（逐页迁移中）
10. `frontend/src/components/growth/KalmanTrendChart.tsx` 局部 stroke/fill 颜色对比度调优（算法阈值依赖）

