# API文档更新 - 后端优化

## 📋 最新API变更（2024年更新）

### 🚀 新增智能路由

#### 1. Growth API 智能路由

**GET** `/api/growth/students/:identifier/summary`

- **描述**: 智能获取学生成长概况，自动识别ID类型
- **参数**: 
  - `identifier` (string|number): 学生标识符
    - 纯数字: 识别为 enrollmentId
    - 非纯数字: 识别为 publicId
- **权限**: 所有已认证用户
- **响应格式**:
```json
{
  "success": true,
  "data": {
    "student": { "id": 1, "name": "张三", "publicId": "S001", "grade": "初一" },
    "class": { "id": 1, "name": "初一(1)班" },
    "enrollment": { "id": 1, "enrollmentDate": "2024-01-01" },
    "states": [...],
    "overallTrend": "IMPROVING",
    "lastActivityDate": "2024-01-15T10:30:00Z"
  }
}
```

#### 2. Exam API 智能路由

**GET** `/api/exam/students/:identifier/history`

- **描述**: 智能获取学生考试历史，自动识别ID类型
- **参数**:
  - `identifier` (string|number): 学生标识符
  - `startDate` (string, 可选): 开始日期
  - `endDate` (string, 可选): 结束日期
- **权限**: 已认证用户
- **响应格式**:
```json
{
  "success": true,
  "data": {
    "totalRecords": 10,
    "subjectAnalysis": [...],
    "allScores": [...],
    "examTagsWordCloud": [...]
  }
}
```

### ⚠️ 已废弃的API端点

#### 1. StudentLog API (已完全移除)
- ❌ `POST /api/growth-logs` → 使用 `POST /api/growth/logs`
- ❌ `GET /api/students/:publicId/report` → 使用 `GET /api/growth/students/:identifier/summary`

#### 2. Growth API (标记为废弃，但仍可用)
- 🔄 `GET /api/growth/students/:enrollmentId/summary` → 使用智能路由
- 🔄 `GET /api/growth/students/by-public-id/:publicId/summary` → 使用智能路由

#### 3. Exam API (计划废弃)
- 🔄 `GET /api/exam/students/:studentId/exam-history` → 使用智能路由
- 🔄 `GET /api/exam/students/by-public-id/:publicId/exam-history` → 使用智能路由

### 📊 统一响应格式

所有API现在使用统一的响应格式：

**成功响应**:
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "详细错误信息"
  }
}
```

### 🔧 迁移指南

#### 前端迁移步骤

1. **立即更新**: 使用新的智能路由替代旧路由
2. **删除废弃调用**: 移除对已废弃API的调用
3. **统一错误处理**: 使用新的统一响应格式

#### 示例迁移

**旧代码**:
```typescript
// ❌ 废弃
await studentLogApi.getStudentGrowthReport(publicId);
await GrowthApi.getStudentGrowthSummary(enrollmentId);
await growthApi.getStudentGrowthSummaryByPublicId(publicId);
```

**新代码**:
```typescript
// ✅ 推荐
await growthApi.getStudentGrowthSummary(identifier); // 智能识别ID类型
```

### 📈 优化收益

1. **API端点减少**: 从6个端点优化为2个智能端点
2. **维护简化**: 统一的错误处理和响应格式
3. **开发效率**: 自动ID识别，无需手动判断ID类型
4. **向后兼容**: 旧端点仍然可用，渐进式迁移

### 🗓️ 废弃时间表

- **当前**: 新端点可用，旧端点标记为废弃
- **3个月后**: 旧端点返回警告头
- **6个月后**: 完全移除废弃端点

### 💡 最佳实践

1. 使用智能路由处理所有新开发
2. 逐步迁移现有代码到新端点
3. 监控废弃警告头，及时更新
4. 使用统一的错误处理机制 