#!/bin/bash

# Project4 部署脚本
echo "🚀 开始部署 Project4..."

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

# 加载环境变量
if [ -f "deploy.env" ]; then
    echo -e "${YELLOW}📋 加载环境配置...${NC}"
    export $(grep -v '^#' deploy.env | xargs)
else
    echo -e "${RED}❌ 未找到 deploy.env 文件${NC}"
    exit 1
fi

# 停止现有容器
echo -e "${YELLOW}🛑 停止现有容器...${NC}"
docker-compose down

# 清理旧镜像（可选）
read -p "是否要清理旧的Docker镜像？[y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 清理旧镜像...${NC}"
    docker system prune -f
    docker image prune -f
fi

# 构建并启动服务
echo -e "${YELLOW}🔨 构建并启动服务...${NC}"
docker-compose --env-file deploy.env up --build -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 30

# 检查服务状态
echo -e "${YELLOW}🔍 检查服务状态...${NC}"
docker-compose ps

# 显示服务健康状态
echo -e "\n${GREEN}✅ 服务健康检查:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查后端健康状态
if curl -f http://localhost:3000/health &> /dev/null; then
    echo -e "后端服务: ${GREEN}✅ 健康${NC} (http://localhost:3000)"
else
    echo -e "后端服务: ${RED}❌ 不健康${NC}"
fi

# 检查前端健康状态
if curl -f http://localhost:5173/health &> /dev/null; then
    echo -e "前端服务: ${GREEN}✅ 健康${NC} (http://localhost:5173)"
else
    echo -e "前端服务: ${RED}❌ 不健康${NC}"
fi

# 检查数据库连接
if docker-compose exec -T database pg_isready -U postgres &> /dev/null; then
    echo -e "数据库: ${GREEN}✅ 健康${NC}"
else
    echo -e "数据库: ${RED}❌ 不健康${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 显示访问信息
echo -e "\n${GREEN}🎉 部署完成！${NC}"
echo -e "\n${YELLOW}📱 访问信息:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "前端应用: ${GREEN}http://localhost:5173${NC}"
echo -e "后端API:  ${GREEN}http://localhost:3000${NC}"
echo -e "统一入口: ${GREEN}http://localhost:80${NC} (通过Nginx代理)"
echo -e "数据库:   ${GREEN}postgresql://localhost:5432${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 显示网络配置信息
echo -e "\n${YELLOW}🌐 网络配置:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "要让外部网络访问，请："
echo "1. 确保服务器防火墙开放端口: 80, 3000, 5173"
echo "2. 如果在云服务器上，配置安全组规则"
echo "3. 修改 deploy.env 中的 VITE_API_BASE_URL 为实际服务器IP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 显示常用命令
echo -e "\n${YELLOW}🛠️  常用命令:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "查看日志: docker-compose logs -f [service_name]"
echo "重启服务: docker-compose restart [service_name]"
echo "停止服务: docker-compose down"
echo "进入容器: docker-compose exec [service_name] sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"