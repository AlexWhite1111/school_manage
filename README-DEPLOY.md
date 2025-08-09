# 🚀 Project4 网络部署指南

## 📦 部署文件说明

本项目为您提供了完整的网络部署方案，支持前端(5173端口)和后端(3000端口)的容器化部署。

### 📁 部署相关文件
```
Project4/
├── docker-compose.yml      # Docker编排配置
├── deploy.env             # 生产环境变量
├── deploy.bat            # Windows部署脚本
├── deploy.sh             # Linux部署脚本
├── quick-start.sh        # 快速启动脚本
├── nginx/                # Nginx反向代理配置
│   └── nginx.conf
└── cloud-deploy-guide.md # 详细云服务部署指南
```

## 🎯 快速开始

### Windows用户
```batch
# 1. 编辑配置文件
notepad deploy.env

# 2. 运行部署脚本
deploy.bat
```

### Linux/Mac用户
```bash
# 1. 编辑配置文件
nano deploy.env

# 2. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 开发环境快速启动
```bash
chmod +x quick-start.sh
./quick-start.sh
```

## 🔧 关键配置

### 端口映射
- **前端**: 宿主机5173 → 容器80
- **后端**: 宿主机3000 → 容器3000  
- **数据库**: 宿主机5432 → 容器5432
- **代理**: 宿主机80 → Nginx容器80

### 重要环境变量 (deploy.env)
```bash
# 修改为你的服务器IP
VITE_API_BASE_URL=http://your-server-ip:3000

# 设置安全密码
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_key_here
```

## 🌐 网络访问

部署完成后，可通过以下方式访问：

### 本地访问
- 前端应用: http://localhost:5173
- 后端API: http://localhost:3000
- 统一入口: http://localhost:80

### 外网访问 
- 前端应用: http://your-server-ip:5173
- 后端API: http://your-server-ip:3000
- 统一入口: http://your-server-ip:80

## 🛡️ 安全配置

### 防火墙端口开放
确保以下端口在服务器防火墙中开放：
- 80 (HTTP)
- 3000 (后端API)
- 5173 (前端应用)
- 22 (SSH管理)

### 云服务器安全组
在云服务器控制台配置安全组规则，允许上述端口的入站访问。

## 📊 服务管理

### 常用命令
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]

# 重启服务
docker-compose restart [service_name]

# 停止所有服务
docker-compose down

# 完全重新部署
docker-compose down
docker system prune -f
./deploy.sh
```

### 服务健康检查
```bash
# 检查后端健康状态
curl http://localhost:3000/health

# 检查前端健康状态  
curl http://localhost:5173/health

# 检查数据库状态
docker-compose exec database pg_isready -U postgres
```

## 💰 低成本部署选择

### 推荐云服务器配置
- **CPU**: 1核心
- **内存**: 2GB
- **带宽**: 1-3Mbps
- **存储**: 40GB SSD
- **费用**: 20-50元/月

### 推荐服务商
- 阿里云ECS (国内访问快)
- 腾讯云CVM (新用户优惠)
- 华为云ECS (性价比高)
- Vultr/DigitalOcean (海外用户)

## 🔍 故障排除

### 1. 容器启动失败
```bash
# 查看详细错误
docker-compose logs [service_name]

# 重新构建镜像
docker-compose build --no-cache [service_name]
```

### 2. 网络连接问题
```bash
# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :5173

# 检查容器网络
docker network ls
docker network inspect project4_project4-network
```

### 3. 数据库连接失败
```bash
# 重置数据库
docker-compose down database
docker volume rm project4_postgres_data
docker-compose up -d database
```

## 📈 性能优化

### 资源限制
编辑 `docker-compose.yml` 添加资源限制：
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

### 缓存优化
- 启用Nginx Gzip压缩
- 配置静态资源缓存
- 使用CDN加速

## 📞 获取帮助

如果遇到问题：
1. 查看 `cloud-deploy-guide.md` 详细指南
2. 检查容器日志: `docker-compose logs -f`
3. 验证配置文件: `docker-compose config`

---

**部署成功标志**: 所有服务状态显示 "Up" 且健康检查通过 ✅