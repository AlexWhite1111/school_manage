# 💻 桌面端构建和测试指南

## 🔧 环境准备

### 当前问题
Electron项目存在TypeScript版本兼容性问题，需要修复依赖冲突。

## 🛠️ 修复步骤

### 方案1: 降级TypeScript (推荐)
```bash
cd frontend/electron
npm install typescript@4.9.5 --save-dev
npm run build
```

### 方案2: 更新依赖
```bash
cd frontend/electron
npm update
npm run build
```

### 方案3: 忽略类型检查
```bash
cd frontend/electron
# 编辑 tsconfig.json 添加:
# "skipLibCheck": true
```

## 💻 构建桌面应用

### 步骤1: 修复依赖并构建
```bash
cd frontend/electron
npm install typescript@4.9.5 --save-dev
npm run build
```

### 步骤2: 打包应用
```bash
# 开发版本打包
npm run electron:pack

# 生产版本打包  
npm run electron:make
```

### 步骤3: 运行应用
```bash
# 开发模式运行
npm run electron:start

# 或直接运行打包文件
# 位置: frontend/electron/dist/
```

## 🧪 桌面端测试内容

### 基本功能测试
- [ ] 应用启动和窗口显示
- [ ] 菜单栏功能
- [ ] 窗口大小调整
- [ ] 最小化/最大化/关闭
- [ ] Web内容加载

### 桌面特性测试
- [ ] 快捷键支持
- [ ] 系统托盘 (如有)
- [ ] 自动更新 (如有)
- [ ] 文件拖拽 (如有)
- [ ] 本地存储

### 性能测试
- [ ] 内存使用情况
- [ ] CPU占用率
- [ ] 启动速度
- [ ] 响应速度

## 🎯 预期输出文件

### Windows
- **开发版**: `frontend/electron/dist/win-unpacked/自然教育.exe`
- **安装包**: `frontend/electron/dist/自然教育 Setup 1.0.0.exe`

### macOS  
- **开发版**: `frontend/electron/dist/mac/自然教育.app`
- **安装包**: `frontend/electron/dist/自然教育-1.0.0.dmg`

## 🔧 配置文件

### 应用信息
- **应用名**: 自然教育  
- **版本**: 1.0.0
- **描述**: An Amazing Capacitor App
- **图标**: `frontend/electron/assets/appIcon.ico`

### 构建配置
配置文件: `frontend/electron/electron-builder.config.json`