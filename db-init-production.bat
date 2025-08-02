@echo off
chcp 65001 >nul
title 生产环境数据库初始化

echo ====================================
echo 🚀 生产环境数据库初始化
echo ====================================
echo.

echo ⚠️  警告: 此脚本将初始化生产环境数据库
echo    - 只创建必需的基础数据
echo    - 不包含测试数据
echo    - 请确保数据库连接配置正确
echo.

set /p confirm="确认继续吗? (y/N): "
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    exit /b
)

echo.
echo 🔧 切换到后端目录...
cd /d "%~dp0backend"

echo.
echo 📋 检查环境...
if not exist ".env" (
    echo ❌ 错误: 未找到 .env 文件
    echo    请确保环境变量配置正确
    pause
    exit /b 1
)

echo ✅ 环境检查通过

echo.
echo 🗃️  执行数据库迁移...
call npm run prisma:migrate
if errorlevel 1 (
    echo ❌ 数据库迁移失败
    pause
    exit /b 1
)

echo.
echo 🏗️  初始化基础数据...
call npm run db:init
if errorlevel 1 (
    echo ❌ 基础数据初始化失败
    pause
    exit /b 1
)

echo.
echo ✅ 生产环境数据库初始化完成！
echo.
echo 📝 后续步骤:
echo    1. 登录管理后台 (用户名: admin, 密码: 123456)
echo    2. 立即修改管理员密码
echo    3. 创建其他用户账号
echo    4. 根据需要添加班级和课程
echo.

pause 