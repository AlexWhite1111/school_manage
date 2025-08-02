// ecosystem.config.js - PM2 生产环境配置
module.exports = {
  apps: [{
    name: 'education-crm-backend',
    script: './backend/dist/src/server.js',
    cwd: process.cwd(),
    instances: 'max',
    exec_mode: 'cluster',
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // 从.env.production文件加载环境变量
    env_file: './backend/.env.production',
    
    // 日志配置
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // 性能配置
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // 重启策略
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs', 'frontend'],
    restart_delay: 4000,
    min_uptime: '10s',
    max_restarts: 10,
    
    // 健康检查
    health_check_grace_period: 3000,
    
    // 进程监控
    monitoring: {
      http: true,
      https: false,
      port: 3001
    }
  }],

  // 部署配置
  deploy: {
    production: {
      user: 'deployment',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/education-crm.git',
      path: '/var/www/education-crm',
      'post-deploy': 'cd backend && npm install --production && npm run build && npm run prisma:migrate && pm2 reload ecosystem.config.js --env production'
    }
  }
}; 