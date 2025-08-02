@echo off
title 启动WiFi内网测试环境

echo ====================================
echo 🚀 启动WiFi内网测试环境
echo ====================================
echo.

echo 📍 你的IP地址: 198.18.0.1
echo 📱 其他设备访问地址:
echo    前端: http://198.18.0.1:5173
echo    后端: http://198.18.0.1:3000
echo.

echo 🔧 启动后端服务...
start "教育CRM后端" cmd /k "cd backend && echo 🚀 启动后端服务... && npm run dev"

echo ⏳ 等待后端启动...
timeout /t 5 /nobreak >nul

echo 🎨 启动前端服务...
start "教育CRM前端" cmd /k "cd frontend && echo 🎨 启动前端服务... && npm run dev"

echo.
echo ✅ 服务启动中...
echo.
echo 📋 测试步骤:
echo 1. 等待两个服务窗口完全启动 (大约30-60秒)
echo 2. 在本机浏览器访问: http://localhost:5173
echo 3. 在其他设备浏览器访问: http://198.18.0.1:5173
echo 4. 确保所有设备连接到同一WiFi网络
echo.
echo 💡 故障排除:
echo - 如果无法访问，检查Windows防火墙设置
echo - 确保数据库服务正在运行
echo - 查看服务窗口的错误信息
echo.

pause 