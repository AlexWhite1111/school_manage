# 🚀 教育CRM系统部署指南

本指南将详细介绍如何将教育CRM系统部署到生产环境，包括Linux和Windows Server两种环境。

## 📋 目录

1. [系统架构概览](#系统架构概览)
2. [环境要求](#环境要求)
3. [Linux部署 (推荐)](#linux部署)
4. [Windows Server部署](#windows-server部署)
5. [Docker容器化部署](#docker容器化部署)
6. [环境一致性保证](#环境一致性保证)
7. [一键部署脚本](#一键部署脚本)
8. [监控和维护](#监控和维护)

## 🏗️ 系统架构概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (React)   │────│   Nginx 反向代理  │────│  后端 (Node.js)  │
│   Port: 80/443  │    │   Port: 80/443   │    │   Port: 3001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                              ┌─────────────────┐
                                              │  PostgreSQL DB  │
                                              │   Port: 5432    │
                                              └─────────────────┘
```

### 核心组件
- **前端**: React + TypeScript + Ant Design
- **后端**: Node.js + Express + Prisma ORM
- **数据库**: PostgreSQL
- **Web服务器**: Nginx (反向代理 + 静态文件)
- **进程管理**: PM2
- **SSL/TLS**: Let's Encrypt (免费证书)

## 💻 环境要求

### 最低配置
```yaml
CPU: 2核心
内存: 4GB RAM
存储: 50GB SSD
网络: 10Mbps 带宽
操作系统: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
```

### 推荐配置
```yaml
CPU: 4核心
内存: 8GB RAM
存储: 100GB SSD
网络: 100Mbps 带宽
```

### 软件依赖
```yaml
Node.js: 18.x 或更高
PostgreSQL: 12.x 或更高
Nginx: 1.18+ (Linux) / IIS (Windows)
PM2: 最新版本
Git: 最新版本
```

## 🐧 Linux部署 (推荐)

### 1. 系统初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git unzip software-properties-common

# 创建部署用户
sudo adduser deployment
sudo usermod -aG sudo deployment
sudo su - deployment
```

### 2. 安装Node.js

```bash
# 使用NodeSource仓库安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version   # 应该显示 9.x.x 或更高

# 安装PM2全局
sudo npm install -g pm2
```

### 3. 安装PostgreSQL

```bash
# 安装PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 启动并启用服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE DATABASE education_crm_prod;
CREATE USER crm_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE education_crm_prod TO crm_user;
ALTER USER crm_user CREATEDB;
\q
EOF

# 配置PostgreSQL连接
sudo vim /etc/postgresql/*/main/pg_hba.conf
# 添加行: local   education_crm_prod    crm_user                md5

sudo systemctl restart postgresql
```

### 4. 安装Nginx

```bash
# 安装Nginx
sudo apt install -y nginx

# 启动并启用服务
sudo systemctl start nginx
sudo systemctl enable nginx

# 创建站点配置目录
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

### 5. 部署应用代码

```bash
# 创建应用目录
sudo mkdir -p /var/www/education-crm
sudo chown -R deployment:deployment /var/www/education-crm

# 克隆代码 (或上传代码包)
cd /var/www/education-crm
git clone <your-repository-url> .

# 或者从本地上传
# scp -r ./Project4/* deployment@your-server:/var/www/education-crm/
```

### 6. 配置后端

```bash
cd /var/www/education-crm/backend

# 安装依赖
npm install --production

# 创建生产环境配置
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
HOST=127.0.0.1

# 数据库配置
DATABASE_URL="postgresql://crm_user:your_secure_password_here@localhost:5432/education_crm_prod"

# 安全配置
JWT_SECRET=$(openssl rand -hex 32)

# CORS配置
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/education-crm/uploads

# 日志配置
LOG_LEVEL=warn
LOG_FILE=/var/log/education-crm/app.log
EOF

# 设置环境文件权限
chmod 600 .env.production

# 构建应用
npm run build

# 运行数据库迁移
npm run prisma:migrate

# 初始化数据库 (生产环境)
npm run db:init

# 创建日志目录
sudo mkdir -p /var/log/education-crm
sudo chown deployment:deployment /var/log/education-crm
```

### 7. 配置前端

```bash
cd /var/www/education-crm/frontend

# 安装依赖
npm install

# 创建生产环境配置
cat > .env.production << EOF
VITE_API_BASE_URL=https://api.your-domain.com/api
VITE_APP_TITLE=教育CRM系统
VITE_NODE_ENV=production
EOF

# 构建前端
npm run build

# 移动构建文件到Nginx目录
sudo mkdir -p /var/www/html/education-crm
sudo cp -r dist/* /var/www/html/education-crm/
sudo chown -R www-data:www-data /var/www/html/education-crm
```

### 8. 配置Nginx

```bash
# 创建站点配置
sudo tee /etc/nginx/sites-available/education-crm << 'EOF'
# 前端配置
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL证书路径 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 前端静态文件
    root /var/www/html/education-crm;
    index index.html;
    
    # 前端路由支持 (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # 压缩配置
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}

# 后端API配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.your-domain.com;

    # SSL证书配置 (同上)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # 代理到Node.js应用
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲配置
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # 文件上传大小限制
    client_max_body_size 50M;
    
    # 日志配置
    access_log /var/log/nginx/api.access.log;
    error_log /var/log/nginx/api.error.log;
}
EOF

# 启用站点
sudo ln -s /etc/nginx/sites-available/education-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. 安装SSL证书

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请SSL证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加行: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 10. 配置PM2并启动服务

```bash
cd /var/www/education-crm/backend

# 创建PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'education-crm-backend',
    script: './dist/src/server.js',
    cwd: '/var/www/education-crm/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '.env.production',
    error_file: '/var/log/education-crm/err.log',
    out_file: '/var/log/education-crm/out.log',
    log_file: '/var/log/education-crm/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    restart_delay: 4000,
    min_uptime: '10s',
    max_restarts: 10
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
# 按提示执行sudo命令

# 验证服务状态
pm2 status
pm2 logs
```

## 🪟 Windows Server部署

### 1. 环境准备

```powershell
# 以管理员权限运行PowerShell

# 安装Chocolatey包管理器
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# 安装必需软件
choco install nodejs postgresql git -y
choco install pm2 -g
```

### 2. 配置PostgreSQL

```sql
-- 使用pgAdmin或命令行工具执行
CREATE DATABASE education_crm_prod;
CREATE USER crm_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE education_crm_prod TO crm_user;
```

### 3. 部署应用

```powershell
# 创建应用目录
New-Item -ItemType Directory -Force -Path "C:\inetpub\education-crm"
cd "C:\inetpub\education-crm"

# 克隆或复制代码
# git clone <repository-url> .

# 后端配置
cd backend
npm install --production

# 创建环境配置文件
@"
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://crm_user:your_secure_password_here@localhost:5432/education_crm_prod
JWT_SECRET=your-ultra-secure-jwt-secret-key
ALLOWED_ORIGINS=https://your-domain.com
"@ | Out-File -FilePath ".env.production" -Encoding UTF8

# 构建并初始化
npm run build
npm run prisma:migrate
npm run db:init

# 前端配置
cd ..\frontend
npm install

@"
VITE_API_BASE_URL=https://api.your-domain.com/api
VITE_APP_TITLE=教育CRM系统
"@ | Out-File -FilePath ".env.production" -Encoding UTF8

npm run build
```

### 4. 配置IIS

```powershell
# 启用IIS功能
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationDevelopment
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ASPNET45

# 安装URL Rewrite模块
# 下载并安装: https://www.iis.net/downloads/microsoft/url-rewrite

# 创建IIS站点
Import-Module WebAdministration
New-Website -Name "EducationCRM" -Port 80 -PhysicalPath "C:\inetpub\education-crm\frontend\dist"
```

### 5. 配置PM2服务

```powershell
cd "C:\inetpub\education-crm\backend"

# 创建PM2配置
@"
module.exports = {
  apps: [{
    name: 'education-crm-backend',
    script: './dist/src/server.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'C:/logs/education-crm/err.log',
    out_file: 'C:/logs/education-crm/out.log',
    log_file: 'C:/logs/education-crm/combined.log',
    time: true
  }]
};
"@ | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8

# 创建日志目录
New-Item -ItemType Directory -Force -Path "C:\logs\education-crm"

# 启动服务
pm2 start ecosystem.config.js
pm2 save
pm2-startup install
```

## 🐳 Docker容器化部署

### 1. 创建Dockerfile

**后端 Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生成Prisma Client
RUN npm run prisma:generate

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3001

CMD ["npm", "start"]
```

**前端 Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: education_crm_prod
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/prisma/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - app-network

  backend:
    build: ./backend
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://crm_user:${DB_PASSWORD}@database:5432/education_crm_prod
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      - database
    networks:
      - app-network
    volumes:
      - uploads_data:/app/uploads

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - app-network
    volumes:
      - ./ssl:/etc/nginx/ssl

volumes:
  postgres_data:
  uploads_data:

networks:
  app-network:
    driver: bridge
```

### 3. 环境变量配置

```bash
# .env
DB_PASSWORD=your_secure_db_password
JWT_SECRET=your_ultra_secure_jwt_secret
```

### 4. 部署命令

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 更新应用
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## ⚖️ 环境一致性保证

### 1. 使用Docker确保一致性

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up

# 生产环境
docker-compose -f docker-compose.prod.yml up
```

### 2. Node.js版本管理

```bash
# 使用.nvmrc文件锁定Node.js版本
echo "18.17.0" > .nvmrc

# 团队成员使用nvm
nvm use
```

### 3. 依赖版本锁定

```json
// package.json - 使用精确版本
{
  "engines": {
    "node": ">=18.17.0",
    "npm": ">=9.0.0"
  }
}
```

## 🤖 一键部署脚本

### Linux部署脚本 (`deploy.sh`)

```bash
#!/bin/bash

# 教育CRM系统一键部署脚本
set -e

echo "🚀 开始部署教育CRM系统..."

# 检查参数
if [ $# -lt 2 ]; then
    echo "用法: $0 <domain> <db_password> [email]"
    echo "例如: $0 your-domain.com secure_password admin@domain.com"
    exit 1
fi

DOMAIN=$1
DB_PASSWORD=$2
EMAIL=${3:-"admin@${DOMAIN}"}
APP_DIR="/var/www/education-crm"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    log_error "请使用root权限运行此脚本"
    exit 1
fi

# 1. 系统更新
log_info "更新系统..."
apt update && apt upgrade -y

# 2. 安装基础软件
log_info "安装基础软件..."
apt install -y curl wget git unzip software-properties-common nginx postgresql postgresql-contrib

# 3. 安装Node.js
log_info "安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install -g pm2

# 4. 配置PostgreSQL
log_info "配置PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql << EOF
CREATE DATABASE education_crm_prod;
CREATE USER crm_user WITH PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE education_crm_prod TO crm_user;
ALTER USER crm_user CREATEDB;
\q
EOF

# 5. 创建应用目录
log_info "创建应用目录..."
mkdir -p ${APP_DIR}
mkdir -p /var/log/education-crm

# 6. 部署代码 (假设代码已经在当前目录)
log_info "部署应用代码..."
cp -r . ${APP_DIR}/
cd ${APP_DIR}

# 7. 配置后端
log_info "配置后端..."
cd ${APP_DIR}/backend
npm install --production

# 生成JWT密钥
JWT_SECRET=$(openssl rand -hex 32)

cat > .env.production << EOF
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
DATABASE_URL="postgresql://crm_user:${DB_PASSWORD}@localhost:5432/education_crm_prod"
JWT_SECRET=${JWT_SECRET}
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
MAX_FILE_SIZE=10485760
UPLOAD_PATH=${APP_DIR}/uploads
LOG_LEVEL=warn
LOG_FILE=/var/log/education-crm/app.log
EOF

chmod 600 .env.production

# 构建和初始化
npm run build
npm run prisma:migrate
npm run db:init

# 8. 配置前端
log_info "配置前端..."
cd ${APP_DIR}/frontend
npm install

cat > .env.production << EOF
VITE_API_BASE_URL=https://api.${DOMAIN}/api
VITE_APP_TITLE=教育CRM系统
VITE_NODE_ENV=production
EOF

npm run build
mkdir -p /var/www/html/education-crm
cp -r dist/* /var/www/html/education-crm/
chown -R www-data:www-data /var/www/html/education-crm

# 9. 配置Nginx
log_info "配置Nginx..."
cat > /etc/nginx/sites-available/education-crm << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} api.${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    root /var/www/html/education-crm;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 443 ssl http2;
    server_name api.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    client_max_body_size 50M;
}
EOF

ln -s /etc/nginx/sites-available/education-crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 10. 安装SSL证书
log_info "安装SSL证书..."
apt install -y certbot python3-certbot-nginx
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d api.${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive

# 设置自动续期
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 11. 启动服务
log_info "启动服务..."
cd ${APP_DIR}/backend

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'education-crm-backend',
    script: './dist/src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '.env.production',
    error_file: '/var/log/education-crm/err.log',
    out_file: '/var/log/education-crm/out.log',
    log_file: '/var/log/education-crm/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup

systemctl reload nginx

# 12. 设置权限
chown -R www-data:www-data ${APP_DIR}
chown -R www-data:www-data /var/log/education-crm

log_info "✅ 部署完成!"
log_info "🌐 前端地址: https://${DOMAIN}"
log_info "🔗 API地址: https://api.${DOMAIN}"
log_info "📊 管理面板: https://${DOMAIN}/dashboard"
log_info "📝 默认管理员账号: admin / admin123 (请立即修改密码)"

echo ""
log_warn "📋 后续操作:"
echo "1. 访问 https://${DOMAIN} 测试系统"
echo "2. 修改默认管理员密码"
echo "3. 配置备份策略"
echo "4. 设置监控告警"
echo "5. 检查防火墙设置"
```

### Windows部署脚本 (`deploy.ps1`)

```powershell
# 教育CRM系统Windows一键部署脚本
param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$true)]
    [string]$DbPassword,
    
    [string]$Email = "admin@$Domain"
)

Write-Host "🚀 开始部署教育CRM系统..." -ForegroundColor Green

# 检查管理员权限
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "请以管理员权限运行此脚本"
    exit 1
}

# 1. 安装必需软件
Write-Host "安装必需软件..." -ForegroundColor Yellow
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

choco install nodejs postgresql git -y
npm install -g pm2

# 2. 创建应用目录
$AppDir = "C:\inetpub\education-crm"
New-Item -ItemType Directory -Force -Path $AppDir
New-Item -ItemType Directory -Force -Path "C:\logs\education-crm"

# 3. 复制应用代码
Write-Host "部署应用代码..." -ForegroundColor Yellow
Copy-Item -Path ".\*" -Destination $AppDir -Recurse -Force

# 4. 配置后端
Set-Location "$AppDir\backend"
npm install --production

$JwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))

@"
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://crm_user:$DbPassword@localhost:5432/education_crm_prod
JWT_SECRET=$JwtSecret
ALLOWED_ORIGINS=https://$Domain
"@ | Out-File -FilePath ".env.production" -Encoding UTF8

npm run build

# 5. 配置前端
Set-Location "$AppDir\frontend"
npm install

@"
VITE_API_BASE_URL=https://api.$Domain/api
VITE_APP_TITLE=教育CRM系统
"@ | Out-File -FilePath ".env.production" -Encoding UTF8

npm run build

# 6. 配置IIS
Write-Host "配置IIS..." -ForegroundColor Yellow
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All
Import-Module WebAdministration

Remove-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
New-Website -Name "EducationCRM" -Port 80 -PhysicalPath "$AppDir\frontend\dist"

# 7. 启动后端服务
Set-Location "$AppDir\backend"
pm2 start ecosystem.config.js
pm2 save

Write-Host "✅ 部署完成!" -ForegroundColor Green
Write-Host "🌐 访问地址: http://localhost" -ForegroundColor Cyan
```

## 📊 监控和维护

### 1. 日志监控

```bash
# 实时查看应用日志
pm2 logs education-crm-backend

# 查看Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 查看系统资源
pm2 monit
htop
```

### 2. 备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/education-crm"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/education-crm"

mkdir -p ${BACKUP_DIR}

# 备份数据库
pg_dump education_crm_prod > ${BACKUP_DIR}/db_${DATE}.sql

# 备份上传文件
tar -czf ${BACKUP_DIR}/uploads_${DATE}.tar.gz ${APP_DIR}/uploads

# 备份配置文件
tar -czf ${BACKUP_DIR}/config_${DATE}.tar.gz ${APP_DIR}/backend/.env.production

# 清理旧备份 (保留7天)
find ${BACKUP_DIR} -name "*.sql" -mtime +7 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: ${DATE}"
```

### 3. 健康检查

```bash
#!/bin/bash
# health-check.sh

# 检查后端服务
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常"
    pm2 restart education-crm-backend
fi

# 检查数据库连接
if psql -h localhost -U crm_user -d education_crm_prod -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接异常"
fi

# 检查磁盘空间
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ 磁盘使用率超过80%: ${DISK_USAGE}%"
fi
```

## 🔧 常见问题排查

### 1. 服务无法启动
```bash
# 检查端口占用
netstat -tulpn | grep :3001

# 检查应用日志
pm2 logs education-crm-backend

# 重启服务
pm2 restart education-crm-backend
```

### 2. 数据库连接失败
```bash
# 测试数据库连接
psql -h localhost -U crm_user -d education_crm_prod

# 检查PostgreSQL状态
systemctl status postgresql

# 查看数据库日志
tail -f /var/log/postgresql/postgresql-*.log
```

### 3. 前端页面无法访问
```bash
# 检查Nginx状态
systemctl status nginx

# 测试Nginx配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

遵循本指南，你的教育CRM系统将能够稳定、安全地运行在生产环境中，并具备良好的可维护性和扩展性。 