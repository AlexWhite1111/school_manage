// src/api/dashboard.routes.ts
import { Router, Request, Response } from 'express';
import * as DashboardService from '../services/dashboard.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// 保护此模块下的所有路由
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard/summary
 * @desc    获取核心仪表盘数据
 * @access  Private
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await DashboardService.getDashboardSummary();
    res.status(200).json(summary);
  } catch (error) {
    console.error('获取仪表盘摘要路由错误:', error);
    res.status(500).json({
      message: '获取仪表盘摘要失败'
    });
  }
});

export default router; 