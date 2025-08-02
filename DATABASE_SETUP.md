# 数据库初始化指南

本项目提供了灵活的数据库初始化方案，支持生产环境和开发环境的不同需求。

## 🏗️ 初始化方案说明

### 1. 生产环境初始化
**适用场景**: 正式部署的生产环境
**特点**: 
- 只创建必需的基础数据
- 不包含测试数据
- 安全性优先

**包含内容**:
- 超级管理员账号 (`admin`)
- 预定义标签系统
- 基础班级配置

### 2. 开发环境初始化  
**适用场景**: 开发、测试环境
**特点**:
- 包含完整的模拟数据
- 便于功能测试和演示
- 数据丰富完整

**包含内容**:
- 所有生产环境内容
- 测试用户账号 (`manager`, `teacher`)
- 模拟客户和家长数据 (100条，可配置)
- 学生成长记录和考勤数据
- 财务订单和付款记录

## 🚀 快速开始

### Windows 用户 (推荐)

#### 生产环境
```bash
# 双击运行
db-init-production.bat
```

#### 开发环境
```bash  
# 双击运行
db-init-development.bat
```

#### 仅迁移数据库
```bash
# 双击运行 (不重置数据，仅应用迁移)
db-migrate-only.bat
```

### 命令行用户

#### 生产环境
```bash
cd backend

# 方案1: 手动步骤
npm run prisma:migrate    # 应用数据库迁移
npm run db:init          # 初始化基础数据

# 方案2: 一键命令
npm run db:setup
```

#### 开发环境
```bash
cd backend

# 方案1: 手动步骤  
npm run db:reset         # 重置数据库
npm run db:seed-test     # 生成测试数据

# 方案2: 一键命令
npm run db:setup-test

# 自定义客户数量 (默认100个)
TEST_CUSTOMER_COUNT=50 npm run db:seed-test
```

#### 仅迁移
```bash
cd backend
npx prisma migrate deploy  # 生产环境迁移
# 或
npx prisma migrate dev     # 开发环境迁移
```

## 🔧 可用命令

| 命令 | 说明 | 适用环境 |
|------|------|----------|
| `npm run db:init` | 初始化基础数据 | 生产 |
| `npm run db:seed-test` | 生成测试数据 | 开发 |
| `npm run db:reset` | 重置数据库 | 开发 |
| `npm run db:setup` | 迁移+基础数据 | 生产 |
| `npm run db:setup-test` | 重置+测试数据 | 开发 |
| `npm run prisma:migrate` | 开发环境迁移 | 开发 |

## 👤 默认账号

### 生产环境
- **超级管理员**: `admin` / `123456`
  - ⚠️ **重要**: 首次登录后立即修改密码！

### 开发环境  
- **超级管理员**: `admin` / `123456`
- **系统管理员**: `manager` / `123456`
- **教师账号**: `teacher` / `123456`
- **学生账号**: 使用12位学号登录 / `123456`
  - 学号格式: `202508XXXXXX` (年月+6位随机数)

## 🗂️ 文件结构

```
backend/
├── scripts/
│   ├── init-db.ts          # 基础数据初始化脚本
│   └── seed-test-data.ts   # 测试数据生成脚本
├── prisma/
│   ├── schema.prisma       # 数据库模型定义
│   ├── seed.ts            # 原始种子脚本 (已废弃)
│   └── migrations/         # 数据库迁移文件
└── ...

# Bat 脚本 (项目根目录)
├── db-init-production.bat   # 生产环境初始化
├── db-init-development.bat  # 开发环境初始化
└── db-migrate-only.bat     # 仅执行迁移
```

## ⚙️ 环境配置

### 环境变量

在 `backend/.env` 文件中配置:

```env
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# 测试数据配置 (可选)
TEST_CUSTOMER_COUNT=100  # 生成的测试客户数量
```

### 数据库要求

- PostgreSQL 12+ 
- 数据库用户需要完整的读写权限
- 确保数据库服务正在运行

## 🔄 迁移工作流

### 开发过程中修改Schema

1. 修改 `prisma/schema.prisma`
2. 运行迁移: `npm run prisma:migrate`
3. 根据需要重新生成测试数据: `npm run db:seed-test`

### 部署到生产环境

1. 部署代码到服务器
2. 配置生产环境 `.env`
3. 运行: `db-init-production.bat` 或 `npm run db:setup`
4. **立即修改默认管理员密码**

## 🚨 注意事项

### 生产环境
- **必须立即修改默认密码**
- 建议定期备份数据库
- 谨慎使用重置命令

### 开发环境
- `db:reset` 会**完全清空**数据库
- 测试数据生成可能需要几分钟时间
- 可通过环境变量控制生成的数据量

### 迁移安全
- 生产环境使用 `migrate deploy`
- 开发环境使用 `migrate dev`
- 迁移前建议备份重要数据

## 🆘 故障排除

### 常见问题

1. **迁移失败**
   - 检查数据库连接配置
   - 确认数据库服务状态
   - 验证用户权限

2. **种子数据生成失败**
   - 确保迁移已正确应用
   - 检查TypeScript编译错误
   - 查看详细错误信息

3. **UUID字段错误**
   - 确保已应用最新迁移
   - 重新生成Prisma Client: `npx prisma generate`

### 获取帮助

如果遇到问题:
1. 查看控制台的详细错误信息
2. 检查 `backend/.env` 配置
3. 确认数据库连接状态
4. 联系开发团队 