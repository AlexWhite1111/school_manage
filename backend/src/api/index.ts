// src/api/index.ts
// 该文件作为主路由文件，聚合了应用中所有模块的子路由。

import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import customerRoutes from './customer.routes';
import tagRoutes from './tag.routes';
import classRoutes from './class.routes'; // 引入班级路由
import studentLogRoutes from './studentLog.routes'; // 引入学生日志路由
import financeRoutes from './finance.routes'; // 引入财务路由
import dashboardRoutes from './dashboard.routes'; // 引入仪表盘路由
import globalRoutes from './global.routes'; // 引入全局路由
import analyticsRoutes from './analytics.routes'; // 引入数据分析路由
import excelRoutes from './excel.routes'; // 引入Excel导入导出路由
import examRoutes from './exam.routes'; // 引入考试管理路由
import growthRoutes from './growth.routes'; // 引入Growth成长量化路由
// ... import other route modules as they are created

const router = Router();

// 挂载认证模块的路由
router.use('/auth', authRoutes);

// 挂载用户模块的路由
router.use('/users', userRoutes);

// 挂载客户模块的路由
router.use('/customers', customerRoutes);

// 挂载标签模块的路由
router.use('/tags', tagRoutes);

// 挂载班级模块的路由
router.use('/classes', classRoutes);

// 挂载学生日志模块的路由
router.use('/', studentLogRoutes); // 保持与前端兼容的路径（/attendance-records 等）

// 挂载财务模块的路由
router.use('/finance', financeRoutes);

// 挂载仪表盘模块的路由
router.use('/dashboard', dashboardRoutes);

// 挂载全局模块的路由（保持原有路径兼容由 global.routes 内部定义具体 path）
router.use('/', globalRoutes);

// 挂载数据分析模块的路由
router.use('/analytics', analyticsRoutes);

// 挂载Excel导入导出模块的路由
router.use('/excel', excelRoutes);

// 挂载考试管理模块的路由
router.use('/exams', examRoutes);

// 挂载Growth成长量化模块的路由
router.use('/growth', growthRoutes);

// ... mount other routers here

export default router; 