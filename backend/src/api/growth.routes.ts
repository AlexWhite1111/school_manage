// src/api/growth.routes.ts
import { Router, Request, Response } from 'express';
import * as GrowthService from '../services/growth.service';
import * as KalmanService from '../services/kalman.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  validateGrowthTagCreate,
  validateGrowthTagUpdate,
  validateGrowthLogCreate,
  validateGrowthLogBatch,
  validateGrowthConfigCreate,
  validateGrowthConfigUpdate
} from '../middleware/validation.middleware';

const router = Router();

// 保护所有Growth路由
router.use(authMiddleware);

// ================================
// 统一响应格式和错误处理辅助函数
// ================================

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

const sendSuccess = <T>(res: Response, data: T): void => {
  res.status(200).json({
    success: true,
    data
  } as ApiResponse<T>);
};

const sendError = (res: Response, status: number, code: string, message: string): void => {
  res.status(status).json({
    success: false,
    error: { code, message }
  } as ApiResponse);
};

const handleServiceError = (res: Response, error: unknown, operation: string): void => {
  console.error(`${operation}失败:`, error);
  
  if (error instanceof Error) {
    switch (error.message) {
      case '学生不存在':
        return sendError(res, 404, 'STUDENT_NOT_FOUND', '学生不存在');
      case '班级注册记录不存在':
        return sendError(res, 404, 'ENROLLMENT_NOT_FOUND', '班级注册记录不存在');
      case '学生未注册任何班级':
        return sendError(res, 400, 'NO_ENROLLMENT', '学生未注册任何班级');
      case '标签不存在':
        return sendError(res, 404, 'TAG_NOT_FOUND', '标签不存在');
      case '配置不存在':
        return sendError(res, 404, 'CONFIG_NOT_FOUND', '配置不存在');
      default:
        // 检查是否是参数验证错误
        if (error.message.includes('必须在') || error.message.includes('参数')) {
          return sendError(res, 400, 'VALIDATION_ERROR', error.message);
        }
        break;
    }
  }
  
  sendError(res, 500, 'INTERNAL_ERROR', `${operation}失败`);
};

// ================================
// 智能路由 - 自动识别ID类型
// ================================

/**
 * @route   GET /api/growth/students/by-public-id/:publicId/summary (DEPRECATED - use /api/growth/students/by-public-id/:publicId/summary)
 * @desc    获取学生成长概况 - 仅支持publicId
 * @access  Private (所有已认证用户)  
 * @params  {string} publicId - 学生公开ID
 */
router.get('/students/:identifier/summary', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    
    // 只支持publicId，不再支持数字ID
    if (/^\d+$/.test(identifier)) {
      return sendError(res, 400, 'INVALID_IDENTIFIER', '不再支持数字ID，请使用publicId');
    }

    const summary = await GrowthService.getStudentGrowthSummaryByPublicId(identifier);
    sendSuccess(res, summary);

  } catch (error) {
    handleServiceError(res, error, '获取学生成长概况');
  }
});

// 🗺️ Legacy route alias: /students/by-public-id/:publicId/summary
router.get('/students/by-public-id/:publicId/summary', async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const summary = await GrowthService.getStudentGrowthSummaryByPublicId(publicId);
    sendSuccess(res, summary);
  } catch (error) {
    handleServiceError(res, error, '获取学生成长概况');
  }
});

// ================================
// Growth标签管理 API
// ================================

/**
 * @route   GET /api/growth/tags
 * @desc    获取Growth标签列表，支持筛选和搜索
 * @access  Private (所有已认证用户)
 * @params  {string} [sentiment] - 筛选正面/负面标签 (POSITIVE|NEGATIVE)
 * @params  {string} [search] - 搜索标签名称，最少2个字符
 * @params  {boolean} [isActive] - 筛选是否启用的标签，默认true
 * @params  {string} [orderBy] - 排序字段 (usageCount|createdAt|text)，默认usageCount
 * @params  {string} [order] - 排序方向 (asc|desc)，默认desc
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const filters = {
      sentiment: req.query.sentiment as 'POSITIVE' | 'NEGATIVE' | undefined,
      search: req.query.search as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : true,
      orderBy: (req.query.orderBy as 'usageCount' | 'createdAt' | 'text') || 'usageCount',
      order: (req.query.order as 'asc' | 'desc') || 'desc'
    };

    const tags = await GrowthService.getGrowthTags(filters);
    
    sendSuccess(res, tags);

  } catch (error) {
    handleServiceError(res, error, '获取Growth标签列表');
  }
});

/**
 * @route   POST /api/growth/tags
 * @desc    创建新的Growth标签
 * @access  Private (SUPER_ADMIN, MANAGER)
 * @body    {string} text - 标签名称，2-20字符，不能重复
 * @body    {string} sentiment - 情感极性 (POSITIVE|NEGATIVE)
 * @body    {number} defaultWeight - 默认权重1-10，整数
 * @body    {string} [description] - 标签描述，最多100字符
 */
router.post('/tags', validateGrowthTagCreate, async (req: Request, res: Response) => {
  try {
    const { text, sentiment, defaultWeight, description } = req.body;
    
    const newTag = await GrowthService.createGrowthTag({
      text,
      sentiment,
      defaultWeight,
      description
    });

    sendSuccess(res, newTag);

  } catch (error) {
    handleServiceError(res, error, '创建Growth标签');
  }
});

/**
 * @route   PUT /api/growth/tags/:tagId
 * @desc    更新现有Growth标签信息
 * @access  Private (SUPER_ADMIN, MANAGER)
 * @params  {number} tagId - 标签ID
 * @body    {string} [text] - 标签名称
 * @body    {string} [sentiment] - 标签情感极性 (POSITIVE/NEGATIVE)
 * @body    {number} [defaultWeight] - 默认权重1-10
 * @body    {boolean} [isActive] - 是否启用
 */
router.put('/tags/:tagId', validateGrowthTagUpdate, async (req: Request, res: Response) => {
  try {
    const tagId = parseInt(req.params.tagId);
    const updateData = req.body;

    if (isNaN(tagId)) {
      return sendError(res, 400, 'INVALID_TAG_ID', '无效的标签ID');
    }

    const updatedTag = await GrowthService.updateGrowthTag(tagId, updateData);

    sendSuccess(res, updatedTag);

  } catch (error) {
    handleServiceError(res, error, '更新Growth标签');
  }
});

/**
 * @route   DELETE /api/growth/tags/:tagId
 * @desc    软删除Growth标签（设置deletedAt字段）
 * @access  Private (SUPER_ADMIN)
 * @params  {number} tagId - 标签ID
 */
router.delete('/tags/:tagId', async (req: Request, res: Response) => {
  try {
    const tagId = parseInt(req.params.tagId);

    if (isNaN(tagId)) {
      return sendError(res, 400, 'INVALID_TAG_ID', '无效的标签ID');
    }

    await GrowthService.deleteGrowthTag(tagId);

    sendSuccess(res, { message: '标签删除成功' });

  } catch (error) {
    handleServiceError(res, error, '删除Growth标签');
  }
});

// ================================
// 成长日志记录 API
// ================================

/**
 * @route   POST /api/growth/logs
 * @desc    快速记录成长日志 - 5秒快速打标签的核心API
 * @access  Private (SUPER_ADMIN, MANAGER, TEACHER)
 * @body    {number} enrollmentId - 学生班级注册ID，必填
 * @body    {number} tagId - 标签ID，必须是isGrowthTag=true的标签
 * @body    {number} [weight] - 可选权重1-10，不填则使用标签默认权重
 * @body    {string} [context] - 可选上下文说明，最多50字符
 */
router.post('/logs', validateGrowthLogCreate, async (req: Request, res: Response) => {
  try {
    const { enrollmentId, tagId, weight, context } = req.body;

    const newLog = await GrowthService.recordGrowthLog({
      enrollmentId,
      tagId,
      weight,
      context
    });

    sendSuccess(res, newLog);

  } catch (error) {
    handleServiceError(res, error, '记录成长日志');
  }
});

/**
 * @route   POST /api/growth/logs/batch
 * @desc    批量记录成长日志，提升操作效率
 * @access  Private (SUPER_ADMIN, MANAGER, TEACHER)
 * @body    {object[]} records - 记录数组，最多20条
 * @body    {number} records[].enrollmentId - 学生班级注册ID
 * @body    {number} records[].tagId - 标签ID
 * @body    {number} [records[].weight] - 可选权重1-10
 */
router.post('/logs/batch', validateGrowthLogBatch, async (req: Request, res: Response) => {
  try {
    const { records } = req.body;

    const results = await GrowthService.batchRecordGrowthLogs(records);

    sendSuccess(res, results);

  } catch (error) {
    handleServiceError(res, error, '批量记录成长日志');
  }
});

/**
 * @route   GET /api/growth/logs
 * @desc    查询成长日志记录，支持多种筛选条件
 * @access  Private (SUPER_ADMIN, MANAGER, TEACHER)
 * @params  {number} [enrollmentId] - 筛选特定学生
 * @params  {number} [tagId] - 筛选特定标签
 * @params  {string} [startDate] - 开始日期 YYYY-MM-DD
 * @params  {string} [endDate] - 结束日期 YYYY-MM-DD
 * @params  {string} [sentiment] - 筛选正面/负面记录
 * @params  {number} [classId] - 筛选特定班级
 * @params  {number} [minWeight] - 最小权重筛选 1-10
 * @params  {number} [maxWeight] - 最大权重筛选 1-10
 * @params  {number} [page] - 分页页码，默认1，最大1000
 * @params  {number} [limit] - 每页条数，默认20，最大100
 * @params  {string} [orderBy] - 排序字段 (createdAt|weight)，默认createdAt
 * @params  {string} [order] - 排序方向 (asc|desc)，默认desc
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const filters = {
      enrollmentId: req.query.enrollmentId ? parseInt(req.query.enrollmentId as string) : undefined,
      tagId: req.query.tagId ? parseInt(req.query.tagId as string) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      sentiment: req.query.sentiment as 'POSITIVE' | 'NEGATIVE' | undefined,
      classId: req.query.classId ? parseInt(req.query.classId as string) : undefined,
      minWeight: req.query.minWeight ? parseInt(req.query.minWeight as string) : undefined,
      maxWeight: req.query.maxWeight ? parseInt(req.query.maxWeight as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: Math.min(req.query.limit ? parseInt(req.query.limit as string) : 20, 100),
      orderBy: (req.query.orderBy as 'createdAt' | 'weight') || 'createdAt',
      order: (req.query.order as 'asc' | 'desc') || 'desc'
    };

    const result = await GrowthService.getGrowthLogs(filters);

    sendSuccess(res, result);

  } catch (error) {
    handleServiceError(res, error, '查询成长日志');
  }
});

// ================================
// 学生成长状态查询 API
// ================================

// ✅ REMOVED: /students/:enrollmentId/summary - Use /students/:identifier/summary instead

// ✅ REMOVED: /students/by-public-id/:publicId/summary - Use /students/:identifier/summary instead

// ✅ REMOVED: /students/:enrollmentId/chart - Use /students/:identifier/chart instead

// ================================
// 学生个人成长查看 API
// ================================

/**
 * @route   GET /api/growth/my-progress
 * @desc    学生查看自己的成长报告
 * @access  Private (STUDENT) - 只能查看自己的数据
 * @params  {string} [period] - 查看周期 (week|month|semester|year)，默认month
 */
router.get('/my-progress', async (req: Request, res: Response) => {
  try {
    // TODO: 从认证中间件获取当前学生publicId
    const publicId = (req as any).user?.publicId; // 假设认证中间件会设置user信息
    
    if (!publicId) {
      return sendError(res, 401, 'UNAUTHORIZED', '未授权访问');
    }

    const period = req.query.period as 'week' | 'month' | 'semester' | 'year' || 'month';

    const progress = await GrowthService.getStudentPersonalProgressByPublicId(publicId, period);

    sendSuccess(res, progress);

  } catch (error) {
    handleServiceError(res, error, '获取个人成长报告');
  }
});

/**
 * @route   GET /api/growth/my-badges
 * @desc    学生查看自己的成就徽章
 * @access  Private (STUDENT) - 只能查看自己的数据
 */
router.get('/my-badges', async (req: Request, res: Response) => {
  try {
    // TODO: 从认证中间件获取当前学生publicId
    const publicId = (req as any).user?.publicId;
    
    if (!publicId) {
      return sendError(res, 401, 'UNAUTHORIZED', '未授权访问');
    }

    const badges = await GrowthService.getStudentBadgesByPublicId(publicId);

    sendSuccess(res, badges);

  } catch (error) {
    handleServiceError(res, error, '获取个人成就徽章');
  }
});

// ================================
// 系统配置管理 API
// ================================

/**
 * @route   GET /api/growth/config
 * @desc    获取当前激活的卡尔曼滤波器配置参数
 * @access  Private (SUPER_ADMIN, MANAGER)
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await GrowthService.getActiveGrowthConfig();

    sendSuccess(res, config);

  } catch (error) {
    handleServiceError(res, error, '获取Growth配置');
  }
});

/**
 * @route   PUT /api/growth/config/:configId
 * @desc    更新卡尔曼滤波器配置参数
 * @access  Private (SUPER_ADMIN)
 * @params  {string} configId - 配置ID
 * @body    {string} [name] - 配置名称
 * @body    {string} [description] - 配置描述
 * @body    {number} [processNoise] - Q参数 0.001 - 1.0
 * @body    {number} [initialUncertainty] - P初始值 1.0 - 100.0
 * @body    {number} [timeDecayFactor] - λ参数 0.001 - 0.1
 * @body    {number} [minObservations] - 最少观测次数 1 - 10
 * @body    {number} [maxDaysBetween] - 最大天数间隔 7 - 90
 */
router.put('/config/:configId', validateGrowthConfigUpdate, async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const updateData = req.body;

    const updatedConfig = await GrowthService.updateGrowthConfig(configId, updateData);

    sendSuccess(res, updatedConfig);

  } catch (error) {
    handleServiceError(res, error, '更新Growth配置');
  }
});

/**
 * @route   PUT /api/growth/config/active
 * @desc    更新当前激活配置（无需传ID）
 * @access  Private (SUPER_ADMIN)
 */
router.put('/config/active', validateGrowthConfigUpdate, async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    // 复用服务层逻辑：传入 'default' 会自动映射到当前激活配置ID
    const updatedConfig = await GrowthService.updateGrowthConfig('default', updateData);
    sendSuccess(res, updatedConfig);
  } catch (error) {
    handleServiceError(res, error, '更新激活的Growth配置');
  }
});

/**
 * @route   POST /api/growth/config
 * @desc    创建新的配置方案
 * @access  Private (SUPER_ADMIN)
 * @body    {string} name - 配置名称，必填
 * @body    {string} [description] - 配置描述
 * @body    {number} processNoise - Q参数
 * @body    {number} initialUncertainty - P初始值
 * @body    {number} timeDecayFactor - λ参数
 * @body    {number} minObservations - 最少观测次数
 * @body    {number} maxDaysBetween - 最大天数间隔
 */
router.post('/config', validateGrowthConfigCreate, async (req: Request, res: Response) => {
  try {
    const configData = req.body;

    const newConfig = await GrowthService.createGrowthConfig(configData);

    sendSuccess(res, newConfig);

  } catch (error) {
    handleServiceError(res, error, '创建Growth配置');
  }
});

// ================================
// 辅助查询接口 API
// ================================

/**
 * @route   GET /api/growth/quick/students
 * @desc    快速获取学生列表，用于打标签界面的学生选择
 * @access  Private (SUPER_ADMIN, MANAGER, TEACHER)
 * @params  {number} [classId] - 可选班级筛选
 * @params  {string} [search] - 搜索学生姓名或publicId，最少2个字符
 * @params  {number} [limit] - 返回数量限制，默认50，最大200
 * @params  {boolean} [includeInactive] - 是否包含非激活学生，默认false
 * @params  {boolean} [hasGrowthData] - 是否只返回有成长记录的学生，默认false
 * @params  {string} [orderBy] - 排序字段 (name|recentActivity|enrollmentDate)，默认name
 * @params  {string} [order] - 排序方向 (asc|desc)，默认asc
 */
router.get('/quick/students', async (req: Request, res: Response) => {
  try {
    const filters = {
      classId: req.query.classId ? parseInt(req.query.classId as string) : undefined,
      search: req.query.search as string | undefined,
      limit: Math.min(req.query.limit ? parseInt(req.query.limit as string) : 50, 200),
      includeInactive: req.query.includeInactive === 'true',
      hasGrowthData: req.query.hasGrowthData === 'true',
      orderBy: (req.query.orderBy as 'name' | 'recentActivity' | 'enrollmentDate') || 'name',
      order: (req.query.order as 'asc' | 'desc') || 'asc'
    };

    const students = await GrowthService.getQuickStudentList(filters);

    sendSuccess(res, students);

  } catch (error) {
    handleServiceError(res, error, '获取快速学生列表');
  }
});

/**
 * @route   GET /api/growth/quick/classes
 * @desc    获取班级列表
 * @access  Private (所有已认证用户)
 */
router.get('/quick/classes', async (req: Request, res: Response) => {
  try {
    const classes = await GrowthService.getQuickClassList();

    sendSuccess(res, classes);

  } catch (error) {
    handleServiceError(res, error, '获取班级列表');
  }
});

// ================================
// 系统维护和健康检查 API
// ================================

/**
 * @route   GET /api/growth/system/health
 * @desc    检查成长状态系统健康状况
 * @access  Private (SUPER_ADMIN)
 */
router.get('/system/health', async (req: Request, res: Response) => {
  try {
    const healthReport = await GrowthService.checkGrowthSystemHealth();

    sendSuccess(res, healthReport);

  } catch (error) {
    handleServiceError(res, error, '检查系统健康状况');
  }
});

/**
 * @route   POST /api/growth/system/cleanup
 * @desc    清理和优化成长状态数据
 * @access  Private (SUPER_ADMIN)
 */
router.post('/system/cleanup', async (req: Request, res: Response) => {
  try {
    const cleanupResult = await GrowthService.cleanupGrowthStates();

    sendSuccess(res, cleanupResult);

  } catch (error) {
    handleServiceError(res, error, '数据清理');
  }
});

/**
 * @route   POST /api/growth/system/recalculate
 * @desc    重新计算指定时间范围内的成长状态
 * @access  Private (SUPER_ADMIN)
 * @body    {string} startDate - 开始日期 YYYY-MM-DD
 * @body    {string} endDate - 结束日期 YYYY-MM-DD
 */
router.post('/system/recalculate', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return sendError(res, 400, 'INVALID_DATE_RANGE', '开始日期和结束日期不能为空');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return sendError(res, 400, 'INVALID_DATE_RANGE', '开始日期必须早于结束日期');
    }

    const processedCount = await GrowthService.recalculateGrowthStatesByDateRange(start, end);

    sendSuccess(res, {
      processedCount,
      startDate,
      endDate
    });

  } catch (error) {
    handleServiceError(res, error, '重新计算成长状态');
  }
});

/**
 * @route   GET /api/growth/analytics/stats
 * @desc    获取成长分析统计信息
 * @access  Private (SUPER_ADMIN, MANAGER)
 */
router.get('/analytics/stats', async (req: Request, res: Response) => {
  try {
    const stats = await GrowthService.getGrowthAnalyticsStats();

    sendSuccess(res, stats);

  } catch (error) {
    handleServiceError(res, error, '获取成长分析统计信息');
  }
});

/**
 * @route   POST /api/growth/kalman/recalculate-all
 * @desc    重新计算所有成长状态（使用卡尔曼滤波器）
 * @access  Private (SUPER_ADMIN)
 */
router.post('/kalman/recalculate-all', async (req: Request, res: Response) => {
  try {
    // 导入卡尔曼服务
    const KalmanService = await import('../services/kalman.service');
    
    const processedCount = await KalmanService.recalculateGrowthStates();

    sendSuccess(res, {
      processedCount
    });

  } catch (error) {
    handleServiceError(res, error, '卡尔曼滤波器重新计算');
  }
});

/**
 * @route   GET /api/growth/kalman/predict/:enrollmentId/:tagId
 * @desc    预测学生在指定标签上的未来成长状态
 * @access  Private (SUPER_ADMIN, MANAGER, TEACHER)
 * @params  {number} enrollmentId - 班级注册ID
 * @params  {number} tagId - 标签ID
 * @params  {string} [targetDate] - 目标预测日期 YYYY-MM-DD，默认为7天后
 */
router.get('/kalman/predict/:enrollmentId/:tagId', async (req: Request, res: Response) => {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId);
    const tagId = parseInt(req.params.tagId);
    const targetDateStr = req.query.targetDate as string;

    if (isNaN(enrollmentId) || isNaN(tagId)) {
      return sendError(res, 400, 'INVALID_PARAMETERS', '无效的学生ID或标签ID');
    }

    // 默认预测7天后的状态
    const targetDate = targetDateStr ? 
      new Date(targetDateStr) : 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 导入卡尔曼服务
    const KalmanService = await import('../services/kalman.service');
    
    const prediction = await KalmanService.predictGrowthAtTime(enrollmentId, tagId, targetDate);

    sendSuccess(res, {
      enrollmentId,
      tagId,
      targetDate: targetDate.toISOString(),
      prediction
    });

  } catch (error) {
    handleServiceError(res, error, '卡尔曼滤波器预测');
  }
});

export default router;