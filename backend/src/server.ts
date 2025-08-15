// src/server.ts
// This is the main entry point for the Express application.
// It initializes the Express app, sets up middleware, and starts the server.

import app from './app';
import { prisma } from './utils/database';
import { networkInterfaces } from 'os';
import { getJwtSecretFingerprint, isUsingDefaultJwtSecret } from './utils/jwt';


// Get port from environment or default to 3000 (标准配置)
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0'; // 监听所有网络接口，支持内网访问

// Function to get local network IP addresses
function getNetworkIPs() {
  const nets = networkInterfaces();
  const ips: string[] = [];
  
  for (const name of Object.keys(nets)) {
    const netInterface = nets[name];
    if (!netInterface) continue;
    
    for (const net of netInterface) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  
  return ips;
}

// Function to test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Please check your DATABASE_URL in .env file');
    process.exit(1);
  }
}

// Function to start the server
async function startServer() {
  try {
    // Test database connection first
    await testDatabaseConnection();
    
    // Start the HTTP server
    const server = app.listen(PORT, HOST, () => {
      const networkIPs = getNetworkIPs();
      const primaryIP = networkIPs[0] || 'localhost';
      
      console.log('🚀 Education CRM Backend Server Started');
      console.log(`📍 Server is running on http://${HOST}:${PORT}`);
      console.log(`🏠 Local access: http://localhost:${PORT}`);
      console.log(`🔐 JWT Secret FP: ${getJwtSecretFingerprint()}${isUsingDefaultJwtSecret() ? ' (DEFAULT!)' : ''}`);
      console.log(`⏱️  JWT Access TTL: ${process.env.JWT_EXPIRES_IN || '7d'}`);
      
      // Display all available network IPs
      if (networkIPs.length > 0) {
        console.log('🌐 Network access:');
        networkIPs.forEach((ip, index) => {
          const prefix = index === 0 ? '   🎯 主要地址' : '   📍 备用地址';
          console.log(`${prefix}: http://${ip}:${PORT}`);
        });
        console.log(`🏥 Health check: http://${primaryIP}:${PORT}/health`);
        console.log(`📚 API endpoints: http://${primaryIP}:${PORT}/api`);
      } else {
        console.log('⚠️  No network interfaces found, only localhost available');
      }
      
      console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('---------------------------------------------------');
      console.log('📱 移动设备访问 (确保在同一WiFi网络):');
      if (networkIPs.length > 0) {
        console.log(`   🎨 前端界面: http://${primaryIP}:5173+ (自动选择端口)`);
        console.log(`   🔧 后端API: http://${primaryIP}:${PORT}/api`);
        console.log(`   ❤️  健康检查: http://${primaryIP}:${PORT}/health`);
        console.log('💡 生成二维码访问:');
        console.log(`   前端地址: 查看前端启动日志获取实际端口`);
        console.log('   💡 注意：前端会自动选择可用端口(5173/5174/5175等)');
      } else {
        console.log(`   仅本机访问: 查看前端启动日志获取实际端口`);
      }
      console.log('---------------------------------------------------');
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('📴 HTTP server closed');
        
        try {
          await prisma.$disconnect();
          console.log('🔌 Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during database disconnection:', error);
          process.exit(1);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forcefully shutting down after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 