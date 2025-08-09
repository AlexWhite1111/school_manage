// src/api/tag.routes.ts
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as TagService from '../services/tag.service';

const router = Router();

// 保护所有标签路由
router.use(authMiddleware);

// 获取标签列表
// 支持参数：type=TagType | examTags=true | includeDeleted=true
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, examTags, includeDeleted } = req.query as Record<string, string | undefined>;

    const result = await TagService.getTags({
      type: type as any,
      examTags: examTags === 'true',
      includeDeleted: includeDeleted === 'true'
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(500).json({ message: '获取标签列表失败' });
  }
});

// 创建标签（个人/全局）
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, type, isPersonal } = req.body || {};

    if (!text || !type) {
      return res.status(400).json({ message: '缺少必要参数: text, type' });
    }

    const createdById = req.user?.id;
    const tag = await TagService.createTag({
      text: String(text),
      type,
      isPersonal: Boolean(isPersonal),
      createdById
    });

    res.status(201).json(tag);
  } catch (error: any) {
    console.error('创建标签失败:', error);
    const message = error?.message?.includes('Unique constraint') || error?.message?.includes('已存在')
      ? '相同类型下的标签名已存在'
      : (error?.message || '创建标签失败');
    res.status(400).json({ message });
  }
});

// 软删除标签
router.delete('/:tagId', async (req: Request, res: Response) => {
  try {
    const tagId = Number(req.params.tagId);
    if (!Number.isInteger(tagId) || tagId <= 0) {
      return res.status(400).json({ message: '无效的标签ID' });
    }

    await TagService.softDeleteTag(tagId, req.user?.id);
    res.status(200).json({ message: '标签已删除' });
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({ message: '删除标签失败' });
  }
});

// 恢复软删除标签
router.post('/:tagId/restore', async (req: Request, res: Response) => {
  try {
    const tagId = Number(req.params.tagId);
    if (!Number.isInteger(tagId) || tagId <= 0) {
      return res.status(400).json({ message: '无效的标签ID' });
    }

    await TagService.restoreTag(tagId);
    res.status(200).json({ message: '标签已恢复' });
  } catch (error) {
    console.error('恢复标签失败:', error);
    res.status(500).json({ message: '恢复标签失败' });
  }
});

// 永久删除标签（谨慎操作）
router.delete('/:tagId/permanent', async (req: Request, res: Response) => {
  try {
    const tagId = Number(req.params.tagId);
    if (!Number.isInteger(tagId) || tagId <= 0) {
      return res.status(400).json({ message: '无效的标签ID' });
    }
    await TagService.permanentDeleteTag(tagId);
    res.status(200).json({ message: '标签已永久删除' });
  } catch (error) {
    console.error('永久删除标签失败:', error);
    res.status(500).json({ message: '永久删除标签失败' });
  }
});

// 我的标签统计
router.get('/my-stats', async (req: Request, res: Response) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const stats = await TagService.getMyTagStats(req.user?.id, includeDeleted);
    res.status(200).json(stats);
  } catch (error) {
    console.error('获取标签统计失败:', error);
    res.status(500).json({ message: '获取标签统计失败' });
  }
});

// 清理未使用的个人标签
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const minUsageCount = typeof req.body?.minUsageCount === 'number' ? req.body.minUsageCount : 0;
    const result = await TagService.cleanupUnusedPersonalTags(minUsageCount);
    res.status(200).json(result);
  } catch (error) {
    console.error('清理未使用标签失败:', error);
    res.status(500).json({ message: '清理未使用标签失败' });
  }
});

export default router;

