// src/api/customer.routes.ts
// 该文件定义了所有与CRM功能相关的路由，例如客户、沟通纪要等。

import { Router, Request, Response } from 'express';
import * as customerService from '../services/customer.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware); // 保护所有CRM路由

/**
 * @route   GET /api/customers
 * @desc    获取客户列表
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.query 中解析筛选和分页参数
    const { status, search, page, limit, unclassed, excludeClassId } = req.query;

    // 解析状态参数，支持逗号分隔的多状态
    let statusFilter: any = undefined;
    if (status) {
      const statusList = (status as string).split(',').map(s => s.trim());
      statusFilter = statusList.length === 1 ? statusList[0] : statusList;
    }

    const filters = {
      status: statusFilter,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      unclassed: unclassed === 'true', // 2. 解析 unclassed 参数
      excludeClassId: excludeClassId ? parseInt(excludeClassId as string) : undefined // 3. 解析 excludeClassId 参数
    };

    // 2. 调用 customerService.getCustomers
    const customers = await customerService.getCustomers(filters);

    // 3. 响应成功 (200) 并返回客户列表
    res.status(200).json(customers);

  } catch (error) {
    console.error('获取客户列表路由错误:', error);
    res.status(500).json({
      message: '获取客户列表失败'
    });
  }
});

/**
 * @route   GET /api/customers/stats
 * @desc    获取CRM统计数据
 * @access  Private
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 1. 调用 customerService.getCustomerStats
    const stats = await customerService.getCustomerStats();

    // 2. 响应成功 (200) 并返回统计数据
    res.status(200).json(stats);

  } catch (error) {
    console.error('获取CRM统计数据路由错误:', error);
    res.status(500).json({
      message: '获取CRM统计数据失败'
    });
  }
});

/**
 * @route   POST /api/customers
 * @desc    创建新客户
 * @access  Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.body 中获取客户数据 (CreateCustomerDto)
    const customerData = req.body;

    // 2. 对数据进行校验
    if (!customerData.name || !customerData.name.trim()) {
      return res.status(400).json({
        message: '客户姓名不能为空'
      });
    }

    if (!customerData.parents || !Array.isArray(customerData.parents) || customerData.parents.length === 0) {
      return res.status(400).json({
        message: '至少需要提供一个家长信息'
      });
    }

    // 验证家长信息
    for (const parent of customerData.parents) {
      if (!parent.name || !parent.relationship || !parent.phone) {
        return res.status(400).json({
          message: '家长姓名、关系和联系方式不能为空'
        });
      }
    }

    // 3. 调用 customerService.createCustomer
    const newCustomer = await customerService.createCustomer(customerData);

    // 4. 响应成功 (201 Created) 并返回新创建的客户对象
    res.status(201).json(newCustomer);

  } catch (error) {
    console.error('创建客户路由错误:', error);
    res.status(500).json({
      message: '创建客户失败'
    });
  }
});

/**
 * @route   GET /api/customers/:id
 * @desc    获取单个客户的完整档案
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.params.id 中获取客户ID
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({
        message: '无效的客户ID'
      });
    }

    // 2. 调用 customerService.getCustomerById
    const customer = await customerService.getCustomerById(customerId);

    // 3. 根据结果响应成功 (200) 或未找到 (404)
    if (customer) {
      res.status(200).json(customer);
    } else {
      res.status(404).json({
        message: '客户不存在'
      });
    }

  } catch (error) {
    console.error('获取客户档案路由错误:', error);
    res.status(500).json({
      message: '获取客户档案失败'
    });
  }
});

/**
 * @route   PUT /api/customers/:id
 * @desc    更新客户档案
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.params.id 中获取客户ID
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({
        message: '无效的客户ID'
      });
    }

    // 2. 从 req.body 中获取待更新的数据 (UpdateCustomerDto)
    const updateData = req.body;

    // 基本验证 - 确保至少有一个字段要更新
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: '请提供要更新的字段'
      });
    }

    // 3. 调用 customerService.updateCustomer
    const updatedCustomer = await customerService.updateCustomer(customerId, updateData);

    // 4. 响应成功 (200) 并返回更新后的客户对象
    res.status(200).json(updatedCustomer);

  } catch (error) {
    console.error('更新客户档案路由错误:', error);
    
    // 处理客户不存在的情况
    if (error instanceof Error && error.message?.includes('Record to update not found')) {
      return res.status(404).json({
        message: '客户不存在'
      });
    }
    
    res.status(500).json({
      message: '更新客户档案失败'
    });
  }
});

/**
 * @route   DELETE /api/customers
 * @desc    批量删除客户
 * @access  Private
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.body.ids 中获取待删除的ID数组
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        message: '请提供要删除的客户ID数组'
      });
    }

    // 验证所有ID都是数字
    const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length !== ids.length) {
      return res.status(400).json({
        message: '提供的ID中包含无效值'
      });
    }

    // 2. 调用 customerService.deleteCustomers
    await customerService.deleteCustomers(validIds);

    // 3. 响应成功 (204 No Content)
    res.status(204).send();

  } catch (error) {
    console.error('批量删除客户路由错误:', error);
    res.status(500).json({
      message: '批量删除客户失败'
    });
  }
});

/**
 * @route   DELETE /api/customers/:id
 * @desc    删除单个客户
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.params.id 获取 customerId
    const customerId = parseInt(req.params.id);

    if (!customerId || !Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: '无效的客户ID'
      });
    }

    // 2. 调用 customerService.deleteCustomers (复用批量删除逻辑)
    await customerService.deleteCustomers([customerId]);

    // 3. 响应成功 (204 No Content)
    res.status(204).send();

  } catch (error) {
    console.error('删除客户路由错误:', error);
    res.status(500).json({
      message: '删除客户失败'
    });
  }
});

/**
 * @route   POST /api/customers/:id/logs
 * @desc    为客户添加沟通纪要
 * @access  Private
 */
router.post('/:id/logs', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.params.id 获取 customerId
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({
        message: '无效的客户ID'
      });
    }

    // 2. 从 req.body.content 获取纪要内容
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        message: '沟通纪要内容不能为空'
      });
    }

    // 3. 调用 customerService.addCommunicationLog
    const newLog = await customerService.addCommunicationLog(customerId, content);

    // 4. 响应成功 (201 Created) 并返回新的纪要对象
    res.status(201).json(newLog);

  } catch (error) {
    console.error('添加沟通纪要路由错误:', error);
    
    // 处理客户不存在的情况
    if (error instanceof Error && error.message === '客户不存在') {
      return res.status(404).json({
        message: '客户不存在'
      });
    }
    
    res.status(500).json({
      message: '添加沟通纪要失败'
    });
  }
});

/**
 * @route   PUT /api/customers/logs/:logId
 * @desc    更新沟通纪要
 * @access  Private
 */
router.put('/logs/:logId', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.params.logId 获取 logId
    const logId = parseInt(req.params.logId);

    if (isNaN(logId)) {
      return res.status(400).json({
        message: '无效的沟通纪要ID'
      });
    }

    // 2. 从 req.body.content 获取新的纪要内容
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        message: '沟通纪要内容不能为空'
      });
    }

    // 3. 调用 customerService.updateCommunicationLog
    const updatedLog = await customerService.updateCommunicationLog(logId, content);

    // 4. 响应成功 (200) 并返回更新后的纪要对象
    res.status(200).json(updatedLog);

  } catch (error) {
    console.error('更新沟通纪要路由错误:', error);
    
    // 处理纪要不存在的情况
    if (error instanceof Error && error.message === '沟通纪要不存在') {
      return res.status(404).json({
        message: '沟通纪要不存在'
      });
    }
    
    res.status(500).json({
      message: '更新沟通纪要失败'
    });
  }
});

/**
 * @route   DELETE /api/customers/logs/:logId
 * @desc    删除沟通纪要
 * @access  Private
 */
router.delete('/logs/:logId', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.params.logId 获取 logId
    const logId = parseInt(req.params.logId);

    if (isNaN(logId)) {
      return res.status(400).json({
        message: '无效的沟通纪要ID'
      });
    }

    // 2. 调用 customerService.deleteCommunicationLog
    await customerService.deleteCommunicationLog(logId);

    // 3. 响应成功 (204 No Content)
    res.status(204).send();

  } catch (error) {
    console.error('删除沟通纪要路由错误:', error);
    
    // 处理纪要不存在的情况
    if (error instanceof Error && error.message === '沟通纪要不存在') {
      return res.status(404).json({
        message: '沟通纪要不存在'
      });
    }
    
    res.status(500).json({
      message: '删除沟通纪要失败'
    });
  }
});


export default router; 