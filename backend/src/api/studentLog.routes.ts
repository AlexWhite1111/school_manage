// src/api/studentLog.routes.ts
import { Router, Request, Response } from 'express';
import * as StudentLogService from '../services/studentLog.service';
import { AttendanceStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware); // 保护所有学生日志路由

/**
 * @route   POST /api/attendance-records
 * @desc    记录单次学生考勤
 * @access  Private
 */
router.post('/attendance-records', async (req: Request, res: Response) => {
  try {
    const { enrollmentId, status, timeSlot } = req.body;

    // 输入验证
    if (!enrollmentId || !Number.isInteger(enrollmentId)) {
      return res.status(400).json({
        message: '班级注册ID不能为空且必须为整数'
      });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        message: '考勤状态不能为空'
      });
    }

    // 验证考勤状态是否有效
    const validStatuses = ['PRESENT', 'LATE', 'ABSENT', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: '无效的考勤状态'
      });
    }

    // 新增：验证 timeSlot
    if (!timeSlot || !['AM', 'PM'].includes(timeSlot)) {
      return res.status(400).json({
        message: '无效的时间段，必须是 "AM" 或 "PM"'
      });
    }

    const record = await StudentLogService.recordAttendance(enrollmentId, status as AttendanceStatus, timeSlot);
    res.status(201).json(record);

  } catch (error) {
    console.error('记录考勤路由错误:', error);
    
    if (error instanceof Error && error.message === '学生不在该班级中') {
      return res.status(404).json({
        message: '学生不在该班级中'
      });
    }
    
    res.status(500).json({
      message: '记录考勤失败'
    });
  }
});

// ================================
// 已废弃的成长标签功能 - 已迁移到Growth模块
// ================================
// 注意：以下端点已废弃，请使用新的Growth API：
// POST /api/growth-logs - 记录成长标签
// GET /api/students/:publicId/report - 获取成长报告
// 
// 新的API端点：
// POST /api/growth/logs - 记录成长标签
// GET /api/growth/students/by-public-id/:publicId/summary - 获取成长概况

/**
 * @route   GET /api/students/growth-stats?ids=1,2,3
 * @desc    批量获取学生成长统计（列表页）
 * @access  Private
 */
router.get('/students/growth-stats', async (req: Request, res: Response) => {
  try {
    const idsParam = req.query.ids as string | undefined;
    if (!idsParam) {
      return res.status(400).json({ message: '缺少 ids 查询参数' });
    }
    const idStrings = idsParam.split(',').filter(Boolean);
    const studentIds = idStrings.map(id => Number(id)).filter(id => !isNaN(id));
    if (studentIds.length === 0) {
      return res.status(400).json({ message: 'ids 参数无效' });
    }

    const stats = await StudentLogService.getStudentsGrowthStats(studentIds);
    res.status(200).json(stats);
  } catch (error) {
    console.error('获取学生成长统计失败:', error);
    res.status(500).json({ message: '获取学生成长统计失败' });
  }
});

export default router; 