# 🚀 Project4 低成本云服务部署指南

## 📋 目录
- [服务器选择](#服务器选择)
- [快速部署](#快速部署)
- [网络配置](#网络配置)
- [域名配置](#域名配置)
- [监控和维护](#监控和维护)
- [成本优化](#成本优化)

## 🛡️ 服务器选择

### 💰 低成本推荐方案

#### 1. 阿里云ECS
- **配置**: 1核2G，1M带宽
- **费用**: ~30-50元/月
- **优势**: 国内访问快，有免费试用

#### 2. 腾讯云CVM
- **配置**: 1核2G，1M带宽
- **费用**: ~25-45元/月
- **优势**: 新用户优惠大

#### 3. 华为云ECS
- **配置**: 1核2G，1M带宽
- **费用**: ~20-40元/月
- **优势**: 性价比高

#### 4. 国外VPS（如果需要）
- **Vultr**: $5/月起，1核1G
- **DigitalOcean**: $5/月起，1核1G
- **Linode**: $5/月起，1核1G

## 🚀 快速部署

### 第一步：准备服务器
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以使docker组生效
exit
```

### 第二步：上传项目文件
```bash
# 方法1: 使用git
git clone <your-repo-url>
cd Project4

# 方法2: 使用scp上传
scp -r Project4 user@your-server-ip:/home/user/
```

### 第三步：配置环境
```bash
# 复制环境配置
cp deploy.env .env

# 编辑配置文件
nano deploy.env
```

**重要配置项：**
```bash
# 修改为你的服务器IP
VITE_API_BASE_URL=http://your-server-ip:3000

# 设置强密码
DB_PASSWORD=your_very_secure_password_123
JWT_SECRET=your_very_secure_jwt_secret_key_456
```

### 第四步：部署
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

## 🌐 网络配置

### 端口开放

#### 云服务器安全组配置
在云服务器控制台配置安全组，开放以下端口：

| 端口 | 协议 | 用途 | 来源 |
|-----|------|------|------|
| 22 | TCP | SSH | 你的IP |
| 80 | TCP | HTTP | 0.0.0.0/0 |
| 443 | TCP | HTTPS | 0.0.0.0/0 |
| 3000 | TCP | 后端API | 0.0.0.0/0 |
| 5173 | TCP | 前端应用 | 0.0.0.0/0 |

#### 服务器防火墙配置
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 5173/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

### 访问测试
部署完成后，通过以下地址访问：
- 前端: `http://your-server-ip:5173`
- 后端: `http://your-server-ip:3000`
- 统一入口: `http://your-server-ip:80`

## 🌍 域名配置

### 1. 购买域名
推荐低成本域名注册商：
- 阿里云万网：.com 50-60元/年
- 腾讯云：.com 55-65元/年
- Godaddy：.com $10-15/年

### 2. DNS解析配置
在域名管理控制台添加A记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | your-server-ip | 600 |
| A | www | your-server-ip | 600 |
| A | api | your-server-ip | 600 |

### 3. Nginx配置更新
```bash
# 编辑nginx配置
nano nginx/nginx.conf

# 修改server_name
server_name yourdomain.com www.yourdomain.com;
```

### 4. SSL证书配置（免费）
```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 监控和维护

### 系统监控脚本
```bash
# 创建监控脚本
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== 系统状态 $(date) ==="
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "内存使用: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "磁盘使用: $(df -h | awk '$NF=="/"{printf "%s", $5}')"
echo "Docker容器状态:"
docker-compose ps
echo "================================"
EOF

chmod +x monitor.sh

# 设置定时监控
crontab -e
# 添加: */30 * * * * /path/to/monitor.sh >> /var/log/monitor.log
```

### 日志管理
```bash
# 查看应用日志
docker-compose logs -f --tail=100

# 清理旧日志
docker-compose exec backend sh -c "find /app/logs -name '*.log' -mtime +7 -delete"

# 设置日志轮转
sudo nano /etc/logrotate.d/docker-compose
```

### 备份策略
```bash
# 数据库备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/backup"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T database pg_dump -U postgres project4_db > $BACKUP_DIR/db_backup_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz backend/uploads/

# 清理7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $DATE"
EOF

chmod +x backup.sh

# 设置每日备份
crontab -e
# 添加: 0 2 * * * /path/to/backup.sh
```

## 💰 成本优化

### 1. 资源优化
```bash
# 限制Docker容器资源使用
# 在docker-compose.yml中添加：
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

### 2. 网络优化
- 使用CDN加速静态资源（七牛云、又拍云免费额度）
- 启用Gzip压缩减少带宽使用
- 图片优化和压缩

### 3. 数据库优化
```bash
# PostgreSQL配置优化
echo "shared_buffers = 128MB" >> postgresql.conf
echo "effective_cache_size = 256MB" >> postgresql.conf
echo "maintenance_work_mem = 64MB" >> postgresql.conf
```

### 4. 监控告警
- 设置CPU、内存、磁盘使用率告警
- 配置服务可用性监控
- 使用免费监控服务（如UptimeRobot）

## 🔧 故障排除

### 常见问题

#### 1. 容器启动失败
```bash
# 查看详细日志
docker-compose logs [service_name]

# 检查配置文件
docker-compose config

# 重新构建
docker-compose build --no-cache
```

#### 2. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose exec database pg_isready -U postgres

# 重置数据库
docker-compose down -v
docker-compose up -d database
```

#### 3. 网络访问问题
```bash
# 检查端口监听
netstat -tlnp | grep :3000
netstat -tlnp | grep :5173

# 检查防火墙
sudo ufw status
sudo iptables -L
```

### 紧急恢复
```bash
# 快速重启所有服务
docker-compose restart

# 完全重新部署
docker-compose down
docker system prune -f
./deploy.sh
```

## 📞 技术支持

如果遇到问题，可以：
1. 查看项目日志：`docker-compose logs -f`
2. 检查服务状态：`docker-compose ps`
3. 查看系统资源：`htop` 或 `docker stats`

---

**部署完成后，记得:**
- ✅ 修改默认密码
- ✅ 启用SSL证书
- ✅ 设置监控告警
- ✅ 配置自动备份
- ✅ 定期更新系统