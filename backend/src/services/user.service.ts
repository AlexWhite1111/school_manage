// src/services/user.service.ts
// 该文件包含用户管理的业务逻辑，例如获取和更新用户个人资料。

import { User, UserRole } from '@prisma/client';
import { prisma } from '../utils/database';
import bcrypt from 'bcryptjs';


// 定义一个不包含密码哈希的用户类型，用于安全地返回给前端
type SafeUser = Omit<User, 'passwordHash'>;

/**
 * @description 根据用户ID获取用户信息
 * @param userId - 用户的唯一标识符
 * @returns {Promise<SafeUser | null>} - 返回不含密码的用户对象，如果找不到则返回null
 */
export const getUserById = async (userId: number): Promise<SafeUser | null> => {
  try {
    // 1. 使用 prisma.user.findUnique 查找用户
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    // 如果用户不存在，返回null
    if (!user) {
      console.log(`用户ID ${userId} 不存在`);
      return null;
    }

    // 2. 如果找到用户，删除其 passwordHash 字段
    const { passwordHash, ...safeUser } = user;

    // 3. 返回处理后的用户对象
    return safeUser;

  } catch (error) {
    console.error('获取用户信息时发生错误:', error);
    return null;
  }
};

/**
 * @description 更新用户信息（用户名、昵称、手机、邮箱等）
 * @param userId - 要更新的用户的ID
 * @param data - 包含要更新字段的对象 (例如: { username?: string; displayName?: string; phone?: string; email?: string; })
 * @param requestingUser - 发起请求的用户（用于权限检查）
 * @returns {Promise<SafeUser | null>} - 返回更新后的、不含密码的用户对象
 */
export const updateUserInfo = async (userId: number, data: Partial<User>, requestingUser?: { id: number; role?: UserRole }): Promise<SafeUser | null> => {
  try {
    // 过滤掉不应该通过此函数更新的字段
    const { passwordHash, id, createdAt, role, isActive, ...allowedUpdates } = data;

    // 权限检查：只有超级管理员可以修改用户名
    if (allowedUpdates.username && requestingUser) {
      if (requestingUser.role !== 'SUPER_ADMIN' && requestingUser.id !== userId) {
        throw new Error('只有超级管理员可以修改其他用户的用户名');
      }
      if (requestingUser.role !== 'SUPER_ADMIN' && requestingUser.id === userId) {
        // 普通用户不能修改自己的用户名
        delete allowedUpdates.username;
      }
    }

    // 1. 使用 prisma.user.update 更新用户信息
    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: allowedUpdates
    });

    // 2. 删除返回对象中的 passwordHash 字段
    const { passwordHash: _, ...safeUser } = updatedUser;

    // 3. 返回更新后的用户对象
    console.log(`用户ID ${userId} 的信息已更新`);
    return safeUser;

  } catch (error) {
    console.error('更新用户信息时发生错误:', error);
    return null;
  }
};

/**
 * @description 修改用户密码
 * @param userId - 要修改密码的用户的ID
 * @param oldPassword - 用户的当前密码
 * @param newPassword - 用户的新密码
 * @returns {Promise<boolean>} - 密码修改成功返回true，失败（如旧密码错误）返回false
 */
export const changePassword = async (userId: number, oldPassword: string, newPassword: string): Promise<boolean> => {
  try {
    // 1. 根据 userId 查找用户及其 passwordHash
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) {
      console.log(`密码修改失败：用户ID ${userId} 不存在`);
      return false;
    }

    // 2. 使用 bcrypt.compare 验证 oldPassword 是否正确
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      console.log(`密码修改失败：用户ID ${userId} 的旧密码错误`);
      return false;
    }

    // 3. 如果验证通过，使用 bcrypt.hash 对 newPassword 进行加密
    const saltRounds = 12; // 加密强度
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 4. 使用 prisma.user.update 更新数据库中的 passwordHash
    await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        passwordHash: newPasswordHash
      }
    });

    console.log(`用户ID ${userId} 的密码已成功修改`);
    
    // 5. 返回操作结果 (true/false)
    return true;

  } catch (error) {
    console.error('修改密码时发生错误:', error);
    return false;
  }
}; 

/**
 * @description 获取所有用户列表（仅供超级管理员使用）
 * @returns {Promise<SafeUser[]>} - 返回所有用户信息（不含密码）
 */
export const getAllUsers = async (): Promise<SafeUser[]> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 移除密码字段
    const safeUsers = users.map(user => {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    });

    return safeUsers;

  } catch (error) {
    console.error('获取用户列表时发生错误:', error);
    return [];
  }
};

/**
 * @description 根据角色获取用户列表
 * @param role - 用户角色
 * @returns {Promise<SafeUser[]>} - 返回指定角色的用户信息
 */
export const getUsersByRole = async (role: UserRole): Promise<SafeUser[]> => {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const safeUsers = users.map(user => {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    });

    return safeUsers;

  } catch (error) {
    console.error(`获取角色为${role}的用户列表时发生错误:`, error);
    return [];
  }
};

/**
 * @description 重置用户密码为默认密码（仅供超级管理员使用）
 * @param userId - 用户ID
 * @returns {Promise<boolean>} - 重置成功返回true
 */
export const resetUserPasswordToDefault = async (userId: number): Promise<boolean> => {
  try {
    const defaultPassword = '123456';
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(defaultPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiresAt: null
      }
    });

    console.log(`用户ID ${userId} 的密码已重置为默认密码`);
    return true;

  } catch (error) {
    console.error('重置用户密码时发生错误:', error);
    return false;
  }
};

/**
 * @description 激活或停用用户账号
 * @param userId - 用户ID
 * @param isActive - 激活状态
 * @returns {Promise<SafeUser | null>} - 返回更新后的用户信息
 */
export const toggleUserActive = async (userId: number, isActive: boolean): Promise<SafeUser | null> => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });

    const { passwordHash, ...safeUser } = updatedUser;
    console.log(`用户ID ${userId} 的激活状态已更新为: ${isActive}`);
    return safeUser;

  } catch (error) {
    console.error('更新用户激活状态时发生错误:', error);
    return null;
  }
};

/**
 * @description 更新用户角色（仅供超级管理员使用）
 * @param userId - 用户ID  
 * @param newRole - 新角色
 * @returns {Promise<SafeUser | null>} - 返回更新后的用户信息
 */
export const updateUserRole = async (userId: number, newRole: UserRole): Promise<SafeUser | null> => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });

    const { passwordHash, ...safeUser } = updatedUser;
    console.log(`用户ID ${userId} 的角色已更新为: ${newRole}`);
    return safeUser;

  } catch (error) {
    console.error('更新用户角色时发生错误:', error);
    return null;
  }
}; 