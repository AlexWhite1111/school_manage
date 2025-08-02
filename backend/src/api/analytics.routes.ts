// src/api/analytics.routes.ts
import { Router, Request, Response } from 'express';
import * as AnalyticsService from '../services/analytics.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// 保护此模块下的所有路由
router.use(authMiddleware);

/**
 * @route   GET /api/analytics/customer-funnel
 * @desc    获取客户漏斗分析数据
 * @access  Private
 */
router.get('/customer-funnel', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, sourceChannel, customerTags } = req.query;

    // 验证必需的日期参数
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

    const filters = {
      startDate: start,
      endDate: end,
      sourceChannel: sourceChannel as string,
      customerTags: customerTags ? (customerTags as string).split(',').map(Number) : undefined
    };

    const funnelData = await AnalyticsService.getCustomerFunnelAnalysis(filters);
    res.status(200).json(funnelData);

  } catch (error) {
    console.error('获取客户漏斗分析数据路由错误:', error);
    res.status(500).json({
      message: '获取客户漏斗分析数据失败'
    });
  }
});

/**
 * @route   GET /api/analytics/customer-funnel-comparison
 * @desc    获取客户漏斗分析数据（包含时间对比）
 * @access  Private
 */
router.get('/customer-funnel-comparison', async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      sourceChannel, 
      customerTags,
      'compareWith.type': compareType,
      'compareWith.startDate': compareStartDate,
      'compareWith.endDate': compareEndDate
    } = req.query;

    // 验证主时间段
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: '开始日期和结束日期不能为空'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: '日期格式无效'
      });
    }

    const currentFilters = {
      startDate: start,
      endDate: end,
      sourceChannel: sourceChannel as string,
      customerTags: customerTags ? (customerTags as string).split(',').map(Number) : undefined
    };

    let comparisonFilters = undefined;

    // 如果提供了对比参数，验证并构建对比筛选器
    if (compareType && compareStartDate && compareEndDate) {
      const compareStart = new Date(compareStartDate as string);
      const compareEnd = new Date(compareEndDate as string);

      if (isNaN(compareStart.getTime()) || isNaN(compareEnd.getTime())) {
        return res.status(400).json({
          message: '对比日期格式无效'
        });
      }

      comparisonFilters = {
        startDate: compareStart,
        endDate: compareEnd,
        sourceChannel: sourceChannel as string,
        customerTags: customerTags ? (customerTags as string).split(',').map(Number) : undefined
      };
    }

    const comparisonData = await AnalyticsService.getCustomerFunnelComparison(
      currentFilters, 
      comparisonFilters, 
      compareType as 'previous_period' | 'same_period_last_year'
    );

    res.status(200).json(comparisonData);

  } catch (error) {
    console.error('获取客户漏斗对比分析数据路由错误:', error);
    res.status(500).json({
      message: '获取客户漏斗对比分析数据失败'
    });
  }
});

/**
 * @route   GET /api/analytics/source-channels
 * @desc    获取来源渠道分析数据
 * @access  Private
 */
router.get('/source-channels', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, customerTags } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: '开始日期和结束日期不能为空'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: '日期格式无效'
      });
    }

    const filters = {
      startDate: start,
      endDate: end,
      customerTags: customerTags ? (customerTags as string).split(',').map(Number) : undefined
    };

    const channelData = await AnalyticsService.getSourceChannelAnalysis(filters);
    res.status(200).json(channelData);

  } catch (error) {
    console.error('获取来源渠道分析数据路由错误:', error);
    res.status(500).json({
      message: '获取来源渠道分析数据失败'
    });
  }
});

/**
 * @route   GET /api/analytics/customer-key-metrics
 * @desc    获取客户分析核心指标
 * @access  Private
 */
router.get('/customer-key-metrics', async (req: Request, res: Response) => {
  try {
    const { 
      startDate, 
      endDate, 
      sourceChannel, 
      customerTags,
      'compareWith.type': compareType,
      'compareWith.startDate': compareStartDate,
      'compareWith.endDate': compareEndDate
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: '开始日期和结束日期不能为空'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: '日期格式无效'
      });
    }

    const currentFilters = {
      startDate: start,
      endDate: end,
      sourceChannel: sourceChannel as string,
      customerTags: customerTags ? (customerTags as string).split(',').map(Number) : undefined
    };

    let comparisonFilters = undefined;
    if (compareType && compareStartDate && compareEndDate) {
      const compareStart = new Date(compareStartDate as string);
      const compareEnd = new Date(compareEndDate as string);

      if (!isNaN(compareStart.getTime()) && !isNaN(compareEnd.getTime())) {
        comparisonFilters = {
          startDate: compareStart,
          endDate: compareEnd,
          sourceChannel: sourceChannel as string,
          customerTags: customerTags ? (customerTags as string).split(',').map(Number) : undefined
        };
      }
    }

    const keyMetrics = await AnalyticsService.getCustomerKeyMetrics(currentFilters, comparisonFilters);
    res.status(200).json(keyMetrics);

  } catch (error) {
    console.error('获取客户核心指标路由错误:', error);
    res.status(500).json({
      message: '获取客户核心指标失败'
    });
  }
});

/**
 * @route   GET /api/analytics/student-growth/:publicId
 * @desc    获取学生成长分析数据
 * @access  Private
 */
router.get('/student-growth/:publicId', async (req: Request, res: Response) => {
  try {
    const publicId = req.params.publicId;
    const { startDate, endDate, classId, gradeLevel } = req.query;

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

    const filters = {
      startDate: start,
      endDate: end,
      classId: classId ? parseInt(classId as string, 10) : undefined,
      gradeLevel: gradeLevel as string
    };

    const growthData = await AnalyticsService.getStudentGrowthAnalysisByPublicId(publicId, filters);
    res.status(200).json(growthData);

  } catch (error) {
    console.error('获取学生成长分析数据路由错误:', error);
    
    if (error instanceof Error && error.message === '学生不存在') {
      return res.status(404).json({
        message: '学生不存在'
      });
    }
    
    res.status(500).json({
      message: '获取学生成长分析数据失败'
    });
  }
});

/**
 * @route   GET /api/analytics/students
 * @desc    获取所有可用的学生列表（用于分析页面的学生选择器）
 * @access  Private
 */
router.get('/students', async (req: Request, res: Response) => {
  try {
    const students = await AnalyticsService.getStudentsForAnalytics();
    res.status(200).json(students);

  } catch (error) {
    console.error('获取分析用学生列表路由错误:', error);
    res.status(500).json({
      message: '获取分析用学生列表失败'
    });
  }
});

export default router; 