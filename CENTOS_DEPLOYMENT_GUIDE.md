# 🚀 CentOS云服务器部署指南

## 📋 服务器要求

### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 40GB SSD
- **操作系统**: CentOS 7/8/9 或 Rocky Linux 8/9
- **网络**: 公网IP，至少5Mbps带宽

### 推荐配置
- **CPU**: 4核心
- **内存**: 8GB RAM  
- **存储**: 80GB SSD
- **网络**: 至少10Mbps带宽

## 🛠️ 第一步：服务器环境准备

### 1. 更新系统
```bash
# 更新系统包
sudo yum update -y

# 安装基础工具
sudo yum install -y wget curl git vim unzip
```

### 2. 安装Docker
```bash
# 安装Docker官方仓库
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到docker组（避免每次都用sudo）
sudo usermod -aG docker $USER

# 重新登录或执行以下命令使组权限生效
newgrp docker

# 验证Docker安装
docker --version
```

### 3. 安装Docker Compose
```bash
# 下载Docker Compose（请根据最新版本调整版本号）
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 创建软链接
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 验证安装
docker-compose --version
```

## 🔥 第二步：配置防火墙

```bash
# 查看防火墙状态
sudo systemctl status firewalld

# 如果防火墙未启动，启动它
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 开放必要端口
sudo firewall-cmd --permanent --add-port=80/tcp      # HTTP
sudo firewall-cmd --permanent --add-port=443/tcp     # HTTPS
sudo firewall-cmd --permanent --add-port=22/tcp      # SSH
sudo firewall-cmd --permanent --add-port=5173/tcp    # 前端直连（可选）
sudo firewall-cmd --permanent --add-port=3000/tcp    # 后端API直连（可选）

# 重载防火墙规则
sudo firewall-cmd --reload

# 验证开放的端口
sudo firewall-cmd --list-all
```

## 📦 第三步：部署项目

### 1. 克隆项目到服务器
```bash
# 进入合适的目录
cd /opt

# 克隆项目（替换为您的仓库地址）
sudo git clone https://github.com/AlexWhite1111/school_manage.git project4
sudo chown -R $USER:$USER /opt/project4
cd /opt/project4

# 切换到最新分支
git checkout feature-initTODO
```

### 2. 配置环境变量
```bash
# 复制环境配置文件
cp deploy.env .env

# 编辑环境配置
vim .env
```

**重要的环境变量配置：**
```bash
# .env 文件内容
DB_NAME=education_crm
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_DATABASE_PASSWORD    # ⚠️ 修改为强密码

JWT_SECRET=YOUR_VERY_SECURE_JWT_SECRET_KEY   # ⚠️ 修改为强密钥

VITE_API_BASE_URL=/api

# 替换为您的服务器公网IP
ALLOWED_ORIGINS=http://YOUR_SERVER_IP:80,http://YOUR_SERVER_IP,https://YOUR_DOMAIN.com

SERVER_IP=0.0.0.0
FRONTEND_PORT=5173
BACKEND_PORT=3000
DB_PORT=5432

NETWORK_SUBNET=172.20.0.0/16
```

### 3. 启动项目
```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看启动日志
docker-compose logs -f
```

### 4. 初始化数据库
```bash
# 等待数据库启动（约30-60秒）
sleep 60

# 运行数据库迁移
docker exec project4-backend npx prisma migrate deploy

# 初始化数据
docker exec project4-backend npm run seed:growth-config
docker exec project4-backend npm run seed-admin
docker exec project4-backend npm run seed:config

# 验证数据库初始化
docker exec project4-backend npx prisma db seed
```

## 🌐 第四步：域名和SSL配置（推荐）

### 1. 域名配置
- 在域名提供商处设置A记录：`your-domain.com` → `您的服务器IP`
- 等待DNS解析生效（可能需要几分钟到几小时）

### 2. 安装Certbot（免费SSL）
```bash
# 安装snapd
sudo yum install -y epel-release
sudo yum install -y snapd
sudo systemctl enable --now snapd.socket

# 创建snap的符号链接
sudo ln -s /var/lib/snapd/snap /snap

# 安装certbot
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot

# 创建certbot命令链接
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 3. 获取SSL证书
```bash
# 停止nginx容器以释放80端口
docker-compose stop nginx-proxy

# 获取SSL证书（替换your-domain.com为您的域名）
sudo certbot certonly --standalone -d your-domain.com

# 复制证书到nginx目录
sudo mkdir -p /opt/project4/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/project4/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/project4/nginx/ssl/
sudo chown -R $USER:$USER /opt/project4/nginx/ssl
```

### 4. 更新Nginx配置支持HTTPS
```bash
# 备份原配置
cp /opt/project4/nginx/nginx.conf /opt/project4/nginx/nginx.conf.bak

# 创建HTTPS配置
cat > /opt/project4/nginx/nginx.conf.https << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    client_max_body_size 50M;
    client_body_buffer_size 128k;

    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:3000;
    }

    # HTTP转HTTPS重定向
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS服务器
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
EOF

# 如果配置了SSL，替换nginx配置
# cp /opt/project4/nginx/nginx.conf.https /opt/project4/nginx/nginx.conf
```

### 5. 重启服务
```bash
# 重启nginx代理
docker-compose restart nginx-proxy

# 检查所有服务状态
docker-compose ps
```

## 🔍 第五步：验证部署

### 1. 检查服务状态
```bash
# 查看所有容器状态
docker-compose ps

# 查看服务日志
docker-compose logs nginx-proxy
docker-compose logs frontend  
docker-compose logs backend
docker-compose logs database
```

### 2. 测试连接
```bash
# 测试后端健康检查
curl http://localhost:3000/health
# 或
curl http://YOUR_SERVER_IP/api/health

# 测试前端访问
curl -I http://YOUR_SERVER_IP
```

### 3. 浏览器访问
- **HTTP访问**: `http://YOUR_SERVER_IP`
- **HTTPS访问**: `https://your-domain.com`
- **管理员登录**: 用户名: `admin`, 密码: `123456`

## 📊 第六步：性能优化和监控

### 1. 系统监控
```bash
# 安装htop监控工具
sudo yum install -y htop

# 监控系统资源
htop

# 监控Docker容器资源使用
docker stats
```

### 2. 定期维护
```bash
# 创建维护脚本
cat > /opt/project4/maintenance.sh << 'EOF'
#!/bin/bash
echo "开始系统维护..."

# 清理Docker无用镜像和容器
docker system prune -f

# 检查磁盘空间
df -h

# 备份数据库（如果需要）
docker exec project4-db pg_dump -U postgres education_crm > /opt/backup/db_$(date +%Y%m%d_%H%M%S).sql

echo "系统维护完成"
EOF

chmod +x /opt/project4/maintenance.sh

# 设置定期执行（每周执行一次）
echo "0 2 * * 0 /opt/project4/maintenance.sh" | sudo crontab -
```

### 3. 自动更新SSL证书
```bash
# 添加自动续期任务
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /opt/project4/docker-compose.yml restart nginx-proxy" | sudo crontab -
```

## 🚨 故障排除

### 常见问题解决方案

1. **容器启动失败**
```bash
# 查看具体错误
docker-compose logs [service_name]

# 重启服务
docker-compose restart [service_name]
```

2. **数据库连接失败**
```bash
# 检查数据库容器
docker exec -it project4-db psql -U postgres -d education_crm

# 重置数据库
docker-compose down
docker volume rm project4_postgres_data
docker-compose up -d
```

3. **502 Bad Gateway**
```bash
# 检查后端服务状态
docker-compose logs backend

# 重启后端
docker-compose restart backend
```

4. **SSL证书问题**
```bash
# 检查证书有效期
sudo certbot certificates

# 手动续期
sudo certbot renew
```

## 📋 日常运维命令

```bash
# 查看系统状态
docker-compose ps
docker-compose logs -f --tail=100

# 重启服务
docker-compose restart

# 更新代码
cd /opt/project4
git pull origin feature-initTODO
docker-compose down
docker-compose up -d --build

# 备份数据
docker exec project4-db pg_dump -U postgres education_crm > backup_$(date +%Y%m%d).sql

# 恢复数据  
docker exec -i project4-db psql -U postgres -d education_crm < backup_file.sql
```

---

🎉 **您的教育CRM系统已成功部署到CentOS云服务器！**

**访问地址**: 
- HTTP: http://YOUR_SERVER_IP
- HTTPS: https://your-domain.com

**默认管理员账户**:
- 用户名: admin
- 密码: 123456

建议部署完成后立即修改管理员密码！