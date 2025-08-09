// src/services/tag.service.ts
import { prisma } from '../utils/database';

type TagType =
  | 'FAMILY_JOB'
  | 'FAMILY_INCOME'
  | 'FAMILY_EDUCATION_CONCEPT'
  | 'FAMILY_FOCUS'
  | 'FAMILY_ROLE'
  | 'CHILD_PERSONALITY'
  | 'CHILD_ACADEMIC_LEVEL'
  | 'CHILD_DISCIPLINE'
  | 'GROWTH_POSITIVE'
  | 'GROWTH_NEGATIVE'
  | 'EXAM_POSITIVE'
  | 'EXAM_NEGATIVE';

interface GetTagsParams {
  type?: TagType;
  examTags?: boolean;
  includeDeleted?: boolean;
}

export const getTags = async (params: GetTagsParams = {}) => {
  const where: any = {};

  if (params.type) {
    where.type = params.type;
  } else if (params.examTags) {
    // 仅考试标签
    where.type = { in: ['EXAM_POSITIVE', 'EXAM_NEGATIVE'] };
  }

  if (!params.includeDeleted) {
    where.deletedAt = null;
  }

  const tags = await prisma.tag.findMany({
    where,
    orderBy: [{ usageCount: 'desc' }, { text: 'asc' }]
  });
  return tags;
};

export const createTag = async (data: { text: string; type: TagType; isPersonal?: boolean; createdById?: number }) => {
  const text = data.text.trim();
  if (text.length < 1 || text.length > 50) {
    throw new Error('标签文本长度不合法');
  }

  // 同一类型下文案唯一
  const exists = await prisma.tag.findFirst({ where: { text, type: data.type, deletedAt: null } });
  if (exists) {
    throw new Error('相同类型下的标签名已存在');
  }

  const tag = await prisma.tag.create({
    data: {
      text,
      type: data.type,
      isPredefined: !data.isPersonal,
      isPersonal: Boolean(data.isPersonal),
      createdById: data.createdById || null,
      usageCount: 0
    }
  });
  return tag;
};

export const softDeleteTag = async (tagId: number, deletedById?: number) => {
  await prisma.tag.update({
    where: { id: tagId },
    data: { deletedAt: new Date(), deletedById: deletedById || null }
  });
};

export const restoreTag = async (tagId: number) => {
  await prisma.tag.update({ where: { id: tagId }, data: { deletedAt: null, deletedById: null } });
};

export const permanentDeleteTag = async (tagId: number) => {
  await prisma.tag.delete({ where: { id: tagId } });
};

export const incrementTagUsage = async (tagId: number) => {
  await prisma.tag.update({ where: { id: tagId }, data: { usageCount: { increment: 1 } } });
};

export const decrementTagUsage = async (tagId: number) => {
  await prisma.tag.update({ where: { id: tagId }, data: { usageCount: { decrement: 1 } } });
};

export const cleanupUnusedPersonalTags = async (minUsageCount: number = 0) => {
  const result = await prisma.tag.deleteMany({
    where: {
      isPersonal: true,
      usageCount: { lte: minUsageCount },
      deletedAt: null
    }
  });
  return { deletedCount: result.count };
};

export const getMyTagStats = async (userId?: number, includeDeleted: boolean = false) => {
  const where: any = { createdById: userId || undefined };
  if (!includeDeleted) where.deletedAt = null;
  const tags = await prisma.tag.findMany({ where });

  const byType: Record<string, { count: number; usage: number }> = {};
  for (const t of tags) {
    const key = t.type;
    if (!byType[key]) byType[key] = { count: 0, usage: 0 };
    byType[key].count += 1;
    byType[key].usage += t.usageCount;
  }

  return {
    totalPersonalTags: tags.filter(t => t.isPersonal).length,
    totalUsage: tags.reduce((s, t) => s + t.usageCount, 0),
    deletedCount: includeDeleted ? (await prisma.tag.count({ where: { createdById: userId, deletedAt: { not: null } } })) : undefined,
    byType
  };
};

