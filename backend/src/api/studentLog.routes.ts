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

/**
 * @route   POST /api/growth-logs
 * @desc    记录单条学生成长标签
 * @access  Private
 */
router.post('/growth-logs', async (req: Request, res: Response) => {
  try {
    const { enrollmentId, tagId } = req.body;

    // 输入验证
    if (!enrollmentId || !Number.isInteger(enrollmentId)) {
      return res.status(400).json({
        message: '班级注册ID不能为空且必须为整数'
      });
    }

    if (!tagId || !Number.isInteger(tagId)) {
      return res.status(400).json({
        message: '标签ID不能为空且必须为整数'
      });
    }

    const log = await StudentLogService.recordGrowthLog(enrollmentId, tagId);
    res.status(201).json(log);

  } catch (error) {
    console.error('记录成长标签路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '学生不在该班级中') {
        return res.status(404).json({
          message: '学生不在该班级中'
        });
      }
      
      if (error.message === '标签不存在') {
        return res.status(404).json({
          message: '标签不存在'
        });
      }
    }
    
    res.status(500).json({
      message: '记录成长标签失败'
    });
  }
});

/**
 * @route   GET /api/students/:publicId/report
 * @desc    获取指定学生的个人成长报告
 * @access  Private
 */
router.get('/students/:publicId/report', async (req: Request, res: Response) => {
  try {
    const publicId = req.params.publicId;
    const { startDate, endDate } = req.query;

    // 输入验证
    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({
        message: '无效的学生学号'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: '开始日期和结束日期不能为空'
      });
    }

    // 验证日期格式
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: '日期格式无效'
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: '开始日期不能晚于结束日期'
      });
    }

    // 设置结束日期到当天的最后一刻
    end.setHours(23, 59, 59, 999);

    const report = await StudentLogService.getStudentGrowthReportByPublicId(publicId, start, end);
    res.status(200).json(report);

  } catch (error) {
    console.error('获取成长报告路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '学生不存在') {
        return res.status(404).json({
          message: '学生不存在'
        });
      }
      
      if (error.message === '学生未加入任何班级') {
        return res.status(400).json({
          message: '学生未加入任何班级'
        });
      }
    }
    
    res.status(500).json({
      message: '获取成长报告失败'
    });
  }
});

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