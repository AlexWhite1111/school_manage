// src/api/user.routes.ts
// 该文件定义了用户相关操作的路由，例如获取和更新用户个人资料。

import { Router, Request, Response } from 'express';
import { getUserById, updateUserInfo, changePassword, getAllUsers, getUsersByRole, resetUserPasswordToDefault, toggleUserActive, updateUserRole } from '../services/user.service';
import { authMiddleware, superAdminOnly, managerAndAbove } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// 注意：所有在此文件中的路由都应受到认证中间件的保护。
router.use(authMiddleware);

/**
 * @route   GET /api/users/me
 * @desc    获取当前登录用户的信息
 * @access  Private
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.user 中获取 userId (由 authMiddleware 提供)
  const userId = req.user!.id;

    // 2. 调用 services/user.service.ts 中的 getUserById 函数
    const user = await getUserById(userId);

    // 3. 响应成功 (200) 并返回用户信息，或失败 (404 Not Found)
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({
        message: '用户不存在'
      });
    }

  } catch (error) {
    console.error('获取用户信息路由错误:', error);
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    更新当前登录用户的信息
 * @access  Private
 */
router.put('/me', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.user 中获取 userId
  const userId = req.user!.id;
  const requestingUser = req.user!; // 获取请求用户信息

    // 2. 从 req.body 中获取要更新的数据
    const updateData = req.body;

    // 输入验证 - 确保至少有一个字段要更新
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: '请提供要更新的字段'
      });
    }

    // 3. 调用 services/user.service.ts 中的 updateUserInfo 函数，传递请求用户信息
    const updatedUser = await updateUserInfo(userId, updateData, requestingUser);

    // 4. 响应成功 (200) 并返回更新后的用户信息
    if (updatedUser) {
      res.status(200).json(updatedUser);
    } else {
      res.status(400).json({
        message: '用户信息更新失败'
      });
    }

  } catch (error) {
    console.error('更新用户信息路由错误:', error);
    
    // 处理权限错误
    if (error instanceof Error && error.message.includes('权限')) {
      return res.status(403).json({
        message: error.message
      });
    }
    
    // 处理数据库约束错误（如用户名或邮箱重复）
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({
        message: '用户名或邮箱已被使用'
      });
    }
    
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

/**
 * @route   PUT /api/users/me/password
 * @desc    修改当前登录用户的密码
 * @access  Private
 */
router.put('/me/password', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.user 中获取 userId
  const userId = req.user!.id;

    // 2. 从 req.body 中获取 oldPassword 和 newPassword
    const { oldPassword, newPassword } = req.body;

    // 输入验证
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: '旧密码和新密码不能为空'
      });
    }

    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({
        message: '密码必须是字符串'
      });
    }

    // 密码强度基本验证
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: '新密码长度至少为6个字符'
      });
    }

    // 3. 调用 services/user.service.ts 中的 changePassword 函数
    const isPasswordChanged = await changePassword(userId, oldPassword, newPassword);

    // 4. 根据操作结果响应成功 (204 No Content) 或失败 (400 Bad Request)
    if (isPasswordChanged) {
      // 密码修改成功，返回 204 No Content
      res.status(204).send();
    } else {
      // 密码修改失败，通常是旧密码错误
      res.status(400).json({
        message: '旧密码错误'
      });
    }

  } catch (error) {
    console.error('修改密码路由错误:', error);
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    获取所有用户列表（仅供超级管理员）
 * @access  Private (Super Admin only)
 */
router.get('/', superAdminOnly, async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('获取用户列表路由错误:', error);
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

/**
 * @route   GET /api/users/role/:role
 * @desc    根据角色获取用户列表
 * @access  Private (Manager and above)
 */
router.get('/role/:role', managerAndAbove, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    
    // 验证角色参数
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return res.status(400).json({
        message: '无效的用户角色'
      });
    }

    const users = await getUsersByRole(role as UserRole);
    res.status(200).json(users);
  } catch (error) {
    console.error('根据角色获取用户列表路由错误:', error);
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

/**
 * @route   PUT /api/users/:id/reset-password
 * @desc    重置用户密码为默认密码（仅供超级管理员）
 * @access  Private (Super Admin only)
 */
router.put('/:id/reset-password', superAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        message: '无效的用户ID'
      });
    }

    const isReset = await resetUserPasswordToDefault(userId);
    
    if (isReset) {
      res.status(200).json({
        message: '用户密码已重置为默认密码'
      });
    } else {
      res.status(400).json({
        message: '密码重置失败'
      });
    }
  } catch (error) {
    console.error('重置用户密码路由错误:', error);
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

/**
 * @route   PUT /api/users/:id/toggle-active
 * @desc    激活或停用用户账号（仅供超级管理员）
 * @access  Private (Super Admin only)
 */
router.put('/:id/toggle-active', superAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        message: '无效的用户ID'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: '激活状态必须是布尔值'
      });
    }

    const updatedUser = await toggleUserActive(userId, isActive);
    
    if (updatedUser) {
      res.status(200).json({
        message: `用户账号已${isActive ? '激活' : '停用'}`,
        user: updatedUser
      });
    } else {
      res.status(400).json({
        message: '更新用户激活状态失败'
      });
    }
  } catch (error) {
    console.error('更新用户激活状态路由错误:', error);
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    更新用户角色（仅供超级管理员）
 * @access  Private (Super Admin only)
 */
router.put('/:id/role', superAdminOnly, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        message: '无效的用户ID'
      });
    }

    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        message: '无效的用户角色'
      });
    }

    const updatedUser = await updateUserRole(userId, role);
    
    if (updatedUser) {
      res.status(200).json({
        message: '用户角色更新成功',
        user: updatedUser
      });
    } else {
      res.status(400).json({
        message: '用户角色更新失败'
      });
    }
  } catch (error) {
    console.error('更新用户角色路由错误:', error);
    res.status(500).json({
      message: '服务器内部错误'
    });
  }
});

export default router; 