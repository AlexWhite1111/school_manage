# 运行时配置指南（API地址一键切换）

前端会按如下优先级读取 API 地址：

1. `window.__RUNTIME_CONFIG__.apiBaseUrl`（运行时文件/注入）
2. `VITE_API_BASE_URL`（构建期环境变量）
3. 默认 `http://localhost:3000/api`

## 一步配置：替换运行时文件

将 `public/runtime-config.js` 替换为以下任意预设即可切换 API：

- 本地后端：`runtime-configs/runtime-config.local.js`
- 开发电脑（同网段访问）：`runtime-configs/runtime-config.devpc.js`（自行替换为本机IP）
- 预部署服务器：`runtime-configs/runtime-config.preprod.js`

### 替换命令（Windows PowerShell）

在 `frontend` 目录：

```powershell
# 本地后端
copy /Y .\runtime-configs\runtime-config.local.js .\public\runtime-config.js

# 同网段访问开发电脑（请先编辑 devpc.js 把IP改成你的本机IP）
copy /Y .\runtime-configs\runtime-config.devpc.js .\public\runtime-config.js

# 预部署服务器（154.194.250.93）
copy /Y .\runtime-configs\runtime-config.preprod.js .\public\runtime-config.js

# 然后构建并（如果是Electron）同步
npm run build
robocopy .\dist .\electron\app /MIR > NUL
```

## Electron（开发）通过环境变量临时切换

```powershell
cd frontend\electron
$Env:API_BASE_URL = 'http://<地址>:3000/api'
npm run electron:start
```

## Android 构建

```powershell
cd frontend
copy /Y .\runtime-configs\runtime-config.preprod.js .\public\runtime-config.js  # 例如切到预部署
npm run build
npx cap sync android
npx cap build android
```

## 验证

浏览器/控制台执行：

```js
window.__RUNTIME_CONFIG__
```

应包含：

```js
{ apiBaseUrl: 'http://...' }
```

