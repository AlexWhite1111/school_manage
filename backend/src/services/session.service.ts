// src/services/session.service.ts
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ================================
// 类型定义
// ================================

export interface SessionInfo {
  sessionId: string;
  userId: number;
  deviceInfo: {
    userAgent: string;
    ip: string;
    platform?: string;
    browser?: string;
  };
  loginTime: Date;
  lastActiveTime: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface CreateSessionOptions {
  userId: number;
  userAgent: string;
  ip: string;
  rememberMe?: boolean;
}

// ================================
// 会话管理类
// ================================

class SessionManager {
  private readonly MAX_SESSIONS_PER_USER = 5; // 每用户最大会话数
  private readonly SESSION_EXPIRE_HOURS = 24; // 默认会话过期时间（小时）
  private readonly REMEMBER_ME_EXPIRE_DAYS = 30; // 记住我的过期时间（天）
  
  // 内存中的活跃会话缓存
  private activeSessions = new Map<string, SessionInfo>();

  /**
   * 创建新会话
   */
  async createSession(options: CreateSessionOptions): Promise<{
    sessionId: string;
    token: string;
    expiresAt: Date;
  }> {
    const { userId, userAgent, ip, rememberMe = false } = options;
    
    // 生成会话ID
    const sessionId = this.generateSessionId();
    
    // 计算过期时间
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + this.REMEMBER_ME_EXPIRE_DAYS);
    } else {
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_EXPIRE_HOURS);
    }
    
    // 解析设备信息
    const deviceInfo = this.parseUserAgent(userAgent);
    
    // 检查用户现有会话数量
    await this.cleanupExpiredSessions(userId);
    const existingSessions = await this.getUserActiveSessions(userId);
    
    // 如果超过最大会话数，删除最旧的会话
    if (existingSessions.length >= this.MAX_SESSIONS_PER_USER) {
      const oldestSession = existingSessions[existingSessions.length - 1];
      await this.revokeSession(oldestSession.sessionId);
    }
    
    // 创建会话信息
    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      deviceInfo: {
        userAgent,
        ip,
        platform: deviceInfo.platform,
        browser: deviceInfo.browser
      },
      loginTime: new Date(),
      lastActiveTime: new Date(),
      expiresAt,
      isActive: true
    };
    
    // 保存到内存缓存
    this.activeSessions.set(sessionId, sessionInfo);
    
    // 保存到数据库（这里可以扩展为专门的会话表）
    await this.saveSessionToStorage(sessionInfo);
    
    // 生成JWT token
    const token = this.generateJWT(sessionId, userId, expiresAt);
    
    console.log(`✅ 用户 ${userId} 创建新会话: ${sessionId} (${deviceInfo.browser} on ${deviceInfo.platform})`);
    
    return {
      sessionId,
      token,
      expiresAt
    };
  }

  /**
   * 验证会话
   */
  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    // 先从内存缓存查找
    let session = this.activeSessions.get(sessionId);
    
    // 如果内存中没有，从存储中加载
    if (!session) {
      const loadedSession = await this.loadSessionFromStorage(sessionId);
      if (loadedSession) {
        session = loadedSession;
        this.activeSessions.set(sessionId, session);
      }
    }
    
    // 检查会话是否有效
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      if (session) {
        await this.revokeSession(sessionId);
      }
      return null;
    }
    
    // 更新最后活跃时间
    session.lastActiveTime = new Date();
    this.activeSessions.set(sessionId, session);
    
    return session;
  }

  /**
   * 更新会话活跃时间
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActiveTime = new Date();
      this.activeSessions.set(sessionId, session);
      
      // 异步保存到存储
      this.saveSessionToStorage(session).catch(console.error);
    }
  }

  /**
   * 撤销会话
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
      
      await this.removeSessionFromStorage(sessionId);
      
      console.log(`🔐 会话已撤销: ${sessionId}`);
    }
  }

  /**
   * 撤销用户的所有会话（除了当前会话）
   */
  async revokeUserSessions(userId: number, excludeSessionId?: string): Promise<number> {
    const sessions = await this.getUserActiveSessions(userId);
    let revokedCount = 0;
    
    for (const session of sessions) {
      if (excludeSessionId && session.sessionId === excludeSessionId) {
        continue;
      }
      
      await this.revokeSession(session.sessionId);
      revokedCount++;
    }
    
    console.log(`🔐 用户 ${userId} 的 ${revokedCount} 个会话已撤销`);
    return revokedCount;
  }

  /**
   * 获取用户的活跃会话列表
   */
  async getUserActiveSessions(userId: number): Promise<SessionInfo[]> {
    // 从内存缓存获取
    const memorySessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive);
    
    // 从存储获取并合并
    const storageSessions = await this.loadUserSessionsFromStorage(userId);
    
    // 合并并去重
    const sessionMap = new Map<string, SessionInfo>();
    [...memorySessions, ...storageSessions].forEach(session => {
      sessionMap.set(session.sessionId, session);
    });
    
    return Array.from(sessionMap.values())
      .filter(session => session.isActive && session.expiresAt > new Date())
      .sort((a, b) => b.lastActiveTime.getTime() - a.lastActiveTime.getTime());
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(userId?: number): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    
    // 清理内存缓存中的过期会话
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now || (!userId || session.userId === userId)) {
        if (session.expiresAt < now) {
          this.activeSessions.delete(sessionId);
          await this.removeSessionFromStorage(sessionId);
          cleanedCount++;
        }
      }
    }
    
    // 清理存储中的过期会话
    cleanedCount += await this.cleanupStorageExpiredSessions(userId);
    
    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期会话`);
    }
    
    return cleanedCount;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 生成JWT token
   */
  private generateJWT(sessionId: string, userId: number, expiresAt: Date): string {
    const payload = {
      sessionId,
      userId,
      exp: Math.floor(expiresAt.getTime() / 1000)
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret');
  }

  /**
   * 解析User-Agent
   */
  private parseUserAgent(userAgent: string): { platform?: string; browser?: string } {
    const ua = userAgent.toLowerCase();
    
    // 检测平台
    let platform = 'Unknown';
    if (ua.includes('windows')) platform = 'Windows';
    else if (ua.includes('mac')) platform = 'macOS';
    else if (ua.includes('linux')) platform = 'Linux';
    else if (ua.includes('android')) platform = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) platform = 'iOS';
    
    // 检测浏览器
    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';
    
    return { platform, browser };
  }

  // ================================
  // 存储相关方法
  // ================================

  /**
   * 保存会话到存储
   */
  private async saveSessionToStorage(session: SessionInfo): Promise<void> {
    try {
      // 这里可以保存到数据库的sessions表
      // 暂时使用简单的内存存储
      // 在实际项目中，建议创建一个专门的sessions表
    } catch (error) {
      console.error('保存会话到存储失败:', error);
    }
  }

  /**
   * 从存储加载会话
   */
  private async loadSessionFromStorage(sessionId: string): Promise<SessionInfo | null> {
    try {
      // 从数据库加载会话
      // 这里需要实现具体的数据库查询逻辑
      return null;
    } catch (error) {
      console.error('从存储加载会话失败:', error);
      return null;
    }
  }

  /**
   * 从存储加载用户的所有会话
   */
  private async loadUserSessionsFromStorage(userId: number): Promise<SessionInfo[]> {
    try {
      // 从数据库加载用户的所有会话
      return [];
    } catch (error) {
      console.error('从存储加载用户会话失败:', error);
      return [];
    }
  }

  /**
   * 从存储删除会话
   */
  private async removeSessionFromStorage(sessionId: string): Promise<void> {
    try {
      // 从数据库删除会话
    } catch (error) {
      console.error('从存储删除会话失败:', error);
    }
  }

  /**
   * 清理存储中的过期会话
   */
  private async cleanupStorageExpiredSessions(userId?: number): Promise<number> {
    try {
      // 从数据库清理过期会话
      return 0;
    } catch (error) {
      console.error('清理存储过期会话失败:', error);
      return 0;
    }
  }
}

// ================================
// 导出单例
// ================================

export const sessionManager = new SessionManager();

// ================================
// 会话中间件
// ================================

/**
 * 会话验证中间件
 */
export const sessionMiddleware = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }
  
  try {
    // 验证JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    const { sessionId, userId } = payload;
    
    // 验证会话
    const session = await sessionManager.validateSession(sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: '会话已过期或无效'
      });
    }
    
    // 更新会话活跃时间
    await sessionManager.updateSessionActivity(sessionId);
    
    // 添加用户和会话信息到请求对象
    req.user = { id: userId };
    req.session = session;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '认证令牌无效'
    });
  }
}; 