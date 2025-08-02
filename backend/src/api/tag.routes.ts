// src/api/tag.routes.ts
// 该文件定义了管理标签的路由，例如获取预定义标签或创建新标签。

import { Router, Request, Response } from 'express';
import * as tagService from '../services/tag.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { TagType } from '@prisma/client';

const router = Router();
router.use(authMiddleware); // 保护所有标签路由

// 有效的标签类型枚举值（用于验证）
const validTagTypes = Object.values(TagType);

/**
 * @route   GET /api/tags
 * @desc    获取标签列表
 * @query   type - 标签类型过滤
 * @query   includeDeleted - 是否包含已删除标签，默认false
 * @access  Private
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // 1. 从 req.query 中解析参数
    const { type, includeDeleted } = req.query;
    const userId = req.user?.id; // 从认证中间件获取用户ID

    // 2. 可选地验证 type 参数是否为有效的 TagType 枚举值
    let validatedType: TagType | undefined = undefined;
    if (type && typeof type === 'string') {
      if ((validTagTypes as string[]).includes(type)) {
        validatedType = type as TagType;
      } else {
        return res.status(400).json({
          message: '无效的标签类型'
        });
      }
    }

    // 3. 解析 includeDeleted 参数
    const includeDeletedFlag = includeDeleted === 'true';

    // 4. 调用 tagService.getTags，传入用户ID以获取个人标签
    const tags = await tagService.getTags(validatedType, userId, includeDeletedFlag);

    // 5. 响应成功 (200) 并返回标签列表
    res.status(200).json(tags);

  } catch (error) {
    console.error('获取标签列表路由错误:', error);
    res.status(500).json({
      message: '获取标签列表失败'
    });
  }
});

/**
 * @route   POST /api/tags
 * @desc    创建新的自定义标签
 * @access  Private
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    // 1. 从 req.body 中获取 text, type, 和 isPersonal
    const { text, type, isPersonal = true } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: '用户未认证'
      });
    }

    // 2. 校验 text 和 type 是否存在且有效
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        message: '标签文本不能为空'
      });
    }

    if (!type || typeof type !== 'string') {
      return res.status(400).json({
        message: '标签类型不能为空'
      });
    }

    // 验证type是否为有效的TagType枚举值
    if (!(validTagTypes as string[]).includes(type)) {
      return res.status(400).json({
        message: '无效的标签类型'
      });
    }

    // 验证isPersonal参数
    if (typeof isPersonal !== 'boolean') {
      return res.status(400).json({
        message: 'isPersonal参数必须为布尔值'
      });
    }

    // 3. 调用 tagService.createTag
    const newTag = await tagService.createTag(text, type as TagType, userId, isPersonal);

    // 4. 响应成功 (201 Created) 并返回新创建的标签对象
    res.status(201).json(newTag);

  } catch (error) {
    console.error('创建标签路由错误:', error);
    
    // 处理特定的业务错误
    if (error instanceof Error) {
      if (error.message.includes('已创建过') || error.message.includes('已存在')) {
        return res.status(409).json({
          message: error.message
        });
      }
      
      if (['标签文本不能为空', '标签类型不能为空', '用户ID不能为空'].includes(error.message)) {
        return res.status(400).json({
          message: error.message
        });
      }
    }
    
    res.status(500).json({
      message: '创建标签失败'
    });
  }
});

/**
 * @route   DELETE /api/tags/:id
 * @desc    软删除个人自定义标签
 * @access  Private
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tagId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: '用户未认证' });
    }
    if (isNaN(tagId)) {
      return res.status(400).json({ message: '无效的标签ID' });
    }

    await tagService.deleteTag(tagId, userId);
    res.status(204).send();
  } catch (error) {
    console.error('软删除标签路由错误:', error);
    if (error instanceof Error) {
      if (error.message === '标签不存在') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === '无权限删除该标签') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === '标签已被删除') {
        return res.status(409).json({ message: error.message });
      }
    }
    res.status(500).json({ message: '软删除标签失败' });
  }
});

/**
 * @route   POST /api/tags/:id/restore
 * @desc    恢复已删除的标签
 * @access  Private
 */
router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tagId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: '用户未认证' });
    }
    if (isNaN(tagId)) {
      return res.status(400).json({ message: '无效的标签ID' });
    }

    await tagService.restoreTag(tagId, userId);
    res.status(200).json({ message: '标签恢复成功' });
  } catch (error) {
    console.error('恢复标签路由错误:', error);
    if (error instanceof Error) {
      if (error.message === '标签不存在') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === '无权限恢复该标签') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === '标签未被删除') {
        return res.status(409).json({ message: error.message });
      }
      if (error.message === '已存在同名的未删除标签，无法恢复') {
        return res.status(409).json({ message: error.message });
      }
    }
    res.status(500).json({ message: '恢复标签失败' });
  }
});

/**
 * @route   DELETE /api/tags/:id/permanent
 * @desc    永久删除标签（硬删除）
 * @access  Private
 */
router.delete('/:id/permanent', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tagId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: '用户未认证' });
    }
    if (isNaN(tagId)) {
      return res.status(400).json({ message: '无效的标签ID' });
    }

    await tagService.permanentDeleteTag(tagId, userId);
    res.status(204).send();
  } catch (error) {
    console.error('永久删除标签路由错误:', error);
    if (error instanceof Error) {
      if (error.message === '标签不存在') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === '无权限永久删除该标签') {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === '该标签已被使用，无法永久删除') {
        return res.status(409).json({ message: error.message });
      }
    }
    res.status(500).json({ message: '永久删除标签失败' });
  }
});

/**
 * @route   GET /api/tags/my-stats
 * @desc    获取当前用户的个人标签统计
 * @query   includeDeleted - 是否包含已删除标签的统计，默认false
 * @access  Private
 */
router.get('/my-stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { includeDeleted } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: '用户未认证'
      });
    }

    const includeDeletedFlag = includeDeleted === 'true';
    const stats = await tagService.getUserTagStats(userId, includeDeletedFlag);
    res.status(200).json(stats);

  } catch (error) {
    console.error('获取用户标签统计路由错误:', error);
    res.status(500).json({
      message: '获取用户标签统计失败'
    });
  }
});

/**
 * @route   POST /api/tags/cleanup
 * @desc    手动清理未使用的个人标签（软删除）
 * @access  Private
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { minUsageCount = 2 } = req.body;
    
    const deletedCount = await tagService.cleanupUnusedPersonalTags(minUsageCount);
    
    res.status(200).json({
      message: '清理完成',
      deletedCount
    });

  } catch (error) {
    console.error('清理标签路由错误:', error);
    res.status(500).json({
      message: '清理个人标签失败'
    });
  }
});

export default router; 