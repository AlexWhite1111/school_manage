// src/middleware/auth.middleware.ts
// 该文件定义了用于保护私有路由的认证中间件。

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRole } from '@prisma/client';

// 为Express的Request对象扩展一个可选的user属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role?: UserRole;
      };
    }
  }
}

// 导出带有用户信息的Request类型
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role?: UserRole;
  };
}

/**
 * @description 认证中间件，用于校验JWT令牌
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 从请求头 (Authorization header) 中获取 "Bearer <token>"
    const authHeader = req.headers.authorization;
    
    // 2. 验证 "Bearer " 前缀是否存在，并提取令牌
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: '未提供有效的认证令牌' 
      });
    }
    
    // 提取令牌（去掉 "Bearer " 前缀）
    const token = authHeader.substring(7);
    
    // 3. 如果令牌为空，返回 401 Unauthorized
    if (!token) {
      return res.status(401).json({ 
        message: '认证令牌不能为空' 
      });
    }
    
    // 4. 调用 utils/jwt.ts 中的 verifyToken 函数来验证令牌
    const payload = verifyToken(token);
    
    // 7. 如果验证失败，返回 401 Unauthorized
    if (!payload) {
      return res.status(401).json({ 
        message: '无效或已过期的认证令牌' 
      });
    }
    
    // 5. 如果验证成功，将解码后的用户信息 (payload) 挂载到 req.user 上
    req.user = { 
      id: payload.userId || payload.id 
    };
    
    // 6. 调用 next() 将控制权传递给下一个中间件或路由处理器
    next();
    
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(403).json({ 
      message: '认证失败，访问被拒绝' 
    });
  }
}; 

/**
 * @description 基于角色的权限控制中间件
 * @param allowedRoles - 允许访问的角色数组
 * @returns Express中间件函数
 */
export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 确保已经通过认证中间件
      if (!req.user) {
        return res.status(401).json({
          message: '未认证的请求'
        });
      }

      // 从token payload中获取用户角色
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          message: '无效的认证格式'
        });
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (!payload || !payload.role) {
        return res.status(401).json({
          message: '无效的认证令牌或缺少角色信息'
        });
      }

      // 检查用户角色是否在允许的角色列表中
      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({
          message: '权限不足，无法访问该资源'
        });
      }

      // 将用户角色添加到请求对象中
      if (req.user) {
        req.user.role = payload.role;
      }
      next();

    } catch (error) {
      console.error('权限检查中间件错误:', error);
      return res.status(403).json({
        message: '权限验证失败'
      });
    }
  };
};

/**
 * @description 超级管理员权限中间件
 */
export const superAdminOnly = roleMiddleware([UserRole.SUPER_ADMIN]);

/**
 * @description 管理员及以上权限中间件
 */
export const managerAndAbove = roleMiddleware([UserRole.SUPER_ADMIN, UserRole.MANAGER]);

/**
 * @description 教师及以上权限中间件
 */
export const teacherAndAbove = roleMiddleware([UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEACHER]);

/**
 * @description 仅学生权限中间件
 */
export const studentOnly = roleMiddleware([UserRole.STUDENT]); 