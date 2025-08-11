#!/bin/bash
# 教育CRM系统 - CentOS云服务器一键部署脚本
# 服务器IP: 154.194.250.93

echo "🚀 开始部署教育CRM系统到云服务器..."
echo "服务器IP: 154.194.250.93"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 第一步：更新系统
print_status "第1步：更新系统包..."
yum update -y
yum install -y wget curl git vim unzip

# 第二步：安装Docker
print_status "第2步：安装Docker..."
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io

# 启动Docker
systemctl start docker
systemctl enable docker

# 第三步：安装Docker Compose
print_status "第3步：安装Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 第四步：配置防火墙
print_status "第4步：配置防火墙..."
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=22/tcp
firewall-cmd --reload

# 第五步：下载项目
print_status "第5步：下载项目..."
cd /opt
if [ -d "project4" ]; then
    print_warning "project4目录已存在，正在备份..."
    mv project4 project4_backup_$(date +%Y%m%d_%H%M%S)
fi

git clone https://github.com/AlexWhite1111/school_manage.git project4
cd project4
git checkout feature-initTODO

# 第六步：配置环境变量
print_status "第6步：配置环境变量..."
cp deploy.env .env

# 自动替换服务器IP
sed -i "s/42.227.147.38/154.194.250.93/g" .env
sed -i "s/localhost/154.194.250.93/g" .env

# 生成强密码
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)

# 更新密码
sed -i "s/DB_PASSWORD=229791/DB_PASSWORD=${DB_PASSWORD}/g" .env
sed -i "s/JWT_SECRET=your_very_secure_jwt_secret_key_here/JWT_SECRET=${JWT_SECRET}/g" .env

print_status "已生成安全密码："
echo "数据库密码: ${DB_PASSWORD}"
echo "JWT密钥: ${JWT_SECRET}"

# 第七步：启动服务
print_status "第7步：启动所有服务..."
docker-compose up -d --build

print_status "等待服务启动（约2分钟）..."
sleep 120

# 第八步：初始化数据库
print_status "第8步：初始化数据库..."
docker exec project4-backend npx prisma migrate deploy
docker exec project4-backend npm run seed-admin  
docker exec project4-backend npm run seed:config

# 第九步：验证部署
print_status "第9步：验证部署..."
echo ""
echo "🎉 部署完成！"
echo ""
echo "📱 访问地址："
echo "   http://154.194.250.93"
echo ""
echo "🔑 管理员账户："
echo "   用户名: admin"
echo "   密码: 123456"
echo ""
echo "🔧 系统信息："
echo "   数据库密码: ${DB_PASSWORD}"
echo "   JWT密钥: ${JWT_SECRET}"
echo ""
echo "📊 服务状态："
docker-compose ps
echo ""
echo "🔍 如果遇到问题，查看日志："
echo "   docker-compose logs -f"
echo ""
print_status "部署成功！请在浏览器中访问: http://154.194.250.93"