// src/services/auth.service.ts
// 该文件包含用户认证的核心业务逻辑，例如处理登录请求。

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * @description 处理用户登录逻辑
 * @param username - 用户名
 * @param password - 用户密码
 * @returns {Promise<string | null>} - 成功则返回JWT令牌，失败则返回null
 */
export const loginUser = async (username: string, password: string): Promise<string | null> => {
  try {
    // 1. 根据用户名在数据库中查找用户
    const user = await prisma.user.findUnique({
      where: {
        username: username
      }
    });

    // 如果用户不存在，返回null
    if (!user) {
      console.log(`登录失败：用户名 "${username}" 不存在`);
      return null;
    }

    // 2. 如果用户存在，使用 bcrypt.compare 比较密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    // 如果密码不正确，返回null
    if (!isPasswordValid) {
      console.log(`登录失败：用户 "${username}" 密码错误`);
      return null;
    }

    // 3. 如果密码正确，更新最后登录时间并生成令牌
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const token = generateToken(tokenPayload);
    
    console.log(`用户 "${username}" 登录成功`);

    // 4. 返回令牌
    return token;

  } catch (error) {
    console.error('登录处理过程中发生错误:', error);
    return null;
  }
};

/**
 * @description 注册新用户（仅供超级管理员使用）
 * @param userData - 用户数据
 * @returns {Promise<object | null>} - 创建成功返回用户信息，失败返回null
 */
export const registerUser = async (userData: {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  role: UserRole;
  linkedCustomerId?: number;
}): Promise<object | null> => {
  try {
    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: userData.username }
    });

    if (existingUser) {
      console.log(`注册失败：用户名 "${userData.username}" 已存在`);
      return null;
    }

    // 检查邮箱是否已存在
    if (userData.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingEmail) {
        console.log(`注册失败：邮箱 "${userData.email}" 已存在`);
        return null;
      }
    }

    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        username: userData.username,
        passwordHash,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        // linkedCustomerId: userData.linkedCustomerId,
        // mustChangePassword: true  // 新用户首次登录必须修改密码
      }
    });

    console.log(`用户注册成功: ${userData.username} (角色: ${userData.role})`);

    // 返回安全的用户信息（不包含密码）
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;

  } catch (error) {
    console.error('用户注册时发生错误:', error);
    return null;
  }
};

/**
 * @description 生成密码重置令牌
 * @param identifier - 用户名或邮箱
 * @returns {Promise<string | null>} - 成功返回重置令牌，失败返回null
 */
export const generateResetToken = async (identifier: string): Promise<string | null> => {
  try {
    // 查找用户（通过用户名或邮箱）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier }
        ]
      }
    });

    if (!user) {
      console.log(`未找到用户: ${identifier}`);
      return null;
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 更新用户记录
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiresAt
      }
    });

    console.log(`为用户 ${user.username} 生成密码重置令牌`);
    return resetToken;

  } catch (error) {
    console.error('生成密码重置令牌时发生错误:', error);
    return null;
  }
};

/**
 * @description 重置用户密码
 * @param resetToken - 重置令牌
 * @param newPassword - 新密码
 * @returns {Promise<boolean>} - 重置成功返回true，失败返回false
 */
export const resetPassword = async (resetToken: string, newPassword: string): Promise<boolean> => {
  try {
    // 查找拥有有效重置令牌的用户
    const user = await prisma.user.findFirst({
      where: {
        resetToken,
        resetTokenExpiresAt: {
          gt: new Date() // 令牌未过期
        }
      }
    });

    if (!user) {
      console.log('无效或已过期的重置令牌');
      return false;
    }

    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码并清除重置令牌
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
        // mustChangePassword: false
      }
    });

    console.log(`用户 ${user.username} 密码重置成功`);
    return true;

  } catch (error) {
    console.error('重置密码时发生错误:', error);
    return false;
  }
};

/**
 * @description 当客户状态变更为ENROLLED时自动创建学生账号
 * @param customerId - 客户ID
 * @returns {Promise<object | null>} - 创建成功返回用户信息，失败返回null
 */
export const createStudentAccountForCustomer = async (customerId: number): Promise<object | null> => {
  try {
    // 获取客户信息，包含publicId
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { 
        id: true, 
        name: true, 
        publicId: true 
      }
    });

    if (!customer) {
      console.log(`客户 ID ${customerId} 不存在`);
      return null;
    }

    if (!customer.publicId) {
      console.error(`客户 ${customer.name} 缺少学号(publicId)`);
      return null;
    }

    // 检查是否已有关联的学生账号
    const existingUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { username: customer.publicId },
          { linkedCustomerId: customerId }
        ]
      }
    });

    if (existingUser) {
      console.log(`客户 ${customer.name} 已有关联的学生账号`);
      return null;
    }

    // 使用publicId作为用户名
    const username = customer.publicId;

    // 生成默认密码
    const defaultPassword = '123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    // 创建学生账号
    const studentUser = await prisma.user.create({
      data: {
        username,
        displayName: customer.name, // 显示真实姓名
        passwordHash,
        role: UserRole.STUDENT,
        linkedCustomerId: customerId,
        mustChangePassword: true // 首次登录必须修改密码
      }
    });

    console.log(`为客户 ${customer.name} 创建学生账号: ${username} (学号: ${customer.publicId})`);

    // 返回安全的用户信息
    const { passwordHash: _, ...safeUser } = studentUser;
    return safeUser;

  } catch (error) {
    console.error('为客户创建学生账号时发生错误:', error);
    return null;
  }
};

// Logout logic is typically handled on the client-side by deleting the token.
// A server-side logout might be needed for token blacklisting, which can be added here if required. 