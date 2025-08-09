// src/app.ts
// This file exports the configured Express app.
// It is responsible for setting up middleware (CORS, Helmet, JSON parser) and mounting the API routes.

import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './api';
import { dynamicCors, networkInfoMiddleware, detectNetworkType } from './middleware/cors.middleware';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// 网络检测和信息收集
app.use(networkInfoMiddleware);
app.use(detectNetworkType);

// 动态CORS配置（集中在 cors.middleware.ts 使用 cors 包）
app.use(dynamicCors);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Education CRM Backend'
  });
});

// API routes
app.use('/api', apiRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: '文件大小超出限制'
    });
  }
  
  if (err.message === '只允许上传CSV文件') {
    return res.status(400).json({
      message: '只允许上传CSV文件'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : (err.message || '服务器内部错误');

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    message: `路由 ${req.originalUrl} 不存在`
  });
});

export default app; 