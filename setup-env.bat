@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

cls
echo.
echo ===============================================
echo       🌐 教育CRM系统环境配置向导 v1.0
echo ===============================================
echo.
echo 📝 此脚本将帮助您快速配置部署环境
echo.

REM 检查是否已存在.env文件
if exist .env (
    echo ⚠️  发现现有的 .env 文件
    set /p overwrite=❓ 是否覆盖现有配置? (y/N): 
    if /i not "!overwrite!"=="y" (
        echo ℹ️  保持现有配置，脚本退出
        goto end
    )
)

echo.
echo 🎯 请选择部署类型:
echo   [1] 本地开发环境 (localhost)
echo   [2] 公网IP部署
echo   [3] 域名部署
echo   [4] 自定义配置
echo.
set /p deploy_type=请选择 (1-4): 

if "%deploy_type%"=="1" (
    set DEPLOY_HOST=localhost
    set PROTOCOL=http
    goto config_created
)

if "%deploy_type%"=="2" (
    echo.
    echo 🔍 正在获取您的公网IP...
    for /f "delims=" %%i in ('powershell -Command "(Invoke-WebRequest -Uri 'http://ifconfig.me/ip' -UseBasicParsing).Content.Trim()" 2^>nul') do set AUTO_IP=%%i
    
    if defined AUTO_IP (
        echo ✅ 检测到公网IP: !AUTO_IP!
        set /p use_auto=❓ 使用检测到的IP? (Y/n): 
        if /i not "!use_auto!"=="n" (
            set DEPLOY_HOST=!AUTO_IP!
        ) else (
            set /p DEPLOY_HOST=请输入您的公网IP: 
        )
    ) else (
        echo ⚠️  自动检测失败，请手动输入
        set /p DEPLOY_HOST=请输入您的公网IP: 
    )
    set PROTOCOL=http
    goto config_created
)

if "%deploy_type%"=="3" (
    set /p DEPLOY_HOST=请输入您的域名 (如: crm.example.com): 
    set /p use_https=❓ 使用HTTPS? (Y/n): 
    if /i not "!use_https!"=="n" (
        set PROTOCOL=https
    ) else (
        set PROTOCOL=http
    )
    goto config_created
)

if "%deploy_type%"=="4" (
    set /p DEPLOY_HOST=请输入部署地址: 
    set /p PROTOCOL=请输入协议 (http/https): 
    goto config_created
)

echo ❌ 无效选择
goto end

:config_created
echo.
set /p JWT_SECRET=请输入JWT密钥 (留空使用默认): 
if "%JWT_SECRET%"=="" set JWT_SECRET=education_crm_jwt_secret_2024_please_change_in_production

echo.
set /p DB_PASSWORD=请输入数据库密码 (留空使用默认): 
if "%DB_PASSWORD%"=="" set DB_PASSWORD=229791

echo.
echo 📝 正在创建 .env 文件...

REM 创建.env文件
(
echo # ===============================================
echo # 🌐 教育CRM系统环境配置
echo # 生成时间: %date% %time%
echo # 部署类型: %deploy_type%
echo # ===============================================
echo.
echo # 🎯 部署配置
echo DEPLOY_HOST=%DEPLOY_HOST%
echo PROTOCOL=%PROTOCOL%
echo.
echo # 📡 API配置
echo VITE_API_BASE_URL=%PROTOCOL%://%DEPLOY_HOST%:3000/api
echo.
echo # 🔒 CORS配置
echo ALLOWED_ORIGINS=%PROTOCOL%://%DEPLOY_HOST%:5173,%PROTOCOL%://%DEPLOY_HOST%:80,%PROTOCOL%://%DEPLOY_HOST%,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://localhost:5173
echo.
echo # 🗄️ 数据库配置
echo DB_NAME=education_crm
echo DB_USER=postgres
echo DB_PASSWORD=%DB_PASSWORD%
echo.
echo # 🔐 安全配置
echo JWT_SECRET=%JWT_SECRET%
echo.
echo # 🚀 服务器配置
echo SERVER_IP=0.0.0.0
echo FRONTEND_PORT=5173
echo BACKEND_PORT=3000
echo DB_PORT=5432
echo.
echo # 🌐 网络配置
echo NETWORK_SUBNET=172.20.0.0/16
) > .env

echo ✅ .env 文件创建完成！
echo.
echo 📋 配置摘要:
echo ===============================================
echo 部署地址: %DEPLOY_HOST%
echo 协议: %PROTOCOL%
echo 前端访问: %PROTOCOL%://%DEPLOY_HOST%:5173
echo API地址: %PROTOCOL%://%DEPLOY_HOST%:3000/api
echo ===============================================
echo.
echo 🚀 下一步:
echo   1. 运行 deploy.bat 进行一键部署
echo   2. 或手动运行: docker compose up -d --build
echo.

:end
pause