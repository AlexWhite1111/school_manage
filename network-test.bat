@echo off
chcp 65001 >nul
title 网络连接测试工具

:MENU
cls
echo ====================================
echo 🌐 网络连接测试工具
echo ====================================
echo.
echo 请选择测试选项:
echo.
echo 1. 🏠 本地环境测试
echo 2. 📶 内网连接测试  
echo 3. 🌍 外网访问测试
echo 4. 🔧 网络配置信息
echo 5. 🚀 启动开发服务
echo 6. ❌ 退出
echo.

set /p choice="请输入选项 (1-6): "

if "%choice%"=="1" goto LOCAL_TEST
if "%choice%"=="2" goto NETWORK_TEST
if "%choice%"=="3" goto EXTERNAL_TEST
if "%choice%"=="4" goto NETWORK_INFO
if "%choice%"=="5" goto START_SERVICES
if "%choice%"=="6" goto EXIT

echo 无效选项，请重新选择...
timeout /t 2 >nul
goto MENU

:LOCAL_TEST
cls
echo 🏠 本地环境测试
echo ====================================
echo.

echo 🔍 检查Node.js环境...
node --version >nul 2>&1 && echo ✅ Node.js 已安装 || echo ❌ Node.js 未安装
echo.

echo 🔍 检查npm环境...
npm --version >nul 2>&1 && echo ✅ npm 已安装 || echo ❌ npm 未安装
echo.

echo 🔍 检查项目依赖...
if exist "backend\node_modules" (
    echo ✅ 后端依赖已安装
) else (
    echo ❌ 后端依赖未安装
    echo    请运行: cd backend && npm install
)

if exist "frontend\node_modules" (
    echo ✅ 前端依赖已安装  
) else (
    echo ❌ 前端依赖未安装
    echo    请运行: cd frontend && npm install
)
echo.

echo 🔍 检查端口占用...
netstat -ano | findstr :3001 >nul && echo ⚠️  端口3001已被占用 || echo ✅ 端口3001可用
netstat -ano | findstr :5173 >nul && echo ⚠️  端口5173已被占用 || echo ✅ 端口5173可用
echo.

echo 🔍 测试本地连接...
timeout /t 1 >nul
curl -s http://localhost:3001/health >nul 2>&1 && echo ✅ 后端服务正常 || echo ❌ 后端服务未启动
curl -s http://localhost:5173 >nul 2>&1 && echo ✅ 前端服务正常 || echo ❌ 前端服务未启动

pause
goto MENU

:NETWORK_TEST
cls
echo 📶 内网连接测试
echo ====================================
echo.

echo 🔍 获取本机IP地址...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        echo 本机IP: %%j
        set LOCAL_IP=%%j
    )
)
echo.

echo 🔍 检查防火墙设置...
netsh advfirewall firewall show rule name="Node.js" >nul 2>&1 && echo ✅ Node.js防火墙规则已配置 || echo ⚠️  建议配置Node.js防火墙规则
echo.

if defined LOCAL_IP (
    echo 🔍 测试内网访问...
    echo 后端地址: http://%LOCAL_IP%:3001
    echo 前端地址: http://%LOCAL_IP%:5173
    echo.
    
    ping -n 1 %LOCAL_IP% >nul && echo ✅ 本机IP可达 || echo ❌ 本机IP不可达
    
    echo.
    echo 💡 在其他设备上测试这些地址:
    echo    后端健康检查: http://%LOCAL_IP%:3001/health
    echo    前端应用: http://%LOCAL_IP%:5173
)

pause
goto MENU

:EXTERNAL_TEST
cls
echo 🌍 外网访问测试
echo ====================================
echo.

echo 🔍 检查网络连通性...
ping -n 1 8.8.8.8 >nul && echo ✅ 外网连通正常 || echo ❌ 外网连接失败
ping -n 1 baidu.com >nul && echo ✅ DNS解析正常 || echo ❌ DNS解析失败
echo.

echo 🔍 检查常用端口...
telnet google.com 80 2>nul && echo ✅ HTTP端口(80)可访问 || echo ❌ HTTP端口(80)被阻止
telnet google.com 443 2>nul && echo ✅ HTTPS端口(443)可访问 || echo ❌ HTTPS端口(443)被阻止
echo.

echo 💡 外网访问建议:
echo    1. 使用ngrok进行内网穿透
echo    2. 配置路由器端口转发
echo    3. 部署到云服务器
echo.

pause
goto MENU

:NETWORK_INFO
cls
echo 🔧 网络配置信息
echo ====================================
echo.

echo 📋 网络接口信息:
ipconfig /all | findstr /c:"以太网适配器" /c:"无线局域网适配器" /c:"IPv4 地址"
echo.

echo 📋 路由表信息:
route print | findstr "0.0.0.0"
echo.

echo 📋 DNS服务器:
ipconfig /all | findstr "DNS 服务器"
echo.

echo 📋 当前监听端口:
netstat -ano | findstr "LISTENING" | findstr ":3001\|:5173\|:80\|:443"
echo.

pause
goto MENU

:START_SERVICES
cls
echo 🚀 启动开发服务
echo ====================================
echo.

echo 💡 将在新窗口中启动服务...
echo    后端: http://localhost:3001
echo    前端: http://localhost:5173
echo.

echo 🔧 启动后端服务...
start "后端服务" cmd /c "cd backend && npm run dev"
timeout /t 3 >nul

echo 🔧 启动前端服务...
start "前端服务" cmd /c "cd frontend && npm run dev"
echo.

echo ✅ 服务启动完成!
echo.
echo 📝 下次测试建议:
echo    1. 等待几秒让服务完全启动
echo    2. 运行选项1进行本地测试
echo    3. 运行选项2进行内网测试

pause
goto MENU

:EXIT
echo 再见! 👋
timeout /t 1 >nul
exit 