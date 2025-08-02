// src/api/auth.routes.ts
// 该文件定义了认证模块的路由，例如登录和登出。

import { Router, Request, Response } from 'express';
import { loginUser, registerUser, generateResetToken, resetPassword } from '../services/auth.service';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // 1. 从 req.body 中获取 username 和 password
    const { username, password } = req.body;

    // 输入验证
    if (!username || !password) {
      return res.status(400).json({
        message: '用户名和密码不能为空'
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        message: '用户名和密码必须是字符串'
      });
    }

    // 2. 调用 services/auth.service.ts 中的 loginUser 函数
    const token = await loginUser(username, password);

    // 3. 根据返回的令牌，响应成功 (200) 或失败 (401 Unauthorized)
    if (token) {
      // 登录成功，返回JWT令牌
      res.status(200).json({
        token: token
      });
    } else {
      // 登录失败，用户名或密码错误
      res.status(401).json({
        message: '账号或密码错误'
      });
    }

  } catch (error) {
    console.error('登录路由处理错误:', error);
    res.status(500).json({
      message: '服务器内部错误，请稍后重试'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Public
 */
router.post('/logout', (req: Request, res: Response) => {
  // 登出主要是客户端行为 (删除token)。
  // 如果需要服务端黑名单机制，在此处实现。
  // 目前，直接返回成功。
  
  // 可以在这里记录登出日志
  console.log('用户登出请求');
  
  res.status(200).json({ 
    message: 'Logged out successfully' 
  });
});

/**
 * @route   POST /api/auth/register
 * @desc    注册新用户（仅供超级管理员使用）
 * @access  Private (Super Admin only)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email, phone, role, linkedCustomerId } = req.body;

    // 输入验证
    if (!username || !password || !role) {
      return res.status(400).json({
        message: '用户名、密码和角色不能为空'
      });
    }

    // 密码强度验证
    if (password.length < 6) {
      return res.status(400).json({
        message: '密码长度至少为6个字符'
      });
    }

    // 调用注册服务
    const newUser = await registerUser({
      username,
      password,
      email,
      phone,
      role,
      linkedCustomerId
    });

    if (newUser) {
      res.status(201).json({
        message: '用户注册成功',
        user: newUser
      });
    } else {
      res.status(400).json({
        message: '用户注册失败，用户名或邮箱已存在'
      });
    }

  } catch (error) {
    console.error('注册路由处理错误:', error);
    res.status(500).json({
      message: '服务器内部错误，请稍后重试'
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    请求密码重置
 * @access  Public
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body; // 用户名或邮箱

    if (!identifier) {
      return res.status(400).json({
        message: '请提供用户名或邮箱'
      });
    }

    const resetToken = await generateResetToken(identifier);

    if (resetToken) {
      // 在实际应用中，这里应该发送邮件给用户
      // 现在我们只是返回token（仅用于演示）
      res.status(200).json({
        message: '密码重置邮件已发送',
        resetToken: resetToken // 实际应用中不应该返回token
      });
    } else {
      res.status(404).json({
        message: '未找到匹配的用户'
      });
    }

  } catch (error) {
    console.error('忘记密码路由处理错误:', error);
    res.status(500).json({
      message: '服务器内部错误，请稍后重试'
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    重置密码
 * @access  Public
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        message: '重置令牌和新密码不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: '新密码长度至少为6个字符'
      });
    }

    const isReset = await resetPassword(resetToken, newPassword);

    if (isReset) {
      res.status(200).json({
        message: '密码重置成功'
      });
    } else {
      res.status(400).json({
        message: '无效或已过期的重置令牌'
      });
    }

  } catch (error) {
    console.error('重置密码路由处理错误:', error);
    res.status(500).json({
      message: '服务器内部错误，请稍后重试'
    });
  }
});

export default router; 