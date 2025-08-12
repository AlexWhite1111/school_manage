// src/utils/jwt.ts
// 该文件包含用于生成和验证 JSON Web Tokens (JWT) 的实用函数。

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT密钥，从环境变量获取，如果没有则使用统一的默认值（请在生产环境务必覆盖）
const DEFAULT_JWT_SECRET = 'your_jwt_secret_key';
const JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== ''
  ? process.env.JWT_SECRET
  : DEFAULT_JWT_SECRET;

/**
 * @description 生成一个新的JWT令牌
 * @param payload - 要编码到令牌中的数据 (例如: { userId: number })
 * @returns {string} - 生成的JWT令牌
 */
export const generateToken = (payload: object): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: '8h', // 延长到8小时，支持长时间并发测试
      issuer: 'education-crm' // 签发者
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
  crypto.createHash('sha256').update(JWT_SECRET).digest('hex').slice(0, 12);