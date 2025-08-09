@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

:main_menu
cls
echo.
echo ===============================================
echo       🐳 教育CRM系统 Docker管理器 v2.0
echo ===============================================
echo.
echo 📋 系统管理:
echo   [1] 🚀 完整部署 (新系统)
echo   [2] 📊 查看服务状态
echo   [3] 🔄 重启所有服务
echo   [4] 🛑 停止所有服务
echo   [5] 🗑️  完全清理 (删除所有数据)
echo.
echo 💾 数据库管理:
echo   [6] 🔄 重置数据库结构
echo   [7] 📥 运行数据库迁移
echo   [8] 🎛️  打开数据库管理界面
echo.
echo 🌱 数据初始化:
echo   [9] 👤 仅导入管理员账户
echo   [10] 🏷️  仅导入标签配置
echo   [11] 🧠 仅导入Growth配置
echo   [12] 🎭 导入演示数据 (包含测试学生)
echo.
echo 🧹 数据清理:
echo   [13] 👥 清除所有客户数据
echo   [14] 📚 清除所有学生数据
echo   [15] 📝 清除所有成长日志
echo   [16] 📊 清除所有考试数据
echo.
echo 🔧 维护工具:
echo   [17] 📋 查看详细日志
echo   [18] 🔍 系统健康检查
echo   [19] 📦 重新构建服务
echo   [20] 💻 进入后端容器
echo.
echo   [0] 🚪 退出
echo.
echo ===============================================

set /p choice=🎯 请选择操作 (0-20): 

if "%choice%"=="1" goto deploy_full
if "%choice%"=="2" goto show_status
if "%choice%"=="3" goto restart_services
if "%choice%"=="4" goto stop_services
if "%choice%"=="5" goto cleanup_all

if "%choice%"=="6" goto reset_database
if "%choice%"=="7" goto run_migration
if "%choice%"=="8" goto open_db_studio

if "%choice%"=="9" goto seed_admin_only
if "%choice%"=="10" goto seed_tags_only
if "%choice%"=="11" goto seed_growth_only
if "%choice%"=="12" goto seed_demo_data

if "%choice%"=="13" goto clear_customers
if "%choice%"=="14" goto clear_students
if "%choice%"=="15" goto clear_growth_logs
if "%choice%"=="16" goto clear_exam_data

if "%choice%"=="17" goto show_logs
if "%choice%"=="18" goto health_check
if "%choice%"=="19" goto rebuild_services
if "%choice%"=="20" goto enter_backend

if "%choice%"=="0" goto exit_script

echo ❌ 无效选择，请重新输入
timeout /t 2 >nul
goto main_menu

:deploy_full
echo.
echo 🚀 开始完整部署...
echo ===============================================
echo.

echo 1️⃣ 检查Docker环境...
where docker >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Docker，请先安装Docker Desktop
    goto pause_return
)
echo ✅ Docker环境正常

echo.
echo 2️⃣ 创建环境配置...
if not exist .env (
    copy deploy.env .env
    echo ✅ 环境配置文件已创建
) else (
    echo ℹ️  环境配置文件已存在
)

echo.
echo 3️⃣ 构建并启动服务...
docker compose up -d --build
if errorlevel 1 (
    echo ❌ 服务启动失败
    goto pause_return
)
echo ✅ 服务启动成功

echo.
echo 4️⃣ 等待服务就绪 (30秒)...
timeout /t 30 /nobreak >nul

echo.
echo 5️⃣ 初始化数据库...
call :run_db_migration
call :run_seed_growth
call :run_seed_admin
call :run_seed_config

echo.
echo 🎉 完整部署完成！
echo ===============================================
echo 📱 访问地址: http://localhost:5173
echo 🔑 管理员账户: admin / 123456
echo ===============================================
goto pause_return

:show_status
echo.
echo 📊 服务状态检查...
echo ===============================================
docker compose ps
echo.
echo 🔍 容器详细信息:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
goto pause_return

:restart_services
echo.
echo 🔄 重启所有服务...
docker compose restart
echo ✅ 服务重启完成
goto pause_return

:stop_services
echo.
echo 🛑 停止所有服务...
docker compose down
echo ✅ 服务已停止
goto pause_return

:cleanup_all
echo.
echo ⚠️  警告: 此操作将删除所有数据，包括数据库内容！
set /p confirm=❓ 确认执行完全清理? (y/N): 
if /i not "%confirm%"=="y" (
    echo ℹ️  操作已取消
    goto pause_return
)
echo.
echo 🗑️  执行完全清理...
docker compose down -v
docker system prune -f
echo ✅ 清理完成
goto pause_return

:reset_database
echo.
echo 🔄 重置数据库结构...
call :ensure_backend_running
docker exec project4-backend npx prisma db push --force-reset
if errorlevel 1 (
    echo ❌ 数据库重置失败
    goto pause_return
)
echo ✅ 数据库结构重置完成
goto pause_return

:run_migration
echo.
echo 📥 运行数据库迁移...
call :ensure_backend_running
call :run_db_migration
goto pause_return

:open_db_studio
echo.
echo 🎛️  启动数据库管理界面...
call :ensure_backend_running
echo ℹ️  正在启动Prisma Studio...
echo 📱 访问地址: http://localhost:5555
echo ⚠️  按Ctrl+C停止，然后按任意键返回菜单
docker exec -it project4-backend npx prisma studio
goto pause_return

:seed_admin_only
echo.
echo 👤 导入管理员账户...
call :ensure_backend_running
call :run_seed_admin
goto pause_return

:seed_tags_only
echo.
echo 🏷️  导入标签配置...
call :ensure_backend_running
call :run_seed_config
goto pause_return

:seed_growth_only
echo.
echo 🧠 导入Growth配置...
call :ensure_backend_running
call :run_seed_growth
goto pause_return

:seed_demo_data
echo.
echo 🎭 导入演示数据 (包含测试学生)...
call :ensure_backend_running
docker exec project4-backend npm run seed-demo
if errorlevel 1 (
    echo ❌ 演示数据导入失败
    echo ℹ️  提示: 请先确保基础配置已导入
    goto pause_return
)
echo ✅ 演示数据导入完成
goto pause_return

:clear_customers
echo.
echo ⚠️  警告: 此操作将删除所有客户数据！
set /p confirm=❓ 确认删除所有客户数据? (y/N): 
if /i not "%confirm%"=="y" (
    echo ℹ️  操作已取消
    goto pause_return
)
call :ensure_backend_running
echo 👥 清除客户数据...
docker exec project4-backend sh -c "echo 'DELETE FROM communication_logs; DELETE FROM customer_tags; DELETE FROM customers;' | npx prisma db execute --stdin"
if errorlevel 1 (
    echo ❌ 客户数据清除失败
) else (
    echo ✅ 客户数据清除完成
)
goto pause_return

:clear_students
echo.
echo ⚠️  警告: 此操作将删除所有学生相关数据！
set /p confirm=❓ 确认删除所有学生数据? (y/N): 
if /i not "%confirm%"=="y" (
    echo ℹ️  操作已取消
    goto pause_return
)
call :ensure_backend_running
echo 📚 清除学生数据...
docker exec project4-backend sh -c "echo 'DELETE FROM growth_logs; DELETE FROM attendance_records; DELETE FROM enrollments; DELETE FROM classes;' | npx prisma db execute --stdin"
if errorlevel 1 (
    echo ❌ 学生数据清除失败
) else (
    echo ✅ 学生数据清除完成
)
goto pause_return

:clear_growth_logs
echo.
echo ⚠️  警告: 此操作将删除所有成长日志！
set /p confirm=❓ 确认删除所有成长日志? (y/N): 
if /i not "%confirm%"=="y" (
    echo ℹ️  操作已取消
    goto pause_return
)
call :ensure_backend_running
echo 📝 清除成长日志...
docker exec project4-backend sh -c "echo 'DELETE FROM growth_states; DELETE FROM growth_logs;' | npx prisma db execute --stdin"
if errorlevel 1 (
    echo ❌ 成长日志清除失败
) else (
    echo ✅ 成长日志清除完成
)
goto pause_return

:clear_exam_data
echo.
echo ⚠️  警告: 此操作将删除所有考试数据！
set /p confirm=❓ 确认删除所有考试数据? (y/N): 
if /i not "%confirm%"=="y" (
    echo ℹ️  操作已取消
    goto pause_return
)
call :ensure_backend_running
echo 📊 清除考试数据...
docker exec project4-backend sh -c "echo 'DELETE FROM exam_scores; DELETE FROM exams;' | npx prisma db execute --stdin"
if errorlevel 1 (
    echo ❌ 考试数据清除失败
) else (
    echo ✅ 考试数据清除完成
)
goto pause_return

:show_logs
echo.
echo 📋 选择要查看的服务日志:
echo   [1] 后端服务日志
echo   [2] 前端服务日志  
echo   [3] 数据库服务日志
echo   [4] 所有服务日志
echo.
set /p log_choice=选择 (1-4): 

if "%log_choice%"=="1" (
    echo.
    echo 📋 后端服务日志 (最近50行):
    docker logs project4-backend --tail 50
) else if "%log_choice%"=="2" (
    echo.
    echo 📋 前端服务日志 (最近50行):
    docker logs project4-frontend --tail 50
) else if "%log_choice%"=="3" (
    echo.
    echo 📋 数据库服务日志 (最近50行):
    docker logs project4-db --tail 50
) else if "%log_choice%"=="4" (
    echo.
    echo 📋 所有服务日志:
    docker compose logs --tail 20
) else (
    echo ❌ 无效选择
)
goto pause_return

:health_check
echo.
echo 🔍 系统健康检查...
echo ===============================================

echo 1️⃣ 检查容器状态:
docker compose ps

echo.
echo 2️⃣ 检查后端API健康:
curl -s http://localhost:3000/health
if errorlevel 1 (
    echo ❌ 后端API无响应
) else (
    echo.
    echo ✅ 后端API正常
)

echo.
echo 3️⃣ 检查前端服务:
curl -s -o nul -w "%%{http_code}" http://localhost:5173
if errorlevel 1 (
    echo ❌ 前端服务无响应
) else (
    echo ✅ 前端服务正常
)

echo.
echo 4️⃣ 检查数据库连接:
docker exec project4-backend sh -c "echo 'SELECT 1;' | npx prisma db execute --stdin" > nul 2>&1
if errorlevel 1 (
    echo ❌ 数据库连接失败
) else (
    echo ✅ 数据库连接正常
)

echo.
echo ===============================================
goto pause_return

:rebuild_services
echo.
echo 📦 重新构建服务...
echo ⚠️  注意: 这将重新构建Docker镜像，可能需要几分钟
set /p confirm=❓ 确认重新构建? (y/N): 
if /i not "%confirm%"=="y" (
    echo ℹ️  操作已取消
    goto pause_return
)
docker compose down
docker compose build --no-cache
docker compose up -d
echo ✅ 服务重新构建完成
goto pause_return

:enter_backend
echo.
echo 💻 进入后端容器...
echo ℹ️  输入 'exit' 退出容器
call :ensure_backend_running
docker exec -it project4-backend sh
goto pause_return

:ensure_backend_running
docker ps | findstr project4-backend >nul
if errorlevel 1 (
    echo ⚠️  后端服务未运行，正在启动...
    docker compose up -d backend
    timeout /t 10 >nul
)
exit /b

:run_db_migration
echo 📥 执行数据库迁移...
docker exec project4-backend npx prisma migrate deploy
if errorlevel 1 (
    echo ⚠️  迁移失败，尝试强制重置...
    docker exec project4-backend npx prisma db push --force-reset
)
exit /b

:run_seed_admin
echo 👤 创建管理员账户...
docker exec project4-backend npm run seed-admin
if errorlevel 1 (
    echo ❌ 管理员账户创建失败
) else (
    echo ✅ 管理员账户创建成功 (admin/123456)
)
exit /b

:run_seed_config
echo 🏷️  导入标签配置...
docker exec project4-backend npm run seed:config
if errorlevel 1 (
    echo ❌ 标签配置导入失败
) else (
    echo ✅ 标签配置导入成功
)
exit /b

:run_seed_growth
echo 🧠 导入Growth配置...
docker exec project4-backend npm run seed:growth-config
if errorlevel 1 (
    echo ❌ Growth配置导入失败
) else (
    echo ✅ Growth配置导入成功
)
exit /b

:pause_return
echo.
pause
goto main_menu

:exit_script
echo.
echo 👋 感谢使用教育CRM系统Docker管理器！
echo.
exit /b 0