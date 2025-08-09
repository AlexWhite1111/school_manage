@echo off
chcp 65001 >nul
title Project4 部署脚本

echo.
echo 🚀 开始部署 Project4...
echo.

REM 检查Docker是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 未安装，请先安装 Docker Desktop
    pause
    exit /b 1
)

REM 检查Docker Compose是否安装
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose 未安装，请先安装 Docker Compose
    pause
    exit /b 1
)

REM 检查配置文件
if not exist "deploy.env" (
    echo ❌ 未找到 deploy.env 文件
    pause
    exit /b 1
)

echo 📋 加载环境配置...

REM 停止现有容器
echo.
echo 🛑 停止现有容器...
docker-compose down

REM 询问是否清理旧镜像
echo.
set /p cleanup="是否要清理旧的Docker镜像？[y/N]: "
if /i "%cleanup%"=="y" (
    echo 🧹 清理旧镜像...
    docker system prune -f
    docker image prune -f
)

REM 构建并启动服务
echo.
echo 🔨 构建并启动服务...
docker-compose --env-file deploy.env up --build -d

if %errorlevel% neq 0 (
    echo ❌ 构建失败，请检查配置
    pause
    exit /b 1
)

REM 等待服务启动
echo.
echo ⏳ 等待服务启动...
timeout /t 30 /nobreak >nul

REM 检查服务状态
echo.
echo 🔍 检查服务状态...
docker-compose ps

echo.
echo ✅ 服务健康检查:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM 检查后端健康状态
curl -f http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo 后端服务: ✅ 健康 ^(http://localhost:3000^)
) else (
    echo 后端服务: ❌ 不健康
)

REM 检查前端健康状态
curl -f http://localhost:5173/health >nul 2>&1
if %errorlevel% equ 0 (
    echo 前端服务: ✅ 健康 ^(http://localhost:5173^)
) else (
    echo 前端服务: ❌ 不健康
)

REM 检查数据库连接
docker-compose exec -T database pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo 数据库: ✅ 健康
) else (
    echo 数据库: ❌ 不健康
)

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo.
echo 🎉 部署完成！
echo.
echo 📱 访问信息:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 前端应用: http://localhost:5173
echo 后端API:  http://localhost:3000
echo 统一入口: http://localhost:80 ^(通过Nginx代理^)
echo 数据库:   postgresql://localhost:5432
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo.
echo 🌐 网络配置:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 要让外部网络访问，请：
echo 1. 确保Windows防火墙开放端口: 80, 3000, 5173
echo 2. 如果在云服务器上，配置安全组规则
echo 3. 修改 deploy.env 中的 VITE_API_BASE_URL 为实际服务器IP
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo.
echo 🛠️  常用命令:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 查看日志: docker-compose logs -f [service_name]
echo 重启服务: docker-compose restart [service_name]
echo 停止服务: docker-compose down
echo 进入容器: docker-compose exec [service_name] sh
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo.
pause