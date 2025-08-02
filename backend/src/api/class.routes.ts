// src/api/class.routes.ts
import { Router, Request, Response } from 'express';
import * as ClassService from '../services/class.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware); // 保护所有班级路由

/**
 * @route   GET /api/classes
 * @desc    获取所有班级列表
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const classes = await ClassService.getAllClasses();
    res.status(200).json(classes);
  } catch (error) {
    console.error('获取班级列表路由错误:', error);
    res.status(500).json({
      message: '获取班级列表失败'
    });
  }
});

/**
 * @route   POST /api/classes
 * @desc    创建一个新班级
 * @access  Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        message: '班级名称不能为空'
      });
    }

    const newClass = await ClassService.createClass(name);
    res.status(201).json(newClass);

  } catch (error) {
    console.error('创建班级路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '班级名称已存在') {
        return res.status(409).json({
          message: '班级名称已存在'
        });
      }
      
      if (error.message === '班级名称不能为空') {
        return res.status(400).json({
          message: error.message
        });
      }
    }
    
    res.status(500).json({
      message: '创建班级失败'
    });
  }
});

/**
 * @route   GET /api/classes/:id/students
 * @desc    获取指定班级下的所有学生及其当日考勤（重构版 - 支持多班级）
 * @access  Private
 */
router.get('/:id/students', async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.id, 10);

    if (isNaN(classId)) {
      return res.status(400).json({
        message: '无效的班级ID'
      });
    }

    // 解析查询参数
    const options = {
      includeOtherEnrollments: req.query.includeOtherEnrollments === 'true',
      includeStats: req.query.includeStats === 'true',
      includeRecentTags: req.query.includeRecentTags === 'true',
      date: req.query.date ? req.query.date as string : undefined
    };

    console.log('获取班级学生请求 - 班级ID:', classId, '选项:', options);

    const students = await ClassService.getStudentsByClassId(classId, options);
    res.status(200).json(students);

  } catch (error) {
    console.error('获取班级学生路由错误:', error);
    
    if (error instanceof Error && error.message === '班级不存在') {
      return res.status(404).json({
        message: '班级不存在'
      });
    }
    
    res.status(500).json({
      message: '获取班级学生失败'
    });
  }
});

/**
 * @route   POST /api/classes/:id/enrollments
 * @desc    向班级中批量添加学生
 * @access  Private
 */
router.post('/:id/enrollments', async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.id, 10);
    const { studentIds } = req.body;

    if (isNaN(classId)) {
      return res.status(400).json({
        message: '无效的班级ID'
      });
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        message: '学生ID列表不能为空'
      });
    }

    // 验证所有学生ID都是有效的数字
    const validStudentIds = studentIds.filter(id => Number.isInteger(id) && id > 0);
    if (validStudentIds.length !== studentIds.length) {
      return res.status(400).json({
        message: '学生ID列表包含无效值'
      });
    }

    const result = await ClassService.addStudentsToClass(classId, studentIds);
    res.status(201).json(result);

  } catch (error) {
    console.error('添加学生到班级路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '班级不存在') {
        return res.status(404).json({
          message: '班级不存在'
        });
      }
      
      if (error.message.includes('部分学生不符合加入班级的条件')) {
        return res.status(400).json({
          message: error.message
        });
      }
      
      if (error.message === '部分学生已在该班级中') {
        return res.status(409).json({
          message: '部分学生已在该班级中'
        });
      }
      
      if (error.message === '学生ID列表不能为空') {
        return res.status(400).json({
          message: error.message
        });
      }
    }
    
    res.status(500).json({
      message: '添加学生到班级失败'
    });
  }
});

/**
 * @route   DELETE /api/classes/enrollments
 * @desc    从班级中批量移除学生
 * @access  Private
 */
router.delete('/enrollments', async (req: Request, res: Response) => {
  try {
    const { enrollmentIds } = req.body;

    if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return res.status(400).json({
        message: '注册ID列表不能为空'
      });
    }

    // 验证所有注册ID都是有效的数字
    const validEnrollmentIds = enrollmentIds.filter(id => Number.isInteger(id) && id > 0);
    if (validEnrollmentIds.length !== enrollmentIds.length) {
      return res.status(400).json({
        message: '注册ID列表包含无效值'
      });
    }

    await ClassService.removeStudentsFromClass(enrollmentIds);
    res.status(204).send();

  } catch (error) {
    console.error('从班级移除学生路由错误:', error);
    
    if (error instanceof Error && error.message === '注册ID列表不能为空') {
      return res.status(400).json({
        message: error.message
      });
    }
    
    res.status(500).json({
      message: '从班级移除学生失败'
    });
  }
});

/**
 * @route   DELETE /api/classes/:id
 * @desc    删除指定班级
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.id, 10);

    if (!classId || !Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({
        message: '无效的班级ID'
      });
    }

    await ClassService.deleteClass(classId);
    res.status(204).send();

  } catch (error) {
    console.error('删除班级路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '无效的班级ID') {
        return res.status(400).json({
          message: error.message
        });
      }
      
      if (error.message === '班级不存在') {
        return res.status(404).json({
          message: error.message
        });
      }
    }
    
    res.status(500).json({
      message: '删除班级失败'
    });
  }
});

export default router; 