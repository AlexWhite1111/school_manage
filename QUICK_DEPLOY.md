## 一键部署（超简版）

适用系统：Windows 10/11 + Docker Desktop（已安装并启动）

### 1. 准备
- 安装 Docker Desktop（默认设置即可）
- 获取本项目代码（解压或 git clone 到任意目录，例如 `C:\Project4`）

### 2. 配置 deploy.env（必须）
在项目根目录打开并编辑 `deploy.env`，至少检查/修改这几项：

```
# 数据库密码（自定义强密码）
DB_PASSWORD=请改成你自己的强密码

# JWT 密钥（随便长一些，越随机越好）
JWT_SECRET=please_change_to_a_strong_secret

# 前端调用后端的基址（保持相对路径即可）
VITE_API_BASE_URL=/api

# CORS 白名单（可留空=放行全部；建议按需填写你的公网/本机）
ALLOWED_ORIGINS=http://你的公网IP,http://你的公网IP:80,http://你的公网IP:5173,http://localhost,http://localhost:5173
```

无需改动 `docker-compose.yml`。

### 3. 一键启动
在项目根目录打开 PowerShell（普通权限即可）：

```powershell
docker-compose --env-file deploy.env up -d --build
# 初始化数据库并写入管理员（admin/123456）
docker-compose exec backend sh -lc "npx prisma db push && node dist/prisma/seed-admin.js"
```

### 4. 路由器与防火墙（对外访问用）
- 路由器端口转发：公网 80 → 这台电脑的 内网IP:80（推荐）。
  - 若运营商屏蔽 80，可用“公网 3000 → 内网 80”替代，访问 `http://公网IP:3000/`。
- Windows 防火墙放行（需“以管理员身份”打开 PowerShell）：

```powershell
New-NetFirewallRule -DisplayName 'Project4-HTTP-80'  -Direction Inbound -LocalPort 80  -Protocol TCP -Action Allow -Profile Any
New-NetFirewallRule -DisplayName 'Project4-HTTPS-443' -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -Profile Any
```

### 5. 验证
- 本机：
  - 前端：`http://localhost/`
  - 后端健康：`http://localhost:3000/health`
- 公网：`http://你的公网IP/login`，使用账号 `admin` / `123456` 登录

### 6. 日常运维常用命令
```powershell
# 查看状态与日志
docker-compose ps
docker-compose logs backend --tail=100
docker-compose logs frontend --tail=100

# 重启/停止/更新
docker-compose restart
docker-compose stop
docker-compose --env-file deploy.env up -d --build
```

### 7. 升级/变更后
有数据库模型变更：
```powershell
docker-compose exec backend sh -lc "npx prisma migrate deploy || npx prisma db push"
```

### 8. 常见问题（超简）
- 打开登录页但调用接口 500（CORS）：本项目已默认放行“无 Origin 的同源请求”，`ALLOWED_ORIGINS` 留空也可放行全部。
- 公网 80 打不通：
  - 确认路由器“外网 80 → 内网IP:80”
  - 以管理员放行防火墙 80
  - 仍不通，多数为运营商屏蔽 80；改用“外网 3000 → 内网 80”并访问 `http://公网IP:3000/`

### 9. 🎛️ 图形化管理工具（推荐）
双击根目录的 `project-manager.bat` 启动图形化管理工具：
- 一键部署、启动、停止、重启
- 可视化配置编辑
- 网络设置向导（路由器+防火墙）
- 服务状态监控与日志查看
- 数据库管理与备份

完成以上步骤，小白也能一键部署上线。如需更规范的 HTTPS/证书或多机部署，可再看 `docs/guides/Deployment.md`。

