// src/middleware/cors.middleware.ts
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// ================================
// CORS配置
// ================================

/**
 * 开发环境CORS配置
 */
const developmentCorsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // 允许所有localhost和本地IP访问
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:5173',  // Vite默认端口
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      // 允许本地局域网IP访问
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/
    ];

    // 开发环境允许undefined origin（比如Postman）
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else {
        return allowedOrigin.test(origin);
      }
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('不允许的CORS来源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  exposedHeaders: ['Content-Disposition'], // 用于文件下载
  maxAge: 86400 // 24小时预检缓存
};

/**
 * 生产环境CORS配置
 */
const productionCorsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // 生产环境必须明确指定允许的源
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('生产环境必须指定Origin'));
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`生产环境CORS拒绝: ${origin}`);
      callback(new Error('不允许的CORS来源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept', 
    'Authorization'
  ],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 3600 // 1小时预检缓存
};

/**
 * 获取CORS配置
 */
export const getCorsOptions = (): cors.CorsOptions => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return productionCorsOptions;
  } else {
    return developmentCorsOptions;
  }
};

/**
 * 动态CORS中间件
 */
export const dynamicCors = cors(getCorsOptions());

/**
 * 网络信息中间件
 */
export const networkInfoMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 记录客户端信息
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    timestamp: new Date().toISOString()
  };
  
  // 添加到请求对象中
  (req as any).clientInfo = clientInfo;
  
  // 开发环境下打印连接信息
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 连接信息: ${clientInfo.ip} -> ${req.method} ${req.path}`);
  }
  
  next();
};

/**
 * 内网访问检测中间件
 */
export const detectNetworkType = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || '';
  
  // 检测是否为内网IP
  const isLocalNetwork = 
    clientIP.startsWith('192.168.') ||
    clientIP.startsWith('10.') ||
    clientIP.startsWith('172.') ||
    clientIP === '127.0.0.1' ||
    clientIP === '::1' ||
    clientIP === 'localhost';
  
  // 添加网络类型标识
  (req as any).isLocalNetwork = isLocalNetwork;
  (req as any).networkType = isLocalNetwork ? 'local' : 'external';
  
  next();
}; 