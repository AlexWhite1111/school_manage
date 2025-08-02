// src/api/excel.routes.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.middleware';
import * as ExcelService from '../services/excel.service';
import { CustomerStatus, Grade } from '@prisma/client';

const router = Router();
router.use(authMiddleware); // 保护所有Excel操作路由

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许Excel文件
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/xlsx'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传Excel文件 (.xlsx, .xls)'));
    }
  }
});

/**
 * @route   POST /api/excel/import-customers
 * @desc    导入客户数据
 * @access  Private (需要管理员或更高权限)
 */
router.post('/import-customers', upload.single('excel'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的Excel文件'
      });
    }

    // 权限检查：只有管理员级别以上可以导入
    const user = (req as any).user;
    if (!user || !['SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以导入数据'
      });
    }

    console.log(`开始导入Excel文件: ${req.file.originalname}`);
    
    const result = await ExcelService.importCustomersFromExcel(req.file.path);
    
    // 导入完成后删除临时文件
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.warn('删除临时文件失败:', error);
    }
    
    if (result.success) {
      res.json({
        success: true,
        message: '数据导入完成',
        data: {
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          errors: result.errors
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: '数据导入失败',
        errors: result.errors
      });
    }

  } catch (error) {
    console.error('Excel导入接口错误:', error);
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('删除临时文件失败:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route   POST /api/excel/export-customers
 * @desc    导出客户数据
 * @access  Private
 */
router.post('/export-customers', async (req: Request, res: Response) => {
  try {
    const { filters } = req.body;
    
    // 解析筛选条件
    const parsedFilters: any = {};
    
    if (filters?.status && Array.isArray(filters.status)) {
      parsedFilters.status = filters.status as CustomerStatus[];
    }
    
    if (filters?.grade && Array.isArray(filters.grade)) {
      parsedFilters.grade = filters.grade as Grade[];
    }
    
    if (filters?.school && Array.isArray(filters.school)) {
      parsedFilters.school = filters.school;
    }
    
    if (filters?.dateRange) {
      parsedFilters.dateRange = {
        start: new Date(filters.dateRange.start),
        end: new Date(filters.dateRange.end)
      };
    }
    
    console.log('开始导出客户数据，筛选条件:', parsedFilters);
    
    const result = await ExcelService.exportCustomersToExcel(parsedFilters);
    
    if (result.success && result.filePath) {
      // 设置响应头
      const fileName = path.basename(result.filePath);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      // 发送文件
      res.sendFile(result.filePath, (err) => {
        if (err) {
          console.error('发送文件失败:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: '文件下载失败'
            });
          }
        }
        
        // 发送完成后删除临时文件
        setTimeout(() => {
          try {
            if (fs.existsSync(result.filePath!)) {
              fs.unlinkSync(result.filePath!);
            }
          } catch (cleanupError) {
            console.warn('删除导出文件失败:', cleanupError);
          }
        }, 5000); // 5秒后删除
      });
    } else {
      res.status(500).json({
        success: false,
        message: '导出失败',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Excel导出接口错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route   GET /api/excel/import-template
 * @desc    下载导入模板
 * @access  Private
 */
router.get('/import-template', async (req: Request, res: Response) => {
  try {
    console.log('生成导入模板');
    
    const result = await ExcelService.generateImportTemplate();
    
    if (result.success && result.filePath) {
      // 设置响应头
      const fileName = path.basename(result.filePath);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      
      // 发送文件
      res.sendFile(result.filePath, (err) => {
        if (err) {
          console.error('发送模板文件失败:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: '模板下载失败'
            });
          }
        }
        
        // 发送完成后删除临时文件（模板可以保留更久一些）
        setTimeout(() => {
          try {
            if (fs.existsSync(result.filePath!)) {
              fs.unlinkSync(result.filePath!);
            }
          } catch (cleanupError) {
            console.warn('删除模板文件失败:', cleanupError);
          }
        }, 30000); // 30秒后删除
      });
    } else {
      res.status(500).json({
        success: false,
        message: '模板生成失败',
        error: result.error
      });
    }

  } catch (error) {
    console.error('生成导入模板接口错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route   GET /api/excel/export-growth-logs/:studentId
 * @desc    导出学生成长记录
 * @access  Private
 */
router.get('/export-growth-logs/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    // TODO: 实现学生成长记录导出
    // 这里可以扩展更多的导出功能
    
    res.json({
      success: false,
      message: '此功能正在开发中'
    });

  } catch (error) {
    console.error('导出成长记录接口错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router; 