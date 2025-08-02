@echo off
chcp 65001 >nul
title 数据库管理工具

:MENU
cls
echo ====================================
echo 🗃️  数据库管理工具
echo ====================================
echo.
echo 请选择操作:
echo.
echo 1. 🏭 生产环境初始化 (基础数据)
echo 2. 🛠️  开发环境初始化 (含测试数据)
echo 3. 🔄 仅执行数据库迁移
echo 4. 📊 查看数据库状态
echo 5. 🗑️  重置开发数据库 (危险操作)
echo 6. ❌ 退出
echo.

set /p choice="请输入选项 (1-6): "

if "%choice%"=="1" goto PRODUCTION
if "%choice%"=="2" goto DEVELOPMENT  
if "%choice%"=="3" goto MIGRATE
if "%choice%"=="4" goto STATUS
if "%choice%"=="5" goto RESET
if "%choice%"=="6" goto EXIT

echo 无效选项，请重新选择...
timeout /t 2 >nul
goto MENU

:PRODUCTION
cls
echo 🏭 执行生产环境初始化...
call db-init-production.bat
goto MENU

:DEVELOPMENT
cls
echo 🛠️  执行开发环境初始化...
call db-init-development.bat
goto MENU

:MIGRATE
cls
echo 🔄 执行数据库迁移...
call db-migrate-only.bat
goto MENU

:STATUS
cls
echo 📊 查看数据库状态...
echo.
cd /d "%~dp0backend"
echo 🔍 数据库连接状态:
call npx prisma db pull --help >nul 2>&1 && echo ✅ 数据库连接正常 || echo ❌ 数据库连接失败
echo.
echo 📋 迁移状态:
call npx prisma migrate status
echo.
echo 📊 数据统计:
call npx prisma db seed --dry-run 2>nul || echo 使用自定义脚本查看统计信息
echo.
pause
goto MENU

:RESET
cls
echo ⚠️  危险操作: 重置数据库
echo.
echo 此操作将:
echo - 删除所有数据
echo - 重新应用所有迁移
echo - 适用于开发环境
echo.
set /p confirm="确认要重置数据库吗? (输入 YES 确认): "
if not "%confirm%"=="YES" (
    echo 操作已取消
    timeout /t 2 >nul
    goto MENU
)

cd /d "%~dp0backend"
echo 🗑️  重置数据库中...
call npm run db:reset
if errorlevel 1 (
    echo ❌ 重置失败
    pause
    goto MENU
)
echo ✅ 数据库重置完成
echo.
echo 💡 提示: 可以选择选项2重新生成测试数据
pause
goto MENU

:EXIT
echo 再见! 👋
timeout /t 1 >nul
exit 