@echo off
chcp 65001 >nul 2>&1
title 教育CRM系统 - 快速启动

:start
cls
echo.
echo ===============================================
echo     🌟 教育CRM系统 - 快速启动向导 v1.0
echo ===============================================
echo.
echo 👋 欢迎使用教育CRM系统！
echo.
echo 🎯 选择您的操作:
echo   [1] 🚀 新用户 - 一键部署 (推荐)
echo   [2] ⚙️  配置环境变量
echo   [3] 🔧 高级管理器
echo   [4] 📖 查看帮助
echo   [0] 🚪 退出
echo.
echo ===============================================

set /p choice=请选择操作 (0-4): 

if "%choice%"=="1" (
    if exist deploy.bat (
        call deploy.bat
    ) else (
        echo ❌ 未找到部署脚本，请检查文件完整性
        pause
    )
    goto end
)

if "%choice%"=="2" (
    if exist setup-env.bat (
        call setup-env.bat
    ) else (
        echo ❌ 未找到配置脚本，请检查文件完整性
        pause
    )
    goto end
)

if "%choice%"=="3" (
    if exist docker-manager.bat (
        call docker-manager.bat
    ) else (
        echo ❌ 未找到管理脚本，请检查文件完整性
        pause
    )
    goto end
)

if "%choice%"=="4" (
    goto show_help
)

if "%choice%"=="0" (
    goto end
)

echo ❌ 无效选择，请重新输入
timeout /t 2 >nul
goto start

:show_help
cls
echo.
echo ===============================================
echo           📖 教育CRM系统使用指南
echo ===============================================
echo.
echo 🚀 快速开始:
echo   1. 首次使用: 选择 "一键部署"
echo   2. 系统会自动检测环境并配置
echo   3. 完成后访问: http://你的IP:5173
echo.
echo 🔧 脚本说明:
echo   - quick-start.bat   : 快速启动向导 (当前)
echo   - deploy.bat        : 一键部署脚本
echo   - setup-env.bat     : 环境配置向导
echo   - docker-manager.bat: 高级管理工具
echo.
echo 📋 默认账户:
echo   用户名: admin
echo   密码: 123456
echo.
echo 🌐 端口说明:
echo   - 前端: 5173
echo   - 后端API: 3000
echo   - 数据库: 5432
echo.
echo 🆘 常见问题:
echo   1. Docker未启动: 请先启动Docker Desktop
echo   2. 端口被占用: 检查其他程序是否占用端口
echo   3. 访问失败: 检查防火墙和网络配置
echo.
pause
goto start

:end
echo.
echo 👋 感谢使用教育CRM系统！