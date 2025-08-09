# Project4 一键部署与配置管理工作台
# 运行方式：在项目根目录右键 -> "在此处打开PowerShell" -> 输入 .\project-manager.ps1

param(
    [string]$Action = "menu"
)

# 检查Docker是否运行
function Test-DockerRunning {
    try {
        $null = docker ps 2>$null
        return $true
    } catch {
        return $false
    }
}

# 显示主菜单
function Show-MainMenu {
    Clear-Host
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "    Project4 配置管理工作台" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-DockerRunning)) {
        Write-Host "⚠️  警告：Docker Desktop 未运行或未安装" -ForegroundColor Red
        Write-Host "   请先启动 Docker Desktop 后再使用本工具" -ForegroundColor Red
        Write-Host ""
    }
    
    Write-Host "【部署管理】" -ForegroundColor Green
    Write-Host "1. 🚀 一键部署（首次安装）"
    Write-Host "2. 🔄 快速启动（日常使用）"
    Write-Host "3. ⏹️  停止所有服务"
    Write-Host "4. 🔄 重启所有服务"
    Write-Host ""
    Write-Host "【配置管理】" -ForegroundColor Green
    Write-Host "5. ⚙️  编辑 deploy.env 配置"
    Write-Host "6. 🌐 配置网络访问（路由器+防火墙）"
    Write-Host "7. 👤 重置管理员账户"
    Write-Host ""
    Write-Host "【状态监控】" -ForegroundColor Green
    Write-Host "8. 📊 查看服务状态"
    Write-Host "9. 📝 查看服务日志"
    Write-Host "10. 🔍 网络连接测试"
    Write-Host ""
    Write-Host "【数据库管理】" -ForegroundColor Green
    Write-Host "11. 🗄️  数据库迁移/更新"
    Write-Host "12. 🗃️  备份数据库"
    Write-Host ""
    Write-Host "0. ❌ 退出" -ForegroundColor Red
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
}

# 一键部署
function Deploy-FirstTime {
    Write-Host "🚀 开始一键部署..." -ForegroundColor Yellow
    
    # 检查 deploy.env
    if (-not (Test-Path "deploy.env")) {
        Write-Host "❌ 未找到 deploy.env 文件" -ForegroundColor Red
        Write-Host "正在从 env.example 创建..." -ForegroundColor Yellow
        if (Test-Path "env.example") {
            Copy-Item "env.example" "deploy.env"
            Write-Host "✅ 已创建 deploy.env，请先编辑配置（选项5）" -ForegroundColor Green
            return
        } else {
            Write-Host "❌ 也未找到 env.example 文件" -ForegroundColor Red
            return
        }
    }
    
    Write-Host "📦 构建并启动所有服务..." -ForegroundColor Cyan
    docker-compose --env-file deploy.env down 2>$null
    docker-compose --env-file deploy.env up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "⏳ 等待服务启动（30秒）..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        Write-Host "🗄️  初始化数据库..." -ForegroundColor Cyan
        docker-compose exec -T backend sh -c "npx prisma db push"
        
        Write-Host "👤 创建管理员账户（admin/123456）..." -ForegroundColor Cyan
        docker-compose exec -T backend sh -c "node dist/prisma/seed-admin.js"
        
        Write-Host ""
        Write-Host "🎉 部署完成！" -ForegroundColor Green
        Write-Host "访问地址：" -ForegroundColor Yellow
        Write-Host "  本机：http://localhost/" -ForegroundColor White
        Write-Host "  公网：http://你的公网IP/" -ForegroundColor White
        Write-Host "  管理员：admin / 123456" -ForegroundColor White
    } else {
        Write-Host "❌ 部署失败，请检查 Docker 状态" -ForegroundColor Red
    }
}

# 快速启动
function Start-Services {
    Write-Host "🔄 快速启动服务..." -ForegroundColor Yellow
    docker-compose --env-file deploy.env up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 服务启动成功" -ForegroundColor Green
        Show-ServiceStatus
    } else {
        Write-Host "❌ 启动失败" -ForegroundColor Red
    }
}

# 停止服务
function Stop-Services {
    Write-Host "⏹️  停止所有服务..." -ForegroundColor Yellow
    docker-compose --env-file deploy.env down
    Write-Host "✅ 已停止所有服务" -ForegroundColor Green
}

# 重启服务
function Restart-Services {
    Write-Host "🔄 重启所有服务..." -ForegroundColor Yellow
    docker-compose --env-file deploy.env restart
    Write-Host "✅ 重启完成" -ForegroundColor Green
    Show-ServiceStatus
}

# 编辑配置文件
function Edit-Config {
    if (-not (Test-Path "deploy.env")) {
        Write-Host "❌ deploy.env 不存在，正在创建..." -ForegroundColor Red
        if (Test-Path "env.example") {
            Copy-Item "env.example" "deploy.env"
        } else {
            @"
# 数据库配置
DB_PASSWORD=请改成你自己的强密码
DB_USER=postgres
DB_NAME=project4db
DB_HOST=db
DB_PORT=5432

# JWT配置
JWT_SECRET=请改成一个很长很随机的字符串

# 前端配置
VITE_API_BASE_URL=/api

# CORS配置（多个用逗号分隔，留空=允许所有）
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,http://localhost:5173

# 端口配置
FRONTEND_PORT=80
BACKEND_PORT=3000
DB_PORT=5432

# 网络配置
NETWORK_NAME=project4-network
"@ | Out-File -FilePath "deploy.env" -Encoding UTF8
        }
    }
    
    Write-Host "📝 打开配置文件编辑器..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "重要配置项说明：" -ForegroundColor Yellow
    Write-Host "• DB_PASSWORD: 数据库密码（请修改）" -ForegroundColor White
    Write-Host "• JWT_SECRET: JWT密钥（请修改为长随机字符串）" -ForegroundColor White
    Write-Host "• ALLOWED_ORIGINS: CORS白名单（填入你的公网IP）" -ForegroundColor White
    Write-Host "  格式: http://你的公网IP,http://你的公网IP:80" -ForegroundColor Gray
    Write-Host ""
    
    # 尝试用记事本打开
    try {
        Start-Process notepad.exe -ArgumentList "deploy.env" -Wait
        Write-Host "✅ 配置已保存" -ForegroundColor Green
    } catch {
        Write-Host "❌ 无法打开记事本，请手动编辑 deploy.env 文件" -ForegroundColor Red
    }
}

# 配置网络访问
function Configure-Network {
    Write-Host "🌐 网络访问配置向导" -ForegroundColor Cyan
    Write-Host ""
    
    # 获取本机内网IP
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match "^192\.168\.|^10\.|^172\."} | Select-Object -First 1).IPAddress
    Write-Host "📍 检测到内网IP: $localIP" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "=== 路由器端口转发设置 ===" -ForegroundColor Green
    Write-Host "1. 登录路由器管理界面（通常是 http://192.168.1.1）"
    Write-Host "2. 找到【端口转发】或【虚拟服务器】设置"
    Write-Host "3. 添加规则："
    Write-Host "   外部端口: 80    -> 内网IP: $localIP  端口: 80" -ForegroundColor White
    Write-Host "   外部端口: 3000  -> 内网IP: $localIP  端口: 3000" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== Windows防火墙设置 ===" -ForegroundColor Green
    $choice = Read-Host "是否自动配置Windows防火墙？(y/n)"
    
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Write-Host "🔥 配置防火墙规则..." -ForegroundColor Yellow
        
        try {
            # 检查是否以管理员运行
            $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
            
            if (-not $isAdmin) {
                Write-Host "⚠️  需要管理员权限，正在重新启动..." -ForegroundColor Yellow
                Start-Process PowerShell -ArgumentList "-File `"$PSCommandPath`" -Action firewall" -Verb RunAs
                return
            }
            
            # 删除旧规则（如果存在）
            Remove-NetFirewallRule -DisplayName "Project4-*" -ErrorAction SilentlyContinue
            
            # 添加新规则
            New-NetFirewallRule -DisplayName "Project4-HTTP-80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any
            New-NetFirewallRule -DisplayName "Project4-Backend-3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any
            New-NetFirewallRule -DisplayName "Project4-Frontend-5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any
            
            Write-Host "✅ 防火墙规则已配置" -ForegroundColor Green
        } catch {
            Write-Host "❌ 防火墙配置失败: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "请手动以管理员身份运行PowerShell并执行以下命令：" -ForegroundColor Yellow
            Write-Host "New-NetFirewallRule -DisplayName 'Project4-HTTP-80' -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "=== 获取公网IP ===" -ForegroundColor Green
    try {
        $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5).Trim()
        Write-Host "🌍 当前公网IP: $publicIP" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "完成配置后，可通过以下地址访问：" -ForegroundColor Green
        Write-Host "  http://$publicIP/" -ForegroundColor White
        Write-Host "  http://$publicIP:3000/ 备用" -ForegroundColor White
    } catch {
        Write-Host "❌ 无法获取公网IP，请手动查询" -ForegroundColor Red
    }
}

# 重置管理员
function Reset-Admin {
    Write-Host "👤 重置管理员账户..." -ForegroundColor Yellow
    docker-compose exec -T backend sh -c "node dist/prisma/seed-admin.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 管理员账户已重置" -ForegroundColor Green
        Write-Host "账户: admin" -ForegroundColor White
        Write-Host "密码: 123456" -ForegroundColor White
    } else {
        Write-Host "❌ 重置失败，请确保后端服务正在运行" -ForegroundColor Red
    }
}

# 显示服务状态
function Show-ServiceStatus {
    Write-Host "📊 服务状态检查..." -ForegroundColor Cyan
    Write-Host ""
    
    # Docker容器状态
    Write-Host "=== Docker 容器状态 ===" -ForegroundColor Green
    docker-compose ps
    Write-Host ""
    
    # 端口监听状态
    Write-Host "=== 端口监听状态 ===" -ForegroundColor Green
    $ports = @(80, 3000, 5432, 5173)
    foreach ($port in $ports) {
        $listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($listening) {
            Write-Host "✅ 端口 $port : 正在监听" -ForegroundColor Green
        } else {
            Write-Host "❌ 端口 $port : 未监听" -ForegroundColor Red
        }
    }
    Write-Host ""
    
    # 健康检查
    Write-Host "=== 服务健康检查 ===" -ForegroundColor Green
    
    # 前端检查
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 前端服务: 正常" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ 前端服务: 异常 ($($_.Exception.Message))" -ForegroundColor Red
    }
    
    # 后端检查
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 后端服务: 正常" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ 后端服务: 异常 ($($_.Exception.Message))" -ForegroundColor Red
    }
}

# 查看日志
function Show-Logs {
    Write-Host "📝 服务日志查看" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "请选择要查看的日志：" -ForegroundColor Yellow
    Write-Host "1. 前端日志"
    Write-Host "2. 后端日志"
    Write-Host "3. 数据库日志"
    Write-Host "4. 所有日志"
    Write-Host ""
    
    $choice = Read-Host "请选择 (1-4)"
    
    switch ($choice) {
        "1" {
            Write-Host "=== 前端日志 最近50行 ===" -ForegroundColor Green
            docker-compose logs frontend --tail=50
        }
        "2" {
            Write-Host "=== 后端日志 最近50行 ===" -ForegroundColor Green
            docker-compose logs backend --tail=50
        }
        "3" {
            Write-Host "=== 数据库日志 最近50行 ===" -ForegroundColor Green
            docker-compose logs db --tail=50
        }
        "4" {
            Write-Host "=== 所有服务日志 最近30行 ===" -ForegroundColor Green
            docker-compose logs --tail=30
        }
        default {
            Write-Host "❌ 无效选择" -ForegroundColor Red
        }
    }
}

# 网络测试
function Test-Network {
    Write-Host "🔍 网络连接测试" -ForegroundColor Cyan
    Write-Host ""
    
    # 获取公网IP
    try {
        $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5).Trim()
        Write-Host "🌍 公网IP: $publicIP" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ 无法获取公网IP" -ForegroundColor Red
        $publicIP = "无法获取"
    }
    
    # 测试本地端口
    Write-Host ""
    Write-Host "=== 本地端口测试 ===" -ForegroundColor Green
    $testUrls = @(
        @{Url="http://localhost/"; Name="前端主页"},
        @{Url="http://localhost:3000/health"; Name="后端健康检查"},
        @{Url="http://localhost/api/health"; Name="API代理"}
    )
    
    foreach ($test in $testUrls) {
        try {
            $response = Invoke-WebRequest -Uri $test.Url -TimeoutSec 5 -UseBasicParsing
            Write-Host "✅ $($test.Name): HTTP $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "❌ $($test.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # 外网访问测试提示
    if ($publicIP -ne "无法获取") {
        Write-Host ""
        Write-Host "=== 外网访问测试 ===" -ForegroundColor Green
        Write-Host "请在其他设备/网络环境下测试以下地址：" -ForegroundColor Yellow
        Write-Host "  http://$publicIP/" -ForegroundColor White
        Write-Host "  http://$publicIP:3000/" -ForegroundColor White
    }
}

# 数据库管理
function Manage-Database {
    Write-Host "数据库管理" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "请选择操作：" -ForegroundColor Yellow
    Write-Host "1. 数据库迁移/更新"
    Write-Host "2. 重置数据库"
    Write-Host "3. 数据库备份"
    Write-Host ""
    
    $choice = Read-Host "请选择 (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Host "执行数据库迁移..." -ForegroundColor Yellow
            docker-compose exec -T backend sh -c "npx prisma migrate deploy"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "迁移失败，尝试 db push..." -ForegroundColor Yellow
                docker-compose exec -T backend sh -c "npx prisma db push"
            }
            Write-Host "数据库迁移完成" -ForegroundColor Green
        }
        "2" {
            $confirm = Read-Host "这将删除所有数据！确认吗？(yes/no)"
            if ($confirm -eq "yes") {
                Write-Host "重置数据库..." -ForegroundColor Red
                docker-compose exec -T backend sh -c "npx prisma db push --force-reset"
                docker-compose exec -T backend sh -c "node dist/prisma/seed-admin.js"
                Write-Host "数据库已重置，管理员账户已重新创建" -ForegroundColor Green
            } else {
                Write-Host "操作已取消" -ForegroundColor Yellow
            }
        }
        "3" {
            $backupFile = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
            Write-Host "备份数据库到 $backupFile ..." -ForegroundColor Yellow
            docker-compose exec -T db pg_dump -U postgres project4db > $backupFile
            if ($LASTEXITCODE -eq 0) {
                Write-Host "备份完成: $backupFile" -ForegroundColor Green
            } else {
                Write-Host "备份失败" -ForegroundColor Red
            }
        }
        default {
            Write-Host "无效选择" -ForegroundColor Red
        }
    }
}

# 处理特殊参数
if ($Action -eq "firewall") {
    # 管理员权限下配置防火墙
    Write-Host "🔥 配置防火墙规则..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Project4-*" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Project4-HTTP-80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any
    New-NetFirewallRule -DisplayName "Project4-Backend-3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any
    New-NetFirewallRule -DisplayName "Project4-Frontend-5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any
    Write-Host "✅ 防火墙规则已配置完成" -ForegroundColor Green
    Read-Host "按回车键退出"
    exit
}

# 主循环
while ($true) {
    Show-MainMenu
    $choice = Read-Host "请选择操作 (0-12)"
    
    switch ($choice) {
        "1" { Deploy-FirstTime }
        "2" { Start-Services }
        "3" { Stop-Services }
        "4" { Restart-Services }
        "5" { Edit-Config }
        "6" { Configure-Network }
        "7" { Reset-Admin }
        "8" { Show-ServiceStatus }
        "9" { Show-Logs }
        "10" { Test-Network }
        "11" { Manage-Database }
        "12" { 
            Write-Host "💾 正在备份数据库..." -ForegroundColor Yellow
            Manage-Database
        }
        "0" { 
            Write-Host "👋 再见！" -ForegroundColor Green
            exit 
        }
        default { 
            Write-Host "❌ 无效选择，请输入 0-12" -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
    
    if ($choice -ne "0") {
        Write-Host ""
        Read-Host "按回车键返回主菜单"
    }
}