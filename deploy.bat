@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

cls
echo.
echo ===============================================
echo       🚀 教育CRM系统一键部署脚本 v1.0
echo ===============================================
echo.

REM 检查.env文件
if not exist .env (
    echo ⚠️  未找到 .env 配置文件
    echo 🔧 正在启动环境配置向导...
    echo.
    call setup-env.bat
    if not exist .env (
        echo ❌ 配置失败，部署中止
        goto error_exit
    )
)

echo 📊 检查Docker环境...
where docker >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Docker，请先安装Docker Desktop
    echo 📥 下载地址: https://www.docker.com/products/docker-desktop/
    goto error_exit
)

docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker引擎无法连接
    echo ℹ️  请确保Docker Desktop已启动并正在运行
    echo ℹ️  启动可能需要2-3分钟，请稍后重试
    goto error_exit
)
echo ✅ Docker环境正常

echo.
echo 📋 读取部署配置...
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr "DEPLOY_HOST="') do set DEPLOY_HOST=%%b
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr "PROTOCOL="') do set PROTOCOL=%%b

if defined DEPLOY_HOST (
    echo ✅ 部署地址: %DEPLOY_HOST%
    echo ✅ 访问协议: %PROTOCOL%
) else (
    echo ❌ 配置文件格式错误
    goto error_exit
)

echo.
echo 🛑 停止现有服务...
docker compose down
if errorlevel 1 (
    echo ⚠️  停止服务时出现错误，继续部署...
)

echo.
echo 🔧 重新构建并启动服务...
echo ℹ️  这可能需要几分钟时间，请耐心等待...
docker compose up -d --build --force-recreate
if errorlevel 1 (
    echo ❌ 部署失败
    echo.
    echo 🔍 错误排查建议:
    echo   1. 检查Docker Desktop是否正常运行
    echo   2. 检查端口 3000, 5173 是否被占用
    echo   3. 查看详细错误: docker compose logs
    goto error_exit
)

echo ✅ 服务启动成功！

echo.
echo ⏳ 等待服务就绪...
timeout /t 15 /nobreak >nul

echo.
echo 🔍 检查服务状态...
docker compose ps

echo.
echo 🎉 部署完成！
echo ===============================================
echo 📱 前端访问地址: %PROTOCOL%://%DEPLOY_HOST%:5173
echo 🔗 后端API地址: %PROTOCOL%://%DEPLOY_HOST%:3000/api
echo 🔑 默认管理员: admin / 123456
echo ===============================================
echo.
echo 💡 服务管理:
echo   - 查看状态: docker compose ps
echo   - 查看日志: docker compose logs
echo   - 停止服务: docker compose down
echo   - 重启服务: docker compose restart
echo.

REM 可选：自动打开浏览器
set /p open_browser=❓ 是否自动打开浏览器? (y/N): 
if /i "!open_browser!"=="y" (
    start %PROTOCOL%://%DEPLOY_HOST%:5173
)

echo.
echo ✅ 部署脚本执行完成
goto normal_exit

:error_exit
echo.
echo ❌ 部署失败，请检查上述错误信息
pause
exit /b 1

:normal_exit
pause
exit /b 0