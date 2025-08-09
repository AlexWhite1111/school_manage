// src/api/global.routes.ts
// 该文件定义了全局操作的路由，例如数据导入和导出。

import { Router, Request, Response } from 'express';
import * as GlobalService from '../services/global.service';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import { CustomerStatus } from '@prisma/client';

const router = Router();

// 配置multer用于文件上传
const upload = multer({ 
  dest: path.join(process.cwd(), 'uploads'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传CSV文件'));
    }
  }
});

// 保护此模块下的所有路由
router.use(authMiddleware);

// --- 路由定义 ---

/**
 * @route   GET /api/export/customers
 * @desc    导出客户信息的CSV
 * @access  Private
 */
router.get('/export/customers', async (req: Request, res: Response) => {
  try {
    const { status, search, page, limit } = req.query;
    
    // 验证status参数
    if (status && !Object.values(CustomerStatus).includes(status as CustomerStatus)) {
      return res.status(400).json({
        message: '无效的客户状态'
      });
    }

    const filters = {
      status: status as CustomerStatus,
      search: search as string,
      page: page as string,
      limit: limit as string
    };

    const csv = await GlobalService.exportCustomersToCsv(filters);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send(csv);

  } catch (error) {
    console.error('导出客户CSV路由错误:', error);
    res.status(500).json({
      message: '导出客户CSV失败'
    });
  }
});

/**
 * @route   POST /api/import/customers
 * @desc    导入客户信息的CSV文件
 * @access  Private
 */
router.post('/import/customers', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: '请选择要上传的CSV文件'
      });
    }

    const result = await GlobalService.importCustomersFromCsv(req.file.path);
    res.status(200).json(result);

  } catch (error) {
    console.error('导入客户CSV路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '只允许上传CSV文件') {
        return res.status(400).json({
          message: '只允许上传CSV文件'
        });
      }
      
      if (error.message.includes('CSV文件格式错误')) {
        return res.status(400).json({
          message: 'CSV文件格式错误，请检查文件内容'
        });
      }
    }
    
    res.status(500).json({
      message: '导入客户CSV失败'
    });
  }
});



/**
 * @route   GET /api/export/finance
 * @desc    导出财务数据的CSV
 * @access  Private
 */
router.get('/export/finance', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // 验证日期参数
    if (startDate && isNaN(new Date(startDate as string).getTime())) {
      return res.status(400).json({
        message: '开始日期格式无效'
      });
    }

    if (endDate && isNaN(new Date(endDate as string).getTime())) {
      return res.status(400).json({
        message: '结束日期格式无效'
      });
    }

    const filters = {
      startDate: startDate as string,
      endDate: endDate as string
    };

    const csv = await GlobalService.exportFinanceToCsv(filters);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="finance.csv"');
    res.send(csv);

  } catch (error) {
    console.error('导出财务CSV路由错误:', error);
    res.status(500).json({
      message: '导出财务CSV失败'
    });
  }
});

export default router; 