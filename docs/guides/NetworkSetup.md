# 🌐 网络连接配置指南

本指南将帮助你配置项目的网络访问，从本地开发到生产环境部署。

## 📋 目录

1. [本地开发环境](#本地开发环境)
2. [内网WiFi测试](#内网WiFi测试)
3. [外网访问配置](#外网访问配置)
4. [生产环境部署](#生产环境部署)
5. [安全配置](#安全配置)
6. [故障排除](#故障排除)

## 🏠 本地开发环境

### 基础配置

1. **后端配置** (`backend/.env`)
```env
# 基础配置
NODE_ENV=development
PORT=3001

# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/education_crm"

# JWT密钥
JWT_SECRET=your-very-long-and-secure-secret-key-here

# CORS配置（开发环境自动允许本地访问）
# 无需特殊配置，系统自动检测
```

2. **前端配置** (`frontend/.env`)
```env
# API地址
VITE_API_BASE_URL=http://localhost:3001/api

# 应用配置
VITE_APP_TITLE=教育CRM系统
```

### 启动服务

```bash
# 后端
cd backend
npm run dev

# 前端
cd frontend  
npm run dev
```

默认访问地址：
- 前端：http://localhost:5173
- 后端：http://localhost:3001

## 📶 内网WiFi测试

### 1. 获取本机IP地址

**Windows:**
```cmd
ipconfig
```

**macOS/Linux:**
```bash
ifconfig
# 或
ip addr show
```

查找类似 `192.168.x.x` 的IP地址。

### 2. 配置后端监听所有接口

修改 `backend/src/server.ts`：

```typescript
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // 监听所有网络接口

app.listen(PORT, HOST, () => {
  console.log(`🚀 服务器运行在 http://${HOST}:${PORT}`);
  console.log(`🌐 局域网访问: http://[您的IP]:${PORT}`);
});
```

### 3. 配置前端API地址

创建 `frontend/.env.local`：

```env
# 使用您的实际IP地址
VITE_API_BASE_URL=http://192.168.1.100:3001/api
```

### 4. 防火墙配置

**Windows防火墙:**
1. 控制面板 → Windows Defender防火墙
2. 高级设置 → 入站规则 → 新建规则
3. 选择"端口" → TCP → 特定本地端口 → 输入 3001,5173
4. 允许连接 → 应用到所有配置文件

**macOS防火墙:**
```bash
# 临时关闭防火墙进行测试
sudo pfctl -d

# 或添加特定端口规则
sudo pfctl -a "com.apple.pfctl.web" -f - << EOF
pass in proto tcp from any to any port {3001, 5173}
EOF
```

**Linux (ufw):**
```bash
sudo ufw allow 3001
sudo ufw allow 5173
```

### 5. 测试内网访问

在同一WiFi网络的其他设备上访问：
- 前端：http://192.168.1.100:5173
- 后端健康检查：http://192.168.1.100:3001/health

## 🌍 外网访问配置

### 方案1：内网穿透（开发/演示用）

#### 使用ngrok
```bash
# 安装ngrok
npm install -g ngrok

# 启动后端穿透
ngrok http 3001

# 启动前端穿透  
ngrok http 5173
```

#### 使用frp
```bash
# 下载frp客户端
# 配置frpc.ini

[common]
server_addr = your-frp-server.com
server_port = 7000

[backend]
type = http
local_ip = 127.0.0.1
local_port = 3001
custom_domains = your-backend-domain.com

[frontend]
type = http
local_ip = 127.0.0.1  
local_port = 5173
custom_domains = your-frontend-domain.com
```

### 方案2：云服务器部署

见 [生产环境部署](#生产环境部署) 章节。

## 🚀 生产环境部署

### 1. 环境准备

**服务器要求:**
- Linux/Windows Server
- Node.js 18+
- PostgreSQL 12+
- Nginx (推荐)

### 2. 后端部署配置

**生产环境变量** (`backend/.env.production`)：
```env
NODE_ENV=production
PORT=3001
HOST=127.0.0.1

# 数据库（使用生产数据库）
DATABASE_URL="postgresql://prod_user:prod_password@localhost:5432/education_crm_prod"

# 安全配置
JWT_SECRET=your-ultra-secure-production-jwt-secret-key

# CORS配置（严格限制）
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# 文件上传限制
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/uploads

# 日志配置
LOG_LEVEL=warn
LOG_FILE=/var/log/education-crm/app.log
```

### 3. 前端构建配置

**生产环境变量** (`frontend/.env.production`)：
```env
VITE_API_BASE_URL=https://api.your-domain.com/api
VITE_APP_TITLE=教育CRM系统
VITE_NODE_ENV=production
```

**构建脚本:**
```bash
cd frontend
npm run build
```

### 4. Nginx配置

创建 `/etc/nginx/sites-available/education-crm`：

```nginx
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

    # SSL证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 前端静态文件
    root /var/www/education-crm/frontend/dist;
    index index.html;
    
    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# 后端API配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.your-domain.com;

    # SSL证书配置（同上）
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
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
    }
    
    # 文件上传大小限制
    client_max_body_size 50M;
}
```

### 5. PM2进程管理

**安装PM2:**
```bash
npm install -g pm2
```

**创建 `ecosystem.config.js`:**
```javascript
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
    error_file: '/var/log/education-crm/err.log',
    out_file: '/var/log/education-crm/out.log',
    log_file: '/var/log/education-crm/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

**启动应用:**
```bash
cd /var/www/education-crm/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔒 安全配置

### 1. 环境变量安全

```bash
# 设置适当的文件权限
chmod 600 /var/www/education-crm/backend/.env.production
chown www-data:www-data /var/www/education-crm/backend/.env.production
```

### 2. 数据库安全

```sql
-- 创建专用数据库用户
CREATE USER education_crm_prod WITH PASSWORD 'very-secure-password';
GRANT CONNECT ON DATABASE education_crm_prod TO education_crm_prod;
GRANT USAGE ON SCHEMA public TO education_crm_prod;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO education_crm_prod;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO education_crm_prod;
```

### 3. 系统安全

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 禁用不必要的服务
sudo systemctl disable apache2  # 如果安装了Apache
```

## ❌ 故障排除

### 常见问题

#### 1. CORS错误
```javascript
// 检查前端请求的API地址
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);

// 检查后端CORS配置
// 在backend/.env中添加调试信息
DEBUG_CORS=true
```

#### 2. 内网无法访问
```bash
# 检查端口监听
netstat -tulpn | grep :3001

# 检查防火墙状态
sudo ufw status  # Linux
netsh advfirewall show allprofiles  # Windows
```

#### 3. 数据库连接失败
```bash
# 测试数据库连接
psql -h localhost -U username -d database_name

# 检查数据库服务状态
sudo systemctl status postgresql
```

#### 4. SSL证书问题
```bash
# 检查证书有效性
openssl x509 -in certificate.crt -text -noout

# 使用Let's Encrypt申请免费证书
sudo certbot --nginx -d your-domain.com
```

### 调试工具

#### 网络连接测试
```bash
# 测试端口连通性
telnet your-server-ip 3001

# 测试HTTP响应
curl -I http://your-server-ip:3001/health

# 测试HTTPS
curl -I https://api.your-domain.com/health
```

#### 日志查看
```bash
# PM2日志
pm2 logs education-crm-backend

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -f -u nginx
```

## 📞 技术支持

如果遇到配置问题，请检查：

1. **环境变量配置** - 确保所有必需的环境变量都已正确设置
2. **网络连通性** - 使用ping和telnet测试网络连接
3. **防火墙规则** - 确保必要的端口已开放
4. **SSL证书** - 确保证书有效且正确配置
5. **日志文件** - 查看详细的错误日志信息

遵循本指南可以确保你的教育CRM系统能够安全、稳定地运行在各种网络环境中。 