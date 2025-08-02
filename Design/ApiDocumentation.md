# 后端 API 详细文档

本文档详细描述了项目后端的所有API端点，旨在为前端开发和后端实现提供清晰、统一的规范。

**基础URL**: `/api`
**认证方式**: 所有需要认证的端点都通过在HTTP请求头中传递 `Authorization: Bearer <JWT_TOKEN>` 来进行身份验证。

---

## 模块一：认证与用户 (Auth & User Module)

管理用户的登录、登出以及个人信息的获取与修改。

### 1.1 `POST /auth/login`

-   **功能**: 用户登录。
-   **请求体** (`application/json`):
    ```json
    {
      "username": "admin",
      "password": "password123"
    }
    ```
-   **成功响应 (200 OK)**:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
-   **失败响应 (401 Unauthorized)**:
    ```json
    {
      "message": "账号或密码错误"
    }
    ```

### 1.2 `POST /auth/logout`

-   **功能**: 用户登出。此操作主要在客户端完成（清除Token）。服务端可选择实现Token黑名单机制。
-   **成功响应 (200 OK)**:
    ```json
    {
      "message": "Logged out successfully"
    }
    ```

### 1.3 `GET /users/me`

-   **功能**: 获取当前登录用户的信息 (需要认证)。
-   **成功响应 (200 OK)**:
    ```json
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "phone": "1234567890",
      "createdAt": "2023-01-01T12:00:00.000Z"
    }
    ```
-   **失败响应 (401 Unauthorized)**: 未提供或无效的Token。

### 1.4 `PUT /users/me`

-   **功能**: 更新当前登录用户的信息 (需要认证)。
-   **请求体** (`application/json`): (所有字段均为可选)
    ```json
    {
      "username": "new_admin_name",
      "email": "new_email@example.com",
      "phone": "0987654321"
    }
    ```
-   **成功响应 (200 OK)**: 返回更新后的用户信息对象。

### 1.5 `PUT /users/me/password`

-   **功能**: 修改当前登录用户的密码 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "oldPassword": "password123",
      "newPassword": "newPassword456"
    }
    ```
-   **成功响应 (204 No Content)**: 密码修改成功，无返回体。
-   **失败响应 (400 Bad Request)**: 旧密码错误。

---

## 模块二：客户关系管理 (CRM Module)

管理客户档案、沟通记录和标签。

### 2.1 `GET /customers`

-   **功能**: 获取客户列表，支持筛选和分页 (需要认证)。
-   **查询参数**:
    -   `status` (可选): 按客户状态筛选。枚举值: `POTENTIAL`, `INITIAL_CONTACT`, `INTERESTED`, `TRIAL_CLASS`, `ENROLLED`, `LOST`。
    -   `search` (可选): 按姓名或学校进行模糊搜索。
    -   `unclassed` (可选, `boolean`): 当设置为 `true` 时，仅返回未加入任何班级的客户。通常与 `status=ENROLLED` 配合使用。
    -   `page`, `limit` (可选): 用于分页。
-   **成功响应 (200 OK)**: 返回客户对象数组。

### 2.2 `POST /customers`

-   **功能**: 创建新客户 (需要认证)。
-   **请求体 (`application/json`)**:
    ```json
    {
      "name": "张三",
      "gender": "MALE",
      "birthDate": "2015-05-20",
      "school": "实验小学",
      "grade": "三年级",
      "address": "某某区某某街道",
      "sourceChannel": "朋友推荐",
      "firstContactDate": "2023-10-01",
      "status": "POTENTIAL",
      "nextFollowUpDate": "2023-10-10",
      "parents": [
        {
          "name": "张大明",
          "relationship": "父亲",
          "phone": "13800138000",
          "wechatId": "zhangdaming_wx"
        }
      ],
      "tags": [1, 5, 12]
    }
    ```
-   **成功响应 (201 Created)**: 返回新创建的、包含完整信息的客户对象。

### 2.3 `GET /customers/:id`

-   **功能**: 获取单个客户的完整档案 (需要认证)。
-   **URL参数**: `id` (number) - 客户ID。
-   **成功响应 (200 OK)**: 返回包含家长、沟通记录、标签等完整信息的客户对象。

### 2.4 `PUT /customers/:id`

-   **功能**: 更新客户档案 (需要认证)。
-   **URL参数**: `id` (number) - 客户ID。
-   **请求体 (`application/json`)**: 请求体为创建客户(2.2)数据结构的一个子集，只包含需要更新的字段。例如，只更新状态和下次回访日期：
    ```json
    {
      "status": "INTERESTED",
      "nextFollowUpDate": "2023-10-15"
    }
    ```
-   **成功响应 (200 OK)**: 返回更新后的、包含完整信息的客户对象。

### 2.5 `DELETE /customers`

-   **功能**: 批量删除客户 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "ids": [1, 2, 3]
    }
    ```
-   **成功响应 (204 No Content)**。

### 2.6 `GET /customers/stats`

-   **功能**: 获取CRM看板的统计数据 (需要认证)。
-   **成功响应 (200 OK)**:
    ```json
    {
      "totalCustomers": 150,
      "statusCounts": {
        "POTENTIAL": 50,
        "INITIAL_CONTACT": 40,
        "INTERESTED": 30,
        "TRIAL_CLASS": 15,
        "ENROLLED": 10,
        "LOST": 5
      },
      "monthlyNewCustomers": 25
    }
    ```

### 2.7 `POST /customers/:id/logs`

-   **功能**: 为指定客户添加沟通纪要 (需要认证)。
-   **URL参数**: `id` (number) - 客户ID。
-   **请求体** (`application/json`):
    ```json
    {
      "content": "今天与客户进行了电话沟通，客户意向明确。"
    }
    ```
-   **成功响应 (201 Created)**: 返回新创建的沟通纪要对象。

### 2.8 `PUT /customers/logs/:logId`

-   **功能**: 更新沟通纪要 (需要认证)。
-   **URL参数**: `logId` (number) - 沟通纪要ID。
-   **请求体** (`application/json`):
    ```json
    {
      "content": "更新后的沟通纪要内容。"
    }
    ```
-   **成功响应 (200 OK)**: 返回更新后的沟通纪要对象。

### 2.9 `DELETE /customers/logs/:logId`

-   **功能**: 删除沟通纪要 (需要认证)。
-   **URL参数**: `logId` (number) - 沟通纪要ID。
-   **成功响应 (204 No Content)**。

---

## 模块三：标签管理 (Tags Module)

### 3.1 `GET /tags`

-   **功能**: 获取标签列表，可按类型筛选 (需要认证)。
-   **查询参数**: `type` (可选): 标签类型。枚举值参考 `prisma/schema.prisma` 中的 `TagType`。
-   **成功响应 (200 OK)**: 返回标签对象数组。

### 3.2 `POST /tags`

-   **功能**: 创建新的自定义标签 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "text": "自定义的新标签",
      "type": "CHILD_PERSONALITY"
    }
    ```
-   **成功响应 (201 Created)**: 返回新创建的标签对象。

---

## 模块四：学生与班级 (Student & Class Module)

管理班级、学生注册、考勤和成长记录。

### 4.1 `GET /classes`

-   **功能**: 获取所有班级列表 (需要认证)。
-   **成功响应 (200 OK)**: 返回班级对象数组。

### 4.2 `POST /classes`

-   **功能**: 创建一个新班级 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "name": "高一(A)班"
    }
    ```
-   **成功响应 (201 Created)**: 返回新创建的班级对象。

### 4.3 `GET /classes/:id/students`

-   **功能**: 获取指定班级下的所有学生及其当日考勤 (需要认证)。
-   **URL参数**: `id` (number) - 班级ID。
-   **成功响应 (200 OK)**: 返回学生列表，每个学生包含考勤信息。

### 4.4 `POST /classes/:id/enrollments`

-   **功能**: 向班级中批量添加学生 (需要认证)。
-   **URL参数**: `id` (number) - 班级ID。
-   **请求体** (`application/json`):
    ```json
    {
      "studentIds": [101, 102]
    }
    ```
-   **成功响应 (201 Created)**: 返回创建的注册记录。

### 4.5 `DELETE /enrollments`

-   **功能**: 从班级中批量移除学生 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "enrollmentIds": [201, 202]
    }
    ```
-   **成功响应 (204 No Content)**。

### 4.6 `POST /attendance-records`

-   **功能**: 记录单次学生考勤 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "enrollmentId": 201,
      "status": "PRESENT",
      "timeSlot": "AM"
    }
    ```
    -   `status` (string, 必填): 考勤状态。有效值: `PRESENT`, `LATE`, `ABSENT`, `NO_SHOW`。
    -   `timeSlot` (string, 必填): 时间段。有效值: `AM`, `PM`。
-   **成功响应 (201 Created)**: 返回新创建的考勤记录。

### 4.7 `POST /growth-logs`

-   **功能**: 记录单条学生成长标签 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "enrollmentId": 201,
      "tagId": 55
    }
    ```
-   **成功响应 (201 Created)**: 返回新创建的成长记录。

### 4.8 `GET /students/:id/report`

-   **功能**: 获取指定学生的个人成长报告 (需要认证)。
-   **URL参数**: `id` (number) - 学生ID (`customerId`)。
-   **查询参数**: `startDate`, `endDate` - 日期范围 (e.g., `2023-10-01`)。
-   **成功响应 (200 OK)**: 返回包含词云、图表等数据的报告对象。

---

## 模块五：财务管理 (Finance Module)

管理学生的收费订单和收款记录。

### 5.1 `GET /finance/student-summaries`

-   **功能**: 获取所有学生的财务状况总览 (需要认证)。
-   **成功响应 (200 OK)**: 返回学生财务总览列表。

### 5.2 `GET /finance/students/:id/details`

-   **功能**: 获取单个学生的详细财务信息 (需要认证)。
-   **URL参数**: `id` (number) - 学生ID (`customerId`)。
-   **成功响应 (200 OK)**: 返回该学生的所有订单和付款记录。

### 5.3 `POST /finance/orders`

-   **功能**: 为学生创建新订单 (需要认证)。
-   **请求体** (`application/json`):
    ```json
    {
      "studentId": 101,
      "name": "2024年秋季班学费",
      "totalDue": "5000.00",
      "dueDate": "2024-09-01",
      "coursePeriodStart": "2024-09-01",
      "coursePeriodEnd": "2025-01-15"
    }
    ```
-   **成功响应 (201 Created)**: 返回新创建的订单对象。

### 5.4 `PUT /finance/orders/:orderId`

-   **功能**: 更新订单信息 (需要认证)。
-   **URL参数**: `orderId` (number) - 订单ID。
-   **请求体**: `POST /finance/orders` 请求体的一个子集，只包含需更新字段。
-   **成功响应 (200 OK)**: 返回更新后的订单对象。

### 5.5 `DELETE /finance/orders/:orderId`

-   **功能**: 删除订单 (需要认证)。
-   **URL参数**: `orderId` (number) - 订单ID。
-   **成功响应 (204 No Content)**。

### 5.6 `POST /finance/orders/:orderId/payments`

-   **功能**: 为指定订单添加一笔收款记录 (需要认证)。
-   **URL参数**: `orderId` (number) - 订单ID。
-   **请求体** (`application/json`):
    ```json
    {
      "amount": "2000.00",
      "paymentDate": "2024-08-15",
      "notes": "第一笔付款"
    }
    ```
-   **成功响应 (201 Created)**: 返回新创建的付款记录。

### 5.7 `PUT /finance/payments/:paymentId`

-   **功能**: 更新收款记录 (需要认证)。
-   **URL参数**: `paymentId` (number) - 付款记录ID。
-   **请求体**: `POST .../payments` 请求体的一个子集。
-   **成功响应 (200 OK)**: 返回更新后的付款记录。

### 5.8 `DELETE /finance/payments/:paymentId`

-   **功能**: 删除收款记录 (需要认证)。
-   **URL参数**: `paymentId` (number) - 付款记录ID。
-   **成功响应 (204 No Content)**。

---

## 模块六：仪表盘与全局功能 (Dashboard & Global)

### 6.1 `GET /dashboard/summary`

-   **功能**: 获取核心仪表盘的摘要数据 (需要认证)。
-   **成功响应 (200 OK)**: 返回包含财务速览和待办提醒的数据对象。

### 6.2 `GET /export/customers`

-   **功能**: 导出客户信息的CSV文件 (需要认证)。
-   **查询参数**: 与 `GET /customers` 相同，用于筛选导出的数据。
-   **成功响应 (200 OK)**: 返回 `text/csv` 类型的文件流。

### 6.3 `POST /import/customers`

-   **功能**: 导入客户信息的CSV文件 (需要认证)。
-   **请求体**: `multipart/form-data`，包含一个名为 `file` 的CSV文件。
-   **成功响应 (200 OK)**:
    ```json
    {
      "message": "Import completed",
      "results": {
        "success": 50,
        "failed": 2
      }
    }
    ```

### 6.4 `GET /export/growth-logs`

-   **功能**: 导出学生成长记录的CSV文件 (需要认证)。
-   **查询参数**: `studentId`, `classId`, `startDate`, `endDate` 等用于筛选。
-   **成功响应 (200 OK)**: 返回 `text/csv` 类型的文件流。

### 6.5 `GET /export/finance`

-   **功能**: 导出财务数据的CSV文件 (需要认证)。
-   **查询参数**: `startDate`, `endDate` 等用于筛选。
-   **成功响应 (200 OK)**: 返回 `text/csv` 类型的文件流。 