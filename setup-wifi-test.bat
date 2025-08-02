@echo off
chcp 65001 >nul
title WiFi内网测试环境配置

echo ====================================
echo 🌐 WiFi内网测试环境配置
echo ====================================
echo.

echo 📍 检测到你的IP地址: 198.18.0.1
echo.

echo 🔧 正在配置环境...

:: 获取实际IP地址
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set LOCAL_IP=%%j
        goto :ip_found
    )
)
:ip_found

echo 📝 创建前端环境配置...
echo # WiFi内网测试配置 > frontend\.env.local
echo VITE_API_BASE_URL=http://%LOCAL_IP%:3000/api >> frontend\.env.local
echo VITE_APP_TITLE=教育CRM系统 (内网测试) >> frontend\.env.local
echo VITE_NODE_ENV=development >> frontend\.env.local

echo 📝 创建后端环境配置...
echo # WiFi内网测试配置 > backend\.env.local
echo NODE_ENV=development >> backend\.env.local
echo PORT=3000 >> backend\.env.local
echo HOST=0.0.0.0 >> backend\.env.local
echo # 使用你现有的数据库URL >> backend\.env.local

echo.
echo ✅ 配置完成！
echo.
echo 📋 接下来的步骤:
echo.
echo 1. 💾 确保数据库正在运行
echo 2. 🚀 启动后端服务: cd backend ^&^& npm run dev
echo 3. 🎨 启动前端服务: cd frontend ^&^& npm run dev
echo 4. 🔧 配置防火墙允许端口 3001 和 5173
echo.
echo 📱 在其他设备上访问:
echo    前端: http://%LOCAL_IP%:5173
echo    后端API: http://%LOCAL_IP%:3000/api
echo    健康检查: http://%LOCAL_IP%:3000/health
echo.

echo 🔥 配置Windows防火墙规则...
netsh advfirewall firewall add rule name="Education CRM Backend" dir=in action=allow protocol=TCP localport=3000 2>nul
netsh advfirewall firewall add rule name="Education CRM Frontend" dir=in action=allow protocol=TCP localport=5173 2>nul

if %errorlevel% equ 0 (
    echo ✅ 防火墙规则添加成功
) else (
    echo ⚠️  防火墙规则添加失败，可能需要管理员权限
    echo    请手动在Windows Defender防火墙中允许端口 3000 和 5173
)

echo.
echo 💡 提示:
echo    - 确保所有设备连接到同一WiFi网络
echo    - 如果访问失败，请检查防火墙设置
echo    - 后端启动后会显示详细的网络访问信息
echo.

pause 