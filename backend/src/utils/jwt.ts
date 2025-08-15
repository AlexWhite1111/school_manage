// src/utils/jwt.ts
// 该文件包含用于生成和验证 JSON Web Tokens (JWT) 的实用函数。

import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

// JWT密钥，从环境变量获取，如果没有则使用统一的默认值（请在生产环境务必覆盖）
const DEFAULT_JWT_SECRET = 'your_jwt_secret_key';
// 保证类型为 string，避免 TS 选择错误的重载
const JWT_SECRET: Secret = (process.env.JWT_SECRET?.trim() || DEFAULT_JWT_SECRET) as Secret;

/**
 * @description 生成一个新的JWT令牌
 * @param payload - 要编码到令牌中的数据 (例如: { userId: number })
 * @returns {string} - 生成的JWT令牌
 */
export const generateToken = (payload: object): string => {
  try {
    // 支持通过环境变量配置访问令牌有效期，默认 7d（一周）
    // 兼容旧配置：如果未设置则回退为 7d；可设置如 '8h'、'24h'、'7d'
    const accessTtl = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
    return jwt.sign(payload as any, JWT_SECRET, {
      expiresIn: accessTtl,
      issuer: 'education-crm'
    });
  } catch (error) {
    console.error('生成JWT令牌时出错:', error);
    throw new Error('无法生成认证令牌');
  }
};

/**
 * @description 验证一个JWT令牌
 * @param token - 从客户端接收到的JWT令牌字符串
 * @returns {object | null} - 解码后的数据负载或null（如果验证失败）
 */
export const verifyToken = (token: string): any | null => {
  try {
    // 验证并解码令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    // 令牌无效、过期或损坏
    console.error('JWT令牌验证失败:', error);
    return null;
  }
}; 

/**
 * 返回当前JWT密钥是否为默认值（生产环境应避免）
 */
export const isUsingDefaultJwtSecret = (): boolean => JWT_SECRET === DEFAULT_JWT_SECRET;

/**
 * 返回JWT密钥的指纹（sha256前12位），便于跨机器对比而不暴露密钥
 */
export const getJwtSecretFingerprint = (): string =>
  crypto.createHash('sha256').update(String(JWT_SECRET)).digest('hex').slice(0, 12);

// ===== Refresh Token 支持 =====
const ACCESS_TTL_DEFAULT = '7d';
const REFRESH_TTL_DEFAULT = '30d';
const ACCESS_TTL = (process.env.JWT_EXPIRES_IN || ACCESS_TTL_DEFAULT) as SignOptions['expiresIn'];
const REFRESH_TTL = (process.env.JWT_REFRESH_EXPIRES_IN || REFRESH_TTL_DEFAULT) as SignOptions['expiresIn'];

type TokenPayload = Record<string, any> & { tokenType?: 'access' | 'refresh' };

export const generateAccessToken = (payload: object): string =>
  jwt.sign({ ...(payload as object), tokenType: 'access' } as TokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TTL,
    issuer: 'education-crm'
  } as SignOptions);

export const generateRefreshToken = (payload: object): string =>
  jwt.sign({ ...(payload as object), tokenType: 'refresh' } as TokenPayload, JWT_SECRET, {
    expiresIn: REFRESH_TTL,
    issuer: 'education-crm'
  } as SignOptions);

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  const decoded = verifyToken(token);
  if (decoded && decoded.tokenType === 'refresh') return decoded;
  return null;
};