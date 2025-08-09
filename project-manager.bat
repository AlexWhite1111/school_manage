@echo off
chcp 65001 >nul
title Project4 一键部署与配置管理工作台

REM 检查PowerShell是否可用
powershell -Command "exit" >nul 2>&1
if errorlevel 1 (
    echo ❌ 系统未安装PowerShell，无法运行
    echo 请安装PowerShell 7+ 或在Windows 10/11上使用
    pause
    exit /b 1
)

REM 运行PowerShell脚本
powershell -ExecutionPolicy Bypass -File "%~dp0project-manager.ps1"

REM 如果PowerShell脚本执行失败
if errorlevel 1 (
    echo.
    echo ❌ PowerShell脚本执行失败
    echo 请尝试手动运行：powershell -ExecutionPolicy Bypass -File project-manager.ps1
    pause
)