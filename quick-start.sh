#!/bin/bash

# Project4 快速启动脚本
# 适用于开发和测试环境

echo "🚀 Project4 快速启动..."

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 请先安装 Docker Compose"
    exit 1
fi

# 创建简化的环境文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境配置文件..."
    cat > .env << EOF
# 数据库配置
DB_NAME=project4_db
DB_USER=postgres
DB_PASSWORD=devpassword123

# JWT密钥
JWT_SECRET=dev_jwt_secret_key_123

# API配置
VITE_API_BASE_URL=http://localhost:3000

# 开发环境端口
FRONTEND_PORT=5173
BACKEND_PORT=3000
DB_PORT=5432
EOF
fi

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose down 2>/dev/null

# 启动核心服务（不包括nginx代理）
echo "🔨 启动核心服务..."
docker-compose up -d database backend frontend

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 20

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 显示访问信息
echo ""
echo "✅ 快速启动完成！"
echo ""
echo "📱 访问地址:"
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3000"
echo ""
echo "🛠️ 常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo ""