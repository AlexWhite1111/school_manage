// src/api/exam.routes.ts
import express from 'express';
import * as examService from '../services/exam.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// 保护所有考试路由
router.use(authMiddleware);

// ================================
// 统一响应格式辅助函数
// ================================

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

const sendSuccess = <T>(res: express.Response, data: T): void => {
  res.status(200).json({
    success: true,
    data
  } as ApiResponse<T>);
};

const sendError = (res: express.Response, status: number, code: string, message: string): void => {
  res.status(status).json({
    success: false,
    error: { code, message }
  } as ApiResponse);
};

const handleServiceError = (res: express.Response, error: unknown, operation: string): void => {
  console.error(`${operation}失败:`, error);
  
  if (error instanceof Error) {
    switch (error.message) {
      case '学生不存在':
      case '未找到学号':
        return sendError(res, 404, 'STUDENT_NOT_FOUND', '学生不存在');
      case '考试不存在':
        return sendError(res, 404, 'EXAM_NOT_FOUND', '考试不存在');
      default:
        break;
    }
  }
  
  sendError(res, 500, 'INTERNAL_ERROR', `${operation}失败`);
};

// ================================
// 智能路由 - 考试历史数据
// ================================

/**
 * @route   GET /api/exam/students/by-public-id/:publicId/history
 * @desc    获取学生考试历史（仅支持publicId）
 * @access  Private
 * @params  {string} publicId - 学生公开ID
 * @params  {string} [startDate] - 开始日期
 * @params  {string} [endDate] - 结束日期
 */
router.get('/students/by-public-id/:publicId/history', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { startDate, endDate } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: '学生公开ID不能为空'
      });
    }

    const result = await examService.getStudentExamHistoryByPublicId(publicId, {
      startDate: startDate as string,
      endDate: endDate as string
    });

    sendSuccess(res, result);
  } catch (error) {
    handleServiceError(res, error, '获取学生考试历史');
  }
});

// 🗺️ Legacy route alias: /students/by-public-id/:publicId/exam-history
router.get('/students/by-public-id/:publicId/exam-history', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { startDate, endDate } = req.query;

    if (!publicId) {
      return res.status(400).json({ success: false, message: '学生公开ID不能为空' });
    }

    const result = await examService.getStudentExamHistoryByPublicId(publicId, {
      startDate: startDate as string,
      endDate: endDate as string
    });

    sendSuccess(res, result);
  } catch (error) {
    handleServiceError(res, error, '获取学生考试历史');
  }
});


// ================================
// 原有路由（标记为deprecated）
// ================================

// ----------------------------------------
// 考试管理路由
// ----------------------------------------

/**
 * @route POST /api/exams
 * @desc 创建新考试
 */
router.post('/', async (req, res) => {
  try {
    const { name, examType, examDate, totalScore, description, classId, subjects } = req.body;
    
    // 从JWT token获取用户ID
    const createdById = req.user?.id || 1;
    
    if (!name || !examType || !examDate || !classId || !subjects) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: name, examType, examDate, classId, subjects'
      });
    }
    
    const result = await examService.createExam({
      name,
      examType,
      examDate: new Date(examDate),
      totalScore,
      description,
      classId: parseInt(classId),
      createdById,
      subjects
    });
    
    res.json({
      success: true,
      message: '考试创建成功',
      data: result
    });
    
  } catch (error) {
    console.error('创建考试失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '创建考试失败'
    });
  }
});

/**
 * @route GET /api/exams/class/:classId
 * @desc 获取班级考试列表
 */
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, examType, startDate, endDate, includeDeleted } = req.query;
    
    const filters: any = {};
    if (name) filters.name = name as string;
    if (examType) filters.examType = examType;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (includeDeleted) filters.includeDeleted = includeDeleted === 'true';
    
    const exams = await examService.getClassExams(parseInt(classId), filters);
    
    res.json({
      success: true,
      message: '获取考试列表成功',
      data: exams
    });
    
  } catch (error) {
    console.error('获取考试列表失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试列表失败'
    });
  }
});

/**
 * @route GET /api/exams/:examId
 * @desc 获取考试详情
 */
router.get('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await examService.getExamDetails(parseInt(examId));
    
    res.json({
      success: true,
      message: '获取考试详情成功',
      data: exam
    });
    
  } catch (error) {
    console.error('获取考试详情失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试详情失败'
    });
  }
});

/**
 * @route PUT /api/exams/:examId/scores
 * @desc 录入/更新考试成绩
 */
router.put('/:examId/scores', async (req, res) => {
  try {
    const { examId } = req.params;
    const { scores } = req.body;
    
    if (!scores || !Array.isArray(scores)) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: scores (数组)'
      });
    }
    
    const results = await examService.updateExamScores(parseInt(examId), scores);
    
    res.json({
      success: true,
      message: '成绩录入成功',
      data: results
    });
    
  } catch (error) {
    console.error('录入成绩失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '录入成绩失败'
    });
  }
});

/**
 * @route DELETE /api/exams/:examId
 * @desc 软删除考试
 */
router.delete('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    // 模拟用户ID (实际应该从JWT token获取)
    const deletedById = 1;
    
    const result = await examService.deleteExam(parseInt(examId), deletedById);
    
    res.json({
      success: true,
      message: '考试删除成功',
      data: result
    });
    
  } catch (error) {
    console.error('删除考试失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '删除考试失败'
    });
  }
});

/**
 * @route GET /api/exams/subjects
 * @desc 获取可用科目列表
 */
router.get('/meta/subjects', async (req, res) => {
  try {
    const subjects = [
      { value: 'CHINESE', label: '语文' },
      { value: 'MATH', label: '数学' },
      { value: 'ENGLISH', label: '英语' },
      { value: 'PHYSICS', label: '物理' },
      { value: 'CHEMISTRY', label: '化学' },
      { value: 'BIOLOGY', label: '生物' },
      { value: 'HISTORY', label: '历史' },
      { value: 'GEOGRAPHY', label: '地理' },
      { value: 'POLITICS', label: '政治' }
    ];
    
    const examTypes = [
      { value: 'DAILY_QUIZ', label: '日常测验' },
      { value: 'WEEKLY_TEST', label: '周测' },
      { value: 'MONTHLY_EXAM', label: '月考' },
      { value: 'MIDTERM', label: '期中考试' },
      { value: 'FINAL', label: '期末考试' }
    ];
    
    res.json({
      success: true,
      message: '获取元数据成功',
      data: {
        subjects,
        examTypes
      }
    });
    
  } catch (error) {
    console.error('获取元数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取元数据失败'
    });
  }
});

/**
 * @route GET /api/exams/:examId/statistics
 * @desc 获取考试详细统计分析
 */
router.get('/:examId/statistics', async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    
    if (!examId || isNaN(examId)) {
      return res.status(400).json({
        success: false,
        message: '考试ID格式无效'
      });
    }
    
    const statistics = await examService.getExamStatistics(examId);
    
    res.json({
      success: true,
      message: '获取考试统计分析成功',
      data: statistics
    });
    
  } catch (error) {
    console.error('获取考试统计分析失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试统计分析失败'
    });
  }
});

/**
 * @route GET /api/exams/class/:classId/subject/:subject/trend
 * @desc 获取班级科目的历史趋势分析
 */
router.get('/class/:classId/subject/:subject/trend', async (req, res) => {
  try {
    const { classId, subject } = req.params;
    const { startDate, endDate, examType } = req.query;
    
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (examType && examType !== 'all') filters.examType = examType;
    
    const trendData = await examService.getSubjectTrend(
      parseInt(classId), 
      subject as any, 
      filters
    );
    
    res.json({
      success: true,
      message: '获取科目趋势分析成功',
      data: trendData
    });
    
  } catch (error) {
    console.error('获取科目趋势分析失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取科目趋势分析失败'
    });
  }
});

/**
 * @route GET /api/exams/class/:classId/subject/:subject/students
 * @desc 获取班级科目下学生的成绩历史和趋势
 */
router.get('/class/:classId/subject/:subject/students', async (req, res) => {
  try {
    const { classId, subject } = req.params;
    const { startDate, endDate, examType, studentId } = req.query;
    
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (examType && examType !== 'all') filters.examType = examType;
    if (studentId) filters.studentId = parseInt(studentId as string);
    
    const studentsData = await examService.getSubjectStudentsAnalysis(
      parseInt(classId), 
      subject as any, 
      filters
    );
    
    res.json({
      success: true,
      message: '获取科目学生分析成功',
      data: studentsData
    });
    
  } catch (error) {
    console.error('获取科目学生分析失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取科目学生分析失败'
    });
  }
});

// 获取单次考试的特定科目详细分析
router.get('/:examId/subject/:subject/detail', async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const subject = req.params.subject;
    const historyLimit = parseInt(req.query.historyLimit as string) || 5; // 默认获取最近5次考试

    const result = await examService.getExamSubjectDetail(examId, subject as any, historyLimit);
    
    res.json({
      success: true,
      message: '获取考试科目详情成功',
      data: result
    });
    
  } catch (error) {
    console.error('获取考试科目详情失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取考试科目详情失败'
    });
  }
});

// ✅ REMOVED: Duplicate /students/by-public-id/:publicId/exam-history route
// This functionality is already available at /students/by-public-id/:publicId/history

export default router;