// src/api/finance.routes.ts
import { Router, Request, Response } from 'express';
import * as FinanceService from '../services/finance.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// 保护此模块下的所有路由
router.use(authMiddleware);

// --- 路由定义 ---

/**
 * @route   GET /api/finance/student-summaries
 * @desc    获取学生财务状况总览
 * @access  Private
 */
router.get('/student-summaries', async (req: Request, res: Response) => {
  try {
    const summaries = await FinanceService.getStudentFinanceSummaries();
    res.status(200).json(summaries);
  } catch (error) {
    console.error('获取学生财务总览路由错误:', error);
    res.status(500).json({
      message: '获取学生财务总览失败'
    });
  }
});

/**
 * @route   GET /api/finance/students/:id/details
 * @desc    获取单个学生的详细财务信息
 * @access  Private
 */
router.get('/students/:id/details', async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.id, 10);

    if (isNaN(studentId)) {
      return res.status(400).json({
        message: '无效的学生ID'
      });
    }

    const details = await FinanceService.getStudentFinanceDetails(studentId);
    res.status(200).json(details);

  } catch (error) {
    console.error('获取学生财务详情路由错误:', error);
    
    if (error instanceof Error && error.message === '学生不存在') {
      return res.status(404).json({
        message: '学生不存在'
      });
    }
    
    res.status(500).json({
      message: '获取学生财务详情失败'
    });
  }
});

/**
 * @route   POST /api/finance/orders
 * @desc    为学生创建新订单
 * @access  Private
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const { studentId, name, totalDue, dueDate, coursePeriodStart, coursePeriodEnd } = req.body;

    // 输入验证
    if (!studentId || !Number.isInteger(studentId)) {
      return res.status(400).json({
        message: '学生ID不能为空且必须为整数'
      });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        message: '订单名称不能为空'
      });
    }

    if (!totalDue || isNaN(parseFloat(totalDue)) || parseFloat(totalDue) <= 0) {
      return res.status(400).json({
        message: '应收总额必须为大于0的数字'
      });
    }

    // 日期验证（如果提供）
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({
        message: '结账日期格式无效'
      });
    }

    if (coursePeriodStart && isNaN(new Date(coursePeriodStart).getTime())) {
      return res.status(400).json({
        message: '课程开始日期格式无效'
      });
    }

    if (coursePeriodEnd && isNaN(new Date(coursePeriodEnd).getTime())) {
      return res.status(400).json({
        message: '课程结束日期格式无效'
      });
    }

    const orderData = { name: name.trim(), totalDue, dueDate, coursePeriodStart, coursePeriodEnd };
    const newOrder = await FinanceService.createOrderForStudent(studentId, orderData);
    res.status(201).json(newOrder);

  } catch (error) {
    console.error('创建订单路由错误:', error);
    
    if (error instanceof Error && error.message === '学生不存在') {
      return res.status(404).json({
        message: '学生不存在'
      });
    }
    
    res.status(500).json({
      message: '创建订单失败'
    });
  }
});

/**
 * @route   PUT /api/finance/orders/:orderId
 * @desc    更新订单信息
 * @access  Private
 */
router.put('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({
        message: '无效的订单ID'
      });
    }

    const { name, totalDue, dueDate, coursePeriodStart, coursePeriodEnd } = req.body;

    // 验证提供的字段
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({
        message: '订单名称不能为空'
      });
    }

    if (totalDue !== undefined && (isNaN(parseFloat(totalDue)) || parseFloat(totalDue) <= 0)) {
      return res.status(400).json({
        message: '应收总额必须为大于0的数字'
      });
    }

    // 日期验证
    if (dueDate !== undefined && dueDate && isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({
        message: '结账日期格式无效'
      });
    }

    if (coursePeriodStart !== undefined && coursePeriodStart && isNaN(new Date(coursePeriodStart).getTime())) {
      return res.status(400).json({
        message: '课程开始日期格式无效'
      });
    }

    if (coursePeriodEnd !== undefined && coursePeriodEnd && isNaN(new Date(coursePeriodEnd).getTime())) {
      return res.status(400).json({
        message: '课程结束日期格式无效'
      });
    }

    const orderData = { name: name?.trim(), totalDue, dueDate, coursePeriodStart, coursePeriodEnd };
    const updatedOrder = await FinanceService.updateOrder(orderId, orderData);
    res.status(200).json(updatedOrder);

  } catch (error) {
    console.error('更新订单路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '订单不存在') {
        return res.status(404).json({
          message: '订单不存在'
        });
      }
      if (error.message.includes('订单总额不能小于已支付金额')) {
        return res.status(400).json({
          message: error.message
        });
      }
    }
    
    res.status(500).json({
      message: '更新订单失败'
    });
  }
});

/**
 * @route   DELETE /api/finance/orders/:orderId
 * @desc    删除订单
 * @access  Private
 */
router.delete('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({
        message: '无效的订单ID'
      });
    }

    await FinanceService.deleteOrder(orderId);
    res.status(204).send();

  } catch (error) {
    console.error('删除订单路由错误:', error);
    
    if (error instanceof Error && error.message === '订单不存在') {
      return res.status(404).json({
        message: '订单不存在'
      });
    }
    
    res.status(500).json({
      message: '删除订单失败'
    });
  }
});

/**
 * @route   POST /api/finance/orders/:orderId/payments
 * @desc    为订单添加收款记录
 * @access  Private
 */
router.post('/orders/:orderId/payments', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({
        message: '无效的订单ID'
      });
    }

    const { amount, paymentDate, notes } = req.body;

    // 输入验证
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        message: '收款金额必须为大于0的数字'
      });
    }

    if (!paymentDate || isNaN(new Date(paymentDate).getTime())) {
      return res.status(400).json({
        message: '收款日期不能为空且格式必须正确'
      });
    }

    const paymentData = { amount, paymentDate, notes };
    const newPayment = await FinanceService.addPaymentToOrder(orderId, paymentData);
    res.status(201).json(newPayment);

  } catch (error) {
    console.error('添加付款记录路由错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '订单不存在') {
        return res.status(404).json({
          message: '订单不存在'
        });
      }
      if (error.message.includes('付款金额超过订单剩余应付金额')) {
        return res.status(400).json({
          message: error.message
        });
      }
    }
    
    res.status(500).json({
      message: '添加付款记录失败'
    });
  }
});

/**
 * @route   PUT /api/finance/payments/:paymentId
 * @desc    更新收款记录
 * @access  Private
 */
router.put('/payments/:paymentId', async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId, 10);

    if (isNaN(paymentId)) {
      return res.status(400).json({
        message: '无效的付款记录ID'
      });
    }

    const { amount, paymentDate, notes } = req.body;

    // 验证提供的字段
    if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      return res.status(400).json({
        message: '收款金额必须为大于0的数字'
      });
    }

    if (paymentDate !== undefined && isNaN(new Date(paymentDate).getTime())) {
      return res.status(400).json({
        message: '收款日期格式无效'
      });
    }

    const paymentData = { amount, paymentDate, notes };
    const updatedPayment = await FinanceService.updatePayment(paymentId, paymentData);
    res.status(200).json(updatedPayment);

  } catch (error) {
    console.error('更新付款记录路由错误:', error);
    
    if (error instanceof Error && error.message === '付款记录不存在') {
      return res.status(404).json({
        message: '付款记录不存在'
      });
    }
    
    res.status(500).json({
      message: '更新付款记录失败'
    });
  }
});

/**
 * @route   DELETE /api/finance/payments/:paymentId
 * @desc    删除收款记录
 * @access  Private
 */
router.delete('/payments/:paymentId', async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId, 10);

    if (isNaN(paymentId)) {
      return res.status(400).json({
        message: '无效的付款记录ID'
      });
    }

    await FinanceService.deletePayment(paymentId);
    res.status(204).send();

  } catch (error) {
    console.error('删除付款记录路由错误:', error);
    
    if (error instanceof Error && error.message === '付款记录不存在') {
      return res.status(404).json({
        message: '付款记录不存在'
      });
    }
    
    res.status(500).json({
      message: '删除付款记录失败'
    });
  }
});

export default router; 