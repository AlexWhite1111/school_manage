#!/bin/bash
# 低配服务器轻量化部署脚本
# 适合 2核1GHz 1GB内存 的服务器

echo "🚀 开始低配服务器轻量化部署..."

# 系统优化
echo "📊 优化系统参数..."
# 减少系统缓存占用
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
echo 'net.core.somaxconn=1024' >> /etc/sysctl.conf
sysctl -p

# 基础环境
echo "🔧 安装基础环境..."
apt update && apt upgrade -y
apt install -y curl wget git vim screen htop

# Docker轻量化安装
echo "🐳 安装Docker（轻量化）..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker优化配置
echo "⚙️ 优化Docker配置..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "memlock": {
      "Hard": 67108864,
      "Name": "memlock",
      "Soft": 67108864
    }
  }
}
EOF

systemctl restart docker
systemctl enable docker

# 安装Docker Compose
echo "📦 安装Docker Compose..."
apt install -y docker-compose-plugin

# 防火墙配置
echo "🛡️ 配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable

# 下载项目
echo "📥 下载项目..."
cd /opt
git clone https://github.com/AlexWhite1111/school_manage.git project4
cd project4
git checkout feature-initTODO

# 使用轻量化配置
echo "⚡ 配置轻量化环境..."
cp deploy.env .env
sed -i 's/42.227.147.38/154.194.250.93/g' .env
sed -i 's/localhost/154.194.250.93/g' .env

# 替换为轻量化docker-compose文件
cp docker-compose.yml docker-compose.yml.backup
# 这里需要您手动复制我提供的lightweight-docker-compose.yml内容

# 启动服务
echo "🚀 启动轻量化服务..."
docker compose -f lightweight-docker-compose.yml up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 120

# 检查服务状态
echo "📊 检查服务状态..."
docker compose -f lightweight-docker-compose.yml ps

# 初始化数据库
echo "🗄️ 初始化数据库..."
sleep 30
docker exec project4-backend-lite npx prisma migrate deploy
docker exec project4-backend-lite npm run seed-admin
docker exec project4-backend-lite npm run seed:config

echo "🎉 轻量化部署完成！"
echo "访问地址: http://154.194.250.93"
echo "管理员: admin / 123456"

# 显示资源使用情况
echo "📈 当前资源使用："
docker stats --no-stream
free -h
df -h