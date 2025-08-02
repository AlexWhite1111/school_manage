@echo off
chcp 65001 >nul
title 开发环境数据库初始化

echo ====================================
echo 🛠️  开发环境数据库初始化
echo ====================================
echo.

echo 📝 此脚本将:
echo    - 重置并初始化开发数据库
echo    - 创建基础数据 (管理员、标签、班级)
echo    - 生成测试数据 (客户、学生、考勤等)
echo    - 适用于开发和测试环境
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
echo 🗑️  重置数据库 (清空所有数据)...
call npm run db:reset
if errorlevel 1 (
    echo ❌ 数据库重置失败
    pause
    exit /b 1
)

echo.
echo 🌱 生成测试数据 (包含基础数据)...
call npm run db:seed-test
if errorlevel 1 (
    echo ❌ 测试数据生成失败
    pause
    exit /b 1
)

echo.
echo ✅ 开发环境数据库初始化完成！
echo.
echo 📝 可用账号:
echo    - 超级管理员: admin / 123456
echo    - 系统管理员: manager / 123456  
echo    - 教师账号: teacher / 123456
echo    - 学生账号: 使用学号登录 / 123456
echo.
echo 📊 测试数据包含:
echo    - 基础配置 (标签、班级)
echo    - 模拟客户和家长数据
echo    - 学生成长记录和考勤
echo    - 财务订单和付款记录
echo.

pause 