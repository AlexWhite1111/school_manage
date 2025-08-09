# 🚀 教育CRM系统部署指南

## 📋 前置要求

### 必须安装
- **Git**: https://git-scm.com/downloads
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/

### 可选安装
- **Node.js**: https://nodejs.org/ (仅开发环境需要)

## 🔧 快速部署步骤

### 1. 克隆项目
```bash
# 克隆仓库
git clone https://github.com/AlexWhite1111/school_manage.git
cd school_manage

# 切换到完整功能分支
git checkout feature-initTODO
```

### 2. 环境配置
```bash
# 复制环境变量文件
cp deploy.env .env

# 如果需要自定义配置，编辑 .env 文件
# notepad .env  # Windows
# nano .env     # Linux/Mac
```

### 3. 一键启动
```bash
# 构建并启动所有服务
docker compose up -d --build

# 等待服务启动完成（约2-3分钟）
docker compose ps
```

### 4. 初始化数据库
```bash
# 运行数据库迁移
docker exec project4-backend npx prisma migrate deploy

# 初始化配置数据
docker exec project4-backend npm run seed:growth-config
docker exec project4-backend npm run seed-admin
docker exec project4-backend npm run seed:config
```

### 5. 访问系统
- **前端应用**: http://localhost:5173
- **管理员账户**: 
  - 用户名: `admin`
  - 密码: `123456`

## 📊 验证部署

### 检查服务状态
```bash
# 查看所有容器状态
docker compose ps

# 应该看到3个健康的容器:
# - project4-db (数据库)
# - project4-backend (后端API)  
# - project4-frontend (前端应用)
```

### 测试连接
```bash
# 测试后端API
curl http://localhost:3000/health

# 应该返回: {"status":"OK",...}
```

## 🔧 配置说明

### 环境变量文件 (.env)
```bash
# 数据库配置
DB_NAME=education_crm
DB_USER=postgres
DB_PASSWORD=229791

# JWT安全密钥
JWT_SECRET=your_very_secure_jwt_secret_key_here

# API配置
VITE_API_BASE_URL=/api

# CORS配置
ALLOWED_ORIGINS=http://localhost:80,http://localhost:5173,http://127.0.0.1:5173
```

## 🎯 系统功能

### 🏠 主要模块
1. **仪表盘**: 数据概览和快速导出
2. **CRM管理**: 客户档案、标签、沟通记录
3. **学生日志**: 成长追踪、考勤管理、班级管理
4. **考试系统**: 考试管理、成绩分析、趋势预测
5. **数据分析**: 多维度统计分析面板
6. **财务管理**: 收支记录、统计报表
7. **用户管理**: 权限控制、角色管理

### 🧠 核心算法
- **卡尔曼滤波器**: 学生成长状态估计和预测
- **趋势分析**: 基于时间序列的发展趋势
- **智能标签**: 权重化的行为评价系统

## 🚨 故障排除

### 常见问题

#### 1. 端口冲突
```bash
# 如果5173端口被占用，修改docker-compose.yml
ports:
  - "5174:80"  # 改为其他端口
```

#### 2. 数据库连接失败
```bash
# 重启数据库容器
docker restart project4-db

# 查看数据库日志
docker logs project4-db
```

#### 3. 前端显示502错误
```bash
# 重启后端服务
docker restart project4-backend

# 检查后端日志
docker logs project4-backend
```

#### 4. 登录失败
```bash
# 重新初始化管理员账户
docker exec project4-backend npm run seed-admin
```

### 完全重置
```bash
# 停止所有服务
docker compose down

# 清理数据卷（注意：会删除所有数据）
docker compose down -v

# 重新启动
docker compose up -d --build
```

## 📱 移动端访问

### 局域网访问
1. 确保防火墙允许端口5173
2. 获取本机IP地址
3. 在移动设备访问: `http://[本机IP]:5173`

### 生产部署
建议使用云服务器部署，配置域名和SSL证书。

## 🛠️ 开发环境

### 本地开发
```bash
# 前端开发
cd frontend
npm install
npm run dev

# 后端开发
cd backend  
npm install
npm run dev
```

### 数据库管理
```bash
# 打开Prisma Studio
docker exec project4-backend npx prisma studio
# 访问: http://localhost:5555
```

## 📧 技术支持

如遇到问题，请提供以下信息：
1. 操作系统版本
2. Docker版本
3. 错误截图/日志
4. 执行的具体命令

---
🎉 **享受使用教育CRM系统！**