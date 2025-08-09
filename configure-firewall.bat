@echo off
echo 配置Windows防火墙开放Project4端口...
echo 需要管理员权限，请在弹出的UAC对话框中点击"是"

REM 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

echo 开放端口 80, 3000, 5173...

REM 删除可能存在的旧规则
netsh advfirewall firewall delete rule name="Project4-HTTP" >nul 2>&1
netsh advfirewall firewall delete rule name="Project4-Backend" >nul 2>&1
netsh advfirewall firewall delete rule name="Project4-Frontend" >nul 2>&1
netsh advfirewall firewall delete rule name="Project4-Ports" >nul 2>&1

REM 添加新规则
netsh advfirewall firewall add rule name="Project4-HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Project4-Backend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Project4-Frontend" dir=in action=allow protocol=TCP localport=5173

if %errorLevel% equ 0 (
    echo ✅ 防火墙配置成功！
    echo 已开放端口：80, 3000, 5173
) else (
    echo ❌ 防火墙配置失败！
)

echo.
echo 按任意键继续...
pause >nul