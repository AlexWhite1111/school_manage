@echo off
chcp 65001 >nul 2>&1
echo.
echo ===============================================
echo    教育CRM系统 - 新电脑快速部署脚本
echo ===============================================
echo.

echo 📋 检查前置条件...
where docker >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Docker，请先安装Docker Desktop
    echo    下载地址: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Git，请先安装Git
    echo    下载地址: https://git-scm.com/downloads
    pause
    exit /b 1
)

echo ✅ Docker 和 Git 已安装

echo.
echo 🔧 开始部署流程...
echo.

echo 1. 复制环境配置文件...
if not exist .env (
    copy deploy.env .env
    echo ✅ 环境变量文件已创建
) else (
    echo ℹ️  环境变量文件已存在，跳过创建
)

echo.
echo 2. 构建并启动Docker服务...
docker compose up -d --build
if errorlevel 1 (
    echo ❌ Docker服务启动失败
    pause
    exit /b 1
)

echo.
echo 3. 等待服务就绪...
timeout /t 30 /nobreak >nul

echo.
echo 4. 初始化数据库...
docker exec project4-backend npx prisma migrate deploy
if errorlevel 1 (
    echo ⚠️  数据库迁移失败，尝试强制重置...
    docker exec project4-backend npx prisma db push --force-reset
)

echo.
echo 5. 创建基础配置数据...
docker exec project4-backend npm run seed-admin  
docker exec project4-backend npm run seed:config

echo.
echo 6. 验证服务状态...
docker compose ps

echo.
echo ===============================================
echo           🎉 部署完成！
echo ===============================================
echo.
echo 📱 访问地址:
echo    前端应用: http://localhost:5173
echo    后端API:  http://localhost:3000
echo.
echo 🔑 管理员账户:
echo    用户名: admin
echo    密码:   123456
echo.
echo 📊 检查服务状态:
echo    docker compose ps
echo.
echo 🔧 查看服务日志:
echo    docker logs project4-backend
echo    docker logs project4-frontend
echo.
echo ===============================================

pause