@echo off
chcp 65001 >nul
title 数据库迁移

echo ====================================
echo 🗃️  数据库迁移
echo ====================================
echo.

echo 📝 此脚本将:
echo    - 应用所有挂起的数据库迁移
echo    - 同步Schema到数据库
echo    - 不会修改或删除现有数据
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

if not exist "prisma\schema.prisma" (
    echo ❌ 错误: 未找到 Prisma Schema 文件
    pause
    exit /b 1
)

echo ✅ 环境检查通过

echo.
echo 🗃️  执行数据库迁移...
call npx prisma migrate deploy
if errorlevel 1 (
    echo.
    echo ❌ 数据库迁移失败
    echo.
    echo 💡 可能的解决方案:
    echo    1. 检查数据库连接配置
    echo    2. 确认数据库服务正在运行
    echo    3. 检查数据库用户权限
    echo    4. 查看上方的错误详情
    pause
    exit /b 1
)

echo.
echo 🔄 重新生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Prisma Client 生成失败
    pause
    exit /b 1
)

echo.
echo ✅ 数据库迁移完成！
echo.
echo 📊 迁移状态:
call npx prisma migrate status
echo.

pause 