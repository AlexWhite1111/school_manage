# 文档索引（按主题归类）

> 精简导航，指向原文档；每条仅保留 1 行要点。

## 一、系统概览
- [GROWTH_SYSTEM_COMPLETION_REPORT.md](../GROWTH_SYSTEM_COMPLETION_REPORT.md)：Growth 系统完成状态与功能清单
- [FEATURE_SUMMARY.md](../FEATURE_SUMMARY.md)：最新统一规则与关键功能变更
- [INTEGRATION_STATUS_REPORT.md](../INTEGRATION_STATUS_REPORT.md)：集成状态与增强现有页面方案
- [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)：实现概览（页面、路由、组件）

## 二、部署与环境
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)：全平台部署详解（Linux/Windows/Docker/PM2）
- [NETWORK_SETUP.md](../NETWORK_SETUP.md)：本地/内网/外网访问与网络配置
- [DATABASE_SETUP.md](../DATABASE_SETUP.md)：数据库初始化与重置方案
- [env.example](../env.example)：环境变量示例
- [docker-compose.yml](../docker-compose.yml)、[ecosystem.config.js](../ecosystem.config.js)：容器与进程管理

## 三、成长系统与算法
- [KALMAN_IMPLEMENTATION_REPORT.md](../KALMAN_IMPLEMENTATION_REPORT.md)：卡尔曼滤波成长分系统实施细节
- [Growth配置ID管理问题分析报告.md](../Growth配置ID管理问题分析报告.md)：配置 ID 管理不一致问题与建议
- [PublicId_Unification_Progress_Report.md](../PublicId_Unification_Progress_Report.md)：publicId 全局统一进展
- [frontend/GrowthSystemAPIDesign.md](../frontend/GrowthSystemAPIDesign.md)：成长系统 API 设计
- [frontend/GrowthSystemArchitecture.md](../frontend/GrowthSystemArchitecture.md)：前端架构
- [frontend/StudentGrowthRatingSystem.md](../frontend/StudentGrowthRatingSystem.md)：评分/评级系统设计
- [frontend/KalmanFilterConfigurationGuide.md](../frontend/KalmanFilterConfigurationGuide.md)：卡尔曼配置指南
- [frontend/kalmanalgorithm.md](../frontend/kalmanalgorithm.md)：卡尔曼算法说明
- [backend/GROWTH_FRAMEWORK_README.md](../backend/GROWTH_FRAMEWORK_README.md)：后端 Growth 框架说明

## 四、前端设计与使用
- [frontend/GROWTH_FRONTEND_REFACTORING_PLAN.md](../frontend/GROWTH_FRONTEND_REFACTORING_PLAN.md)：前端重构计划
- [frontend/GROWTH_FRONTEND_API_USAGE.md](../frontend/GROWTH_FRONTEND_API_USAGE.md)：前端 API 调用与示例
- [frontend/FrontendDesign.md](../frontend/FrontendDesign.md)、[frontend/ArchitectureDesign.md](../frontend/ArchitectureDesign.md)：设计与架构
- [frontend/Needs.md](../frontend/Needs.md)、[frontend/TechNeed.md](../frontend/TechNeed.md)：需求与技术要点
- 设计文档（Design/）：[学生报告页面重新设计方案](../Design/学生报告页面重新设计方案.md)、[UI_UX优化问题汇报](../Design/UI_UX优化问题汇报.md)、[全面功能缺失调查报告](../Design/全面功能缺失调查报告.md) 等

## 五、分析与图表（Recharts/统计）
- [ANALYTICS_RECHARTS_MIGRATION_REPORT.md](../ANALYTICS_RECHARTS_MIGRATION_REPORT.md)：图表库统一迁移到 Recharts
- [EXAM_CALCULATION_REFACTOR_REPORT.md](../EXAM_CALCULATION_REFACTOR_REPORT.md)：考试计算与统计重构
- [EXCELLENT_LINE_REFACTOR_REPORT.md](../EXCELLENT_LINE_REFACTOR_REPORT.md)：优秀线自适应方案
- [SCORE_DISTRIBUTION_FIX_SUMMARY.md](../SCORE_DISTRIBUTION_FIX_SUMMARY.md) / [SCORE_DISPLAY_ISSUE_REPORT.md](../SCORE_DISPLAY_ISSUE_REPORT.md)：成绩分布图修复与问题
- [EXAM_LIST_EXPAND_ANALYSIS_REPORT.md](../EXAM_LIST_EXPAND_ANALYSIS_REPORT.md)：考试列表展开交互与数据加载
- [WORDCLOUD_IMPLEMENTATION.md](../WORDCLOUD_IMPLEMENTATION.md)：词云实现与数据链路

## 六、缺陷与修复合辑（按严重级别与主题）
- P 级修复：
  - [P0问题修复完成报告.md](../P0问题修复完成报告.md)｜[P1问题修复完成报告.md](../P1问题修复完成报告.md)｜[P2问题修复完成报告.md](../P2问题修复完成报告.md)
- 学生成长页面链路：
  - [学生个人成长页面调查报告.md](../学生个人成长页面调查报告.md)
  - [学生个人成长页面全面修复总结报告.md](../学生个人成长页面全面修复总结报告.md)
- 时间筛选/日期功能：
  - [时间选择器专项深入调查报告.md](../时间选择器专项深入调查报告.md)
  - [日期选择器功能实现报告.md](../日期选择器功能实现报告.md)
- 模拟/硬编码数据：
  - [模拟数据清理完成报告.md](../模拟数据清理完成报告.md)
  - [项目模拟数据问题全面审查报告.md](../项目模拟数据问题全面审查报告.md)
  - [硬编码数据问题根源分析报告.md](../硬编码数据问题根源分析报告.md)
- 其他修复：
  - [API_FIXES_PROGRESS_REPORT.md](../API_FIXES_PROGRESS_REPORT.md)
  - [NAVIGATION_FIX_REPORT.md](../NAVIGATION_FIX_REPORT.md)
  - [TESTING_REPORT.md](../TESTING_REPORT.md)
  - [CLEANUP_SUMMARY.md](../CLEANUP_SUMMARY.md)

## 七、设计与需求（更高层）
- Design/ 目录下的需求/方案类文档（UI/交互/信息架构）
- 前端根目录下：需求（Needs/TechNeed）、架构（Architecture/FrontendDesign）、评分体系（StudentGrowthRatingSystem）

---

维护提示：新增文档请放入对应分类，并在此处追加一行“文件链接 + 10~30 字摘要”。