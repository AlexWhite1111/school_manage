# 学生成长量化系统 API 设计文档 (V1.0)

## 概述

本文档定义了学生成长量化系统的完整API接口设计，基于卡尔曼滤波器算法，支持5秒快速打标签和学生个人成长查看等功能。

### 基础信息
- **Base URL**: `/api/growth`
- **认证方式**: Bearer Token
- **数据格式**: JSON
- **响应编码**: UTF-8

### 通用响应格式

#### 成功响应
```typescript
{
  success: true,
  data: any,
  message?: string
}
```

#### 错误响应
```typescript
{
  success: false,
  error: {
    code: string,           // 错误代码
    message: string,        // 用户友好的错误信息
    details?: any          // 详细错误信息（开发用）
  }
}
```

### 错误代码定义
- `INVALID_ENROLLMENT`: 学生不在指定班级或学生状态异常
- `INVALID_TAG`: 标签不存在、非Growth标签或已被删除
- `INVALID_WEIGHT`: 权重必须在1-10之间的整数
- `DUPLICATE_RECORD`: 短时间内重复记录（5分钟内）
- `INSUFFICIENT_PERMISSION`: 权限不足，无法执行此操作
- `STUDENT_NOT_FOUND`: 学生不存在或已被删除
- `INVALID_CONFIG`: 配置参数无效或超出允许范围
- `INVALID_DATE_RANGE`: 日期范围无效或超出限制
- `TAG_NAME_EXISTS`: 标签名称已存在
- `RATE_LIMIT_EXCEEDED`: 请求频率超出限制
- `DATA_TOO_LARGE`: 请求数据量超出限制
- `KALMAN_CALCULATION_ERROR`: 卡尔曼滤波器计算异常
- `EXPORT_GENERATION_FAILED`: 报告生成失败
- `WEBSOCKET_CONNECTION_ERROR`: WebSocket连接异常

---

## 1. Growth标签管理

### 1.1 获取Growth标签列表

**GET** `/api/growth/tags`

获取所有Growth专用标签列表，支持筛选和搜索。

#### 权限要求
- 所有已认证用户

#### 请求参数
```typescript
{
  sentiment?: 'POSITIVE' | 'NEGATIVE',  // 筛选正面/负面标签
  search?: string,                      // 搜索标签名称，最少2个字符
  isActive?: boolean,                   // 筛选是否启用的标签，默认true
  orderBy?: 'usageCount' | 'createdAt' | 'text', // 排序字段，默认usageCount
  order?: 'asc' | 'desc'               // 排序方向，默认desc
}
```

#### 响应数据
```typescript
{
  success: true,
  data: {
    id: number,
    text: string,                      // 标签名称，如"积极回答问题"
    sentiment: 'POSITIVE' | 'NEGATIVE', // 情感极性
    defaultWeight: number,             // 默认权重1-10
    usageCount: number,                // 使用次数
    type: 'GROWTH_POSITIVE' | 'GROWTH_NEGATIVE',
    description?: string,              // 标签描述
    createdAt: string,                 // 创建时间 ISO格式
    updatedAt: string,                 // 更新时间 ISO格式
    isActive: boolean,                 // 是否启用
    isGrowthTag: boolean,              // 标识为Growth标签，固定为true
    recentUsage: {                     // 最近使用统计
      today: number,                   // 今日使用次数
      thisWeek: number,                // 本周使用次数
      thisMonth: number                // 本月使用次数
    }
  }[]
}
```

#### 使用示例
```bash
# 获取正面标签，按使用频率排序
GET /api/growth/tags?sentiment=POSITIVE&orderBy=usageCount&order=desc

# 搜索包含"积极"的标签
GET /api/growth/tags?search=积极
```

### 1.2 创建Growth标签

**POST** `/api/growth/tags`

创建新的Growth标签。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 请求体
```typescript
{
  text: string,                        // 标签名称，必填，2-20字符，不能重复
  sentiment: 'POSITIVE' | 'NEGATIVE',  // 情感极性，必填
  defaultWeight: number,               // 默认权重1-10，必填，整数
  description?: string,                // 标签描述，可选，最多100字符
  type?: 'GROWTH_POSITIVE' | 'GROWTH_NEGATIVE' // 可选，根据sentiment自动设置
}
```

#### 业务规则
- 标签名称在同一类型下必须唯一
- POSITIVE sentiment 自动设置 type 为 GROWTH_POSITIVE
- NEGATIVE sentiment 自动设置 type 为 GROWTH_NEGATIVE
- 创建后自动设置 isGrowthTag = true, isPredefined = true

#### 响应数据
```typescript
{
  success: true,
  data: {
    id: number,
    text: string,
    sentiment: 'POSITIVE' | 'NEGATIVE',
    defaultWeight: number,
    type: 'GROWTH_POSITIVE' | 'GROWTH_NEGATIVE',
    isGrowthTag: true,
    createdAt: string
  }
}
```

### 1.3 更新Growth标签

**PUT** `/api/growth/tags/{tagId}`

更新现有Growth标签信息。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 请求体
```typescript
{
  text?: string,                       // 标签名称
  defaultWeight?: number,              // 默认权重1-10
  isActive?: boolean                   // 是否启用
}
```

### 1.4 删除Growth标签

**DELETE** `/api/growth/tags/{tagId}`

软删除Growth标签（设置deletedAt字段）。

#### 权限要求
- `SUPER_ADMIN`

---

## 2. 成长日志记录

### 2.1 快速记录成长日志

**POST** `/api/growth/logs`

**核心API**: 5秒快速记录学生成长日志。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`, `TEACHER`

#### 请求体
```typescript
{
  enrollmentId: number,               // 学生班级注册ID，必填
  tagId: number,                      // 标签ID，必填，必须是isGrowthTag=true的标签
  weight?: number,                    // 可选权重1-10，不填则使用标签默认权重，整数
  context?: string                    // 可选上下文说明，最多50字符，如"课堂表现"
}
```

#### 业务规则
- enrollmentId 必须存在且学生状态为 ENROLLED
- tagId 必须存在且 isGrowthTag = true 且 deletedAt = null
- 同一学生同一标签在5分钟内不能重复记录（防止误操作）
- weight 范围验证：1-10，默认使用 tag.defaultWeight
- 记录成功后自动触发卡尔曼滤波器计算
- 自动更新 tag.usageCount += 1

#### 性能优化
- 接口响应时间目标：< 200ms
- 异步更新卡尔曼滤波器状态（后台队列处理）
- 支持事务回滚（记录失败时不更新状态）

#### 响应数据
```typescript
{
  success: true,
  data: {
    id: number,
    createdAt: string,                // ISO格式时间
    enrollmentId: number,
    tagId: number,
    weight: number,
    tag: {
      id: number,
      text: string,
      sentiment: 'POSITIVE' | 'NEGATIVE'
    },
    student: {
      id: number,
      name: string,
      publicId: string
    },
    class: {
      id: number,
      name: string
    }
  }
}
```

### 2.2 批量记录成长日志

**POST** `/api/growth/logs/batch`

批量记录多条成长日志，提升操作效率。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`, `TEACHER`

#### 请求体
```typescript
{
  records: {
    enrollmentId: number,
    tagId: number,
    weight?: number
  }[]                                 // 最多20条记录
}
```

#### 响应数据
```typescript
{
  success: true,
  data: {
    successCount: number,             // 成功记录数
    failedCount: number,              // 失败记录数
    results: {
      index: number,                  // 在请求数组中的索引
      success: boolean,
      data?: any,                     // 成功时的数据
      error?: string                  // 失败时的错误信息
    }[]
  }
}
```

### 2.3 查询成长日志记录

**GET** `/api/growth/logs`

查询成长日志记录，支持多种筛选条件。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`, `TEACHER`

#### 请求参数
```typescript
{
  enrollmentId?: number,              // 筛选特定学生
  tagId?: number,                     // 筛选特定标签
  startDate?: string,                 // 开始日期 ISO格式 YYYY-MM-DD
  endDate?: string,                   // 结束日期 ISO格式 YYYY-MM-DD
  sentiment?: 'POSITIVE' | 'NEGATIVE', // 筛选正面/负面记录
  classId?: number,                   // 筛选特定班级
  minWeight?: number,                 // 最小权重筛选 1-10
  maxWeight?: number,                 // 最大权重筛选 1-10
  page?: number,                      // 分页页码，默认1，最大1000
  limit?: number,                     // 每页条数，默认20，最大100
  orderBy?: 'createdAt' | 'weight',   // 排序字段，默认createdAt
  order?: 'asc' | 'desc'             // 排序方向，默认desc
}
```

#### 业务规则
- 日期范围最大不超过1年
- startDate 不能大于 endDate
- 未指定日期时默认查询最近30天
- minWeight 不能大于 maxWeight
- 支持组合查询（多个筛选条件同时生效）

#### 响应数据
```typescript
{
  success: true,
  data: {
    logs: {
      id: number,
      createdAt: string,
      weight: number,
      tag: {
        id: number,
        text: string,
        sentiment: 'POSITIVE' | 'NEGATIVE'
      },
      student: {
        id: number,
        name: string,
        publicId: string
      },
      class: {
        id: number,
        name: string
      }
    }[],
    pagination: {
      total: number,                  // 总记录数
      page: number,                   // 当前页码
      limit: number,                  // 每页条数
      totalPages: number              // 总页数
    }
  }
}
```

---

## 3. 学生成长状态查询

### 3.1 获取学生成长概况（按enrollmentId）

**GET** `/api/growth/students/{enrollmentId}/summary`

获取指定学生的成长状态概况。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`, `TEACHER`

#### 响应数据
```typescript
{
  success: true,
  data: {
    student: {
      id: number,
      name: string,
      publicId: string,
      grade?: string
    },
    class: {
      id: number,
      name: string
    },
    enrollment: {
      id: number,
      enrollmentDate: string
    },
    states: {
      tagId: number,
      tagName: string,
      sentiment: 'POSITIVE' | 'NEGATIVE',
      level: number,                  // 当前水平 (μ)
      trend: number,                  // 成长趋势 (ν) 
      trendDirection: 'UP' | 'DOWN' | 'STABLE', // 趋势方向
      confidence: number,             // 置信度 0-1
      totalObservations: number,      // 总观测次数
      lastUpdatedAt: string          // 最后更新时间
    }[],
    overallTrend: 'IMPROVING' | 'DECLINING' | 'STABLE', // 整体趋势
    lastActivityDate: string         // 最后活动时间
  }
}
```

### 3.2 获取学生成长概况（按publicId）

**GET** `/api/growth/students/by-public-id/{publicId}/summary`

通过学生公开ID获取成长状态概况。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 响应数据
同上 `/api/growth/students/{enrollmentId}/summary`

### 3.3 获取学生成长趋势图数据

**GET** `/api/growth/students/{enrollmentId}/chart`

获取学生成长趋势图表数据。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`, `TEACHER`

#### 请求参数
```typescript
{
  tagId?: number,                     // 可选，筛选特定标签，必须是该学生有记录的标签
  period?: 'week' | 'month' | 'quarter' | 'year', // 时间周期，默认month
  startDate?: string,                 // 自定义开始日期 YYYY-MM-DD，与period互斥
  endDate?: string,                   // 自定义结束日期 YYYY-MM-DD，与period互斥
  includeConfidence?: boolean,        // 是否包含置信区间数据，默认true
  dataPoints?: number                 // 时间序列数据点数量，默认30，最大365
}
```

#### 业务规则
- 如果指定tagId，只返回该标签的图表数据
- 如果不指定tagId，返回所有标签的综合趋势
- period与自定义日期范围互斥，优先使用自定义日期
- 数据点按时间平均分布（如month周期30天，每天一个数据点）
- 如果某日无数据，使用卡尔曼滤波器预测值
- confidence区间基于协方差矩阵计算，置信度95%

#### 响应数据
```typescript
{
  success: true,
  data: {
    tagId: number,
    tagName: string,
    sentiment: 'POSITIVE' | 'NEGATIVE',
    timeSeriesData: {
      date: string,                   // 日期 YYYY-MM-DD
      level: number,                  // 预估水平
      trend: number,                  // 趋势值
      confidenceUpper: number,        // 置信区间上界
      confidenceLower: number,        // 置信区间下界
      actualEvents: number            // 当日实际事件数
    }[],
    currentState: {
      level: number,
      trend: number,
      confidence: number,
      lastUpdated: string
    }
  }
}
```

### 3.4 获取学生成长趋势图数据（按publicId）

**GET** `/api/growth/students/by-public-id/{publicId}/chart`

通过学生公开ID获取成长趋势图表数据。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 请求参数和响应数据
同上 `/api/growth/students/{enrollmentId}/chart`

---

## 4. 学生个人成长查看（增值功能）

### 4.1 查看个人成长报告

**GET** `/api/growth/my-progress`

学生查看自己的成长报告。

#### 权限要求
- `STUDENT` (只能查看自己的数据)

#### 请求参数
```typescript
{
  period?: 'week' | 'month' | 'semester' | 'year' // 查看周期，默认month
}
```

#### 响应数据
```typescript
{
  success: true,
  data: {
    student: {
      name: string,
      publicId: string,
      grade?: string
    },
    class: {
      name: string
    },
    enrollment: {
      enrollmentDate: string
    },
    summary: {
      totalPositiveEvents: number,      // 正面事件总数
      totalNegativeEvents: number,      // 负面事件总数
      improvementScore: number,         // 进步分数 0-100
      rank: {                          // 班级排名（可选功能）
        current: number,
        total: number,
        trend: 'UP' | 'DOWN' | 'STABLE'
      }
    },
    strengthAreas: {                    // 优势领域
      tagName: string,
      level: number,
      trend: 'IMPROVING' | 'STABLE',
      description: string               // 学生友好的描述
    }[],
    improvementAreas: {                 // 需要改进的领域
      tagName: string,
      level: number,
      trend: 'DECLINING' | 'STABLE',
      suggestion: string                // 改进建议
    }[],
    recentAchievements: {               // 最近的成就
      date: string,
      tagName: string,
      description: string,              // 如"本周积极回答问题次数比上周提升30%"
      type: 'MILESTONE' | 'IMPROVEMENT'
    }[],
    monthlyProgress: {                  // 月度趋势图数据
      month: string,                    // YYYY-MM
      positiveCount: number,
      negativeCount: number,
      overallScore: number
    }[]
  }
}
```

### 4.2 查看个人成就徽章

**GET** `/api/growth/my-badges`

学生查看自己的成就徽章。

#### 权限要求
- `STUDENT` (只能查看自己的数据)

#### 响应数据
```typescript
{
  success: true,
  data: {
    earnedBadges: {
      id: string,
      name: string,                     // 如"积极发言达人"
      description: string,
      iconUrl: string,
      earnedAt: string,
      category: 'PARTICIPATION' | 'IMPROVEMENT' | 'CONSISTENCY' | 'LEADERSHIP'
    }[],
    availableBadges: {
      id: string,
      name: string,
      description: string,
      iconUrl: string,
      progress: number,                 // 0-100 完成百分比
      requirement: string               // 获得条件描述
    }[],
    totalEarned: number,
    totalAvailable: number
  }
}
```

---

## 5. 数据分析与统计

### 5.1 班级成长分析

**GET** `/api/growth/analytics/class/{classId}`

获取班级整体成长分析数据。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`, `TEACHER`

#### 请求参数
```typescript
{
  period?: 'week' | 'month' | 'quarter', // 分析周期，默认month
  tagId?: number                          // 可选标签筛选
}
```

#### 响应数据
```typescript
{
  success: true,
  data: {
    class: {
      id: number,
      name: string
    },
    period: string,
    summary: {
      totalStudents: number,
      activeStudents: number,           // 有记录的学生数
      totalLogs: number,
      positiveLogs: number,
      negativeLogs: number,
      averagePositiveRatio: number      // 平均正面比例
    },
    topPerformers: {                    // 进步最大的学生
      studentId: number,
      studentName: string,
      publicId: string,
      improvementScore: number
    }[],
    needsAttention: {                   // 需要关注的学生
      studentId: number,
      studentName: string,
      publicId: string,
      concernLevel: 'LOW' | 'MEDIUM' | 'HIGH',
      reason: string
    }[],
    tagAnalysis: {                      // 标签使用分析
      tagId: number,
      tagName: string,
      sentiment: 'POSITIVE' | 'NEGATIVE',
      usageCount: number,
      averageWeight: number
    }[],
    trendData: {                        // 时间趋势数据
      date: string,
      positiveCount: number,
      negativeCount: number,
      studentCount: number
    }[]
  }
}
```

### 5.2 系统概览仪表盘

**GET** `/api/growth/dashboard/overview`

获取系统整体概览数据。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 响应数据
```typescript
{
  success: true,
  data: {
    summary: {
      totalStudents: number,
      activeStudents: number,           // 本月有记录的学生
      totalLogs: number,
      totalClasses: number
    },
    weeklyGrowth: {
      week: string,                     // YYYY-WW
      positiveCount: number,
      negativeCount: number,
      studentCount: number
    }[],
    topTags: {
      tagId: number,
      tagName: string,
      usageCount: number,
      sentiment: 'POSITIVE' | 'NEGATIVE'
    }[],
    systemHealth: {
      configStatus: 'OPTIMAL' | 'NEEDS_TUNING',
      dataQuality: number,              // 0-100分
      averageConfidence: number,        // 平均置信度
      lastOptimized: string
    },
    classPerformance: {
      classId: number,
      className: string,
      studentCount: number,
      averageScore: number,
      trend: 'UP' | 'DOWN' | 'STABLE'
    }[]
  }
}
```

---

## 6. 系统配置管理

### 6.1 获取卡尔曼滤波器配置

**GET** `/api/growth/config`

获取当前激活的卡尔曼滤波器配置参数。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 响应数据
```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    description: string,
    processNoise: number,             // Q参数
    initialUncertainty: number,       // P初始值
    timeDecayFactor: number,          // λ参数
    minObservations: number,          // 最少观测次数
    maxDaysBetween: number,          // 最大天数间隔
    isActive: boolean,
    createdAt: string,
    updatedAt: string
  }
}
```

### 6.2 更新配置参数

**PUT** `/api/growth/config/{configId}`

更新卡尔曼滤波器配置参数。

#### 权限要求
- `SUPER_ADMIN`

#### 请求体
```typescript
{
  name?: string,
  description?: string,
  processNoise?: number,            // 0.001 - 1.0
  initialUncertainty?: number,      // 1.0 - 100.0
  timeDecayFactor?: number,         // 0.001 - 0.1
  minObservations?: number,         // 1 - 10
  maxDaysBetween?: number          // 7 - 90
}
```

#### 响应数据
```typescript
{
  success: true,
  data: {
    // 更新后的完整配置
  }
}
```

### 6.3 创建新配置

**POST** `/api/growth/config`

创建新的配置方案。

#### 权限要求
- `SUPER_ADMIN`

#### 请求体
```typescript
{
  name: string,                     // 配置名称，必填
  description?: string,
  processNoise: number,
  initialUncertainty: number,
  timeDecayFactor: number,
  minObservations: number,
  maxDaysBetween: number
}
```

---

## 7. 辅助查询接口

### 7.1 快速获取学生列表

**GET** `/api/growth/quick/students`

快速获取学生列表，用于打标签界面的学生选择。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`, `TEACHER`

#### 请求参数
```typescript
{
  classId?: number,                   // 可选班级筛选
  search?: string,                    // 搜索学生姓名或publicId，最少2个字符
  limit?: number,                     // 返回数量限制，默认50，最大200
  includeInactive?: boolean,          // 是否包含非激活学生，默认false
  hasGrowthData?: boolean,            // 是否只返回有成长记录的学生，默认false
  orderBy?: 'name' | 'recentActivity' | 'enrollmentDate', // 排序字段，默认name
  order?: 'asc' | 'desc'             // 排序方向，默认asc
}
```

#### 业务规则
- 只返回当前用户有权限查看的学生
- search支持模糊匹配学生姓名和publicId
- recentActivity表示最近7天的成长记录数量
- includeInactive=false时只返回状态为ENROLLED的学生
- 响应数据按权限过滤，确保数据安全

#### 响应数据
```typescript
{
  success: true,
  data: {
    enrollmentId: number,             // 用于后续API调用
    student: {
      id: number,
      name: string,
      publicId: string,
      grade?: string
    },
    class: {
      id: number,
      name: string
    },
    recentActivityCount: number       // 最近7天的记录数
  }[]
}
```

### 7.2 获取班级列表

**GET** `/api/growth/quick/classes`

获取班级列表。

#### 权限要求
- 所有已认证用户

#### 响应数据
```typescript
{
  success: true,
  data: {
    id: number,
    name: string,
    studentCount: number,
    activeStudentCount: number        // 有成长记录的学生数
  }[]
}
```

---

## 8. 报告导出功能

### 8.1 导出学生成长报告

**GET** `/api/growth/export/student-report/{publicId}`

导出指定学生的成长报告文件。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 请求参数
```typescript
{
  format: 'PDF' | 'EXCEL',           // 文件格式
  period: 'semester' | 'year',       // 报告周期
  includeCharts: boolean,            // 是否包含图表
  language?: 'zh' | 'en'            // 语言，默认zh
}
```

#### 响应
```
Content-Type: application/pdf 或 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="student_growth_report_[publicId]_[date].pdf"
```

### 8.2 导出班级成长报告

**GET** `/api/growth/export/class-report/{classId}`

导出班级整体成长报告。

#### 权限要求
- `SUPER_ADMIN`, `MANAGER`

#### 请求参数
```typescript
{
  format: 'PDF' | 'EXCEL',
  period: 'month' | 'semester' | 'year',
  includeIndividual: boolean         // 是否包含个人详情
}
```

---

## 9. 实时通知接口

### 9.1 WebSocket连接

**WebSocket** `/api/growth/ws/notifications`

建立实时通知连接。

#### 权限要求
- 所有已认证用户

#### 接收消息格式
```typescript
// 成就解锁通知
{
  type: 'ACHIEVEMENT_UNLOCKED',
  timestamp: string,
  data: {
    studentPublicId: string,
    badgeName: string,
    message: string
  }
}

// 趋势预警通知
{
  type: 'TREND_ALERT',
  timestamp: string,
  data: {
    studentPublicId: string,
    tagName: string,
    trendType: 'DECLINING' | 'IMPROVING',
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    suggestion: string
  }
}

// 系统状态通知
{
  type: 'SYSTEM_STATUS',
  timestamp: string,
  data: {
    status: 'OPTIMAL' | 'WARNING' | 'ERROR',
    message: string
  }
}
```

---

## 10. 性能要求与限制

### 10.1 响应时间要求
- **快速打标签API** (`POST /api/growth/logs`): < 200ms
- **标签列表API**: < 100ms (支持缓存)
- **学生概况API**: < 500ms
- **成长分析API**: < 2s
- **报告导出API**: < 10s

### 10.2 请求频率限制
- **快速打标签API**: 每用户每分钟最多60次
- **查询类API**: 每用户每分钟最多200次
- **导出API**: 每用户每小时最多10次

### 10.3 数据量限制
- **批量记录**: 单次最多20条记录
- **查询分页**: 单页最大100条记录
- **搜索结果**: 最多返回500条记录
- **日期范围**: 查询最大跨度1年
- **图表数据点**: 最多365个数据点
- **导出记录**: 单次最多导出10000条记录
- **WebSocket连接**: 每用户最多5个并发连接

### 10.4 缓存策略
- **标签列表**: 缓存30分钟，标签变更时立即失效
- **学生列表**: 缓存10分钟，注册信息变更时失效
- **成长状态**: 缓存5分钟，新增记录时失效
- **配置信息**: 缓存1小时，配置更新时立即失效

### 10.5 监控指标
- **API响应时间**: 95%请求响应时间监控
- **错误率**: 按错误代码分类统计
- **卡尔曼计算延迟**: 后台队列处理时间监控
- **数据库连接**: 连接池使用率监控
- **缓存命中率**: Redis缓存效率监控

---

## 11. 数据安全与隐私

### 11.1 数据访问控制
- 学生只能访问自己的成长数据
- 教师可以访问所教班级的学生数据
- 管理员可以访问所有数据

### 11.2 敏感信息处理
- 所有个人身份信息需要脱敏处理
- 导出文件需要水印标记
- 访问日志需要完整记录

### 11.3 数据保留策略
- 成长日志数据保留3年
- 分析统计数据保留1年
- 导出文件临时存储24小时后自动删除

---

## 12. 开发指南与最佳实践

### 12.1 API调用最佳实践
- **批量操作优先**: 优先使用批量API减少网络请求
- **分页查询**: 大量数据查询时必须使用分页
- **缓存利用**: 标签列表等相对静态数据应充分利用缓存
- **错误处理**: 实现完整的错误处理和重试机制
- **权限检查**: 前端应在调用API前进行权限预检查

### 12.2 前端集成建议
- **实时更新**: 使用WebSocket接收实时通知
- **离线支持**: 关键操作支持离线缓存和同步
- **用户体验**: 快速打标签操作应有即时反馈
- **数据可视化**: 成长趋势图使用适当的图表库
- **移动端适配**: 支持移动设备的快速操作

### 12.3 后端实现要点
- **事务处理**: 确保数据一致性，特别是卡尔曼滤波器更新
- **异步队列**: 重计算操作使用后台队列处理
- **数据库优化**: 适当的索引和查询优化
- **安全防护**: 输入验证、SQL注入防护、权限控制
- **日志记录**: 完整的操作日志和错误日志

### 12.4 测试策略
- **单元测试**: 卡尔曼滤波器算法的准确性测试
- **集成测试**: API接口的完整流程测试
- **性能测试**: 高并发场景下的性能表现
- **压力测试**: 大数据量情况下的系统稳定性
- **安全测试**: 权限控制和数据安全测试

---

## 13. 版本更新历史

### V1.0 (当前版本) - 2024-01
- 初始版本发布
- 支持基础的成长日志记录和查询
- 实现卡尔曼滤波器算法
- 提供学生个人查看功能
- 包含成就徽章系统
- 完整的API文档和开发指南

### 规划中的功能 (V1.1)
- AI智能推荐标签
- 更丰富的数据可视化
- 家长端移动应用支持
- 多语言国际化支持
- 高级数据分析报告 