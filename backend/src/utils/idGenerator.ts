import { prisma } from './database';

/**
 * 生成学号格式的publicId：年月+5位随机数
 * 格式：20250112345
 */
export const generatePublicId = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearMonth = year + month;
  
  // 生成5位随机数（00000-99999）
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  return `${yearMonth}${randomNum}`;
};

/**
 * 生成唯一的publicId，确保在数据库中不重复
 */
export const generateUniquePublicId = async (): Promise<string> => {
  let publicId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100; // 最大尝试次数，避免无限循环
  
  while (!isUnique && attempts < maxAttempts) {
    publicId = generatePublicId();
    
    // 检查数据库中是否已存在
    const existing = await prisma.customer.findUnique({
      where: { publicId }
    });
    
    isUnique = !existing;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('无法生成唯一的学号，请稍后重试');
  }
  
  return publicId!;
};