# 📱 移动端构建和测试指南

## 🔧 环境准备 (手动配置)

### 1. 安装 Java JDK
```bash
# 下载并安装 JDK 17
# 地址: https://adoptium.net/releases.html
# 选择: OpenJDK 17 (LTS) -> Windows x64 -> .msi 安装包
```

### 2. 设置环境变量
**Windows系统设置：**
1. 打开"系统属性" → "高级" → "环境变量"
2. 新建系统变量：
   - 变量名: `JAVA_HOME`
   - 变量值: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot`
3. 编辑Path变量，添加: `%JAVA_HOME%\bin`

### 3. 验证环境
```bash
# 打开新的PowerShell窗口
java -version
javac -version
```

## 📱 构建Android APK

### 步骤1: 准备前端构建
```bash
cd frontend
npm run build
```

### 步骤2: 同步到Android项目
```bash
npx cap sync android
```

### 步骤3: 构建APK
```bash
# 调试版本
npx cap build android

# 或者打开Android Studio进行构建
npx cap open android
```

### 步骤4: 安装到设备
```bash
# APK文件位置:
# frontend/android/app/build/outputs/apk/debug/app-debug.apk

# 通过ADB安装 (需要启用USB调试)
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 🧪 移动端测试内容

### 基本功能测试
- [ ] 应用启动和加载
- [ ] 登录功能 (admin/123456)
- [ ] 主界面导航
- [ ] 数据获取和显示
- [ ] 网络连接状态

### 移动端特性测试  
- [ ] 响应式布局
- [ ] 触摸操作
- [ ] 横竖屏切换
- [ ] 离线功能 (如有)
- [ ] 推送通知 (如有)

## 📊 API连接配置

当前配置会自动连接到:
- **本地测试**: http://localhost:3000/api
- **生产环境**: http://154.194.250.93:3000/api

如需修改API地址，编辑: `frontend/src/config/api.ts`