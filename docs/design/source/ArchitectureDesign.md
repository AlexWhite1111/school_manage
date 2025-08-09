
---

### 修正与增补后的API端点设计

#### **Auth & User Module (`/api`)**
这部分需要区分对外的认证`/auth`和对内的用户管理`/users`。

-   `POST /auth/login`: 用户登录。
-   `POST /auth/logout`: 用户登出。
-   `GET /users/me`: 获取当前登录用户信息。
-   `PUT /users/me`: **[新增]** 更新当前登录用户的信息（如用户名、辅助手机/邮箱）。这是实现`PersonalInterfaceWorkflow.md`中“修改用户信息”所必需的。
-   `PUT /users/me/password`: **[新增]** 修改当前登录用户的密码。这是实现`PersonalInterfaceWorkflow.md`中“修改密码”并强制重新登录所必需的。

---

#### **CRM Module (`/api`)**

-   `GET /customers`: 获取客户列表，支持按`status`、`name`、`school`等条件进行筛选和模糊搜索。
-   `GET /customers/stats`: **[新增]** 获取CRM看板顶部的核心统计数据（总客户数、各阶段数量等）。这比在获取客户列表时附加统计更高效。
-   `POST /customers`: 创建新客户（包含其`parents`, `customer_tags`, `communication_logs`等初始信息）。
-   `GET /customers/:id`: 获取单个客户的完整档案（包含所有关联信息）。
-   `PUT /customers/:id`: 更新一个客户的完整档案。后端服务会处理`parents`, `customer_tags`等关联表的同步。
-   `DELETE /customers`: 批量删除客户。请求体中应包含ID数组 `{"ids": [1, 2, 3]}`。
-   `POST /customers/:id/logs`: 为指定客户添加一条新的沟通纪要。
-   `PUT /logs/:logId`: **[新增]** 更新指定的沟通纪要。这是`LeadProfileWorkflow.md`中“编辑已有纪要”功能所必需的。
-   `DELETE /logs/:logId`: **[建议]** 删除指定的沟通纪要，作为补充功能。

---

#### **Tags Module (`/api`)**
将标签管理独立出来，以支持“自定义标签”功能。

-   `GET /tags`: 获取所有预定义的标签，可按`type`筛选。
-   `POST /tags`: **[新增]** 创建一个新的自定义标签。当用户在`LeadProfileWorkflow.md`或`StudentGrowthLogWorkflow.md`的自定义输入框中输入一个新词条时，前端会调用此接口。

---

#### **Student Log Module (`/api`)**

-   `GET /classes`: 获取所有班级列表。
-   `POST /classes`: 创建一个新班级。
-   `GET /classes/:id/students`: 获取指定班级下的所有学生及其当日考勤状态。
-   `POST /classes/:id/enrollments`: **[优化]** 向班级中批量添加学生（创建`class_enrollments`关联）。使用`enrollments`更符合RESTful风格。
-   `DELETE /enrollments`: **[优化]** 从班级中批量移除学生（删除`class_enrollments`关联），请求体包含enrollment ID数组。
-   `POST /attendance-records`: **[优化]** 记录单次考勤，路径改为复数形式。
-   `POST /growth-logs`: 记录单条学生成长标签。
-   `GET /students/:id/report`: 获取指定学生的个人成长报告，支持`startDate`和`endDate`作为查询参数。

---

#### **Finance Module (`/api`)**

-   `GET /finance/student-summaries`: **[优化]** 获取财务中心的学生财务状况总览列表。路径名更清晰。
-   `GET /finance/students/:id/details`: **[优化]** 获取单个学生的详细财务信息（所有订单和付款）。路径名更清晰。
-   `POST /finance/orders`: 为学生创建新订单。
-   `PUT /finance/orders/:orderId`: **[建议]** 更新订单信息。
-   `DELETE /finance/orders/:orderId`: **[建议]** 删除订单。
-   `POST /finance/orders/:orderId/payments`: **[优化]** 为指定订单添加一笔收款记录。这样路径更有层次，逻辑更清晰。
-   `PUT /finance/payments/:paymentId`: **[建议]** 更新收款记录。
-   `DELETE /finance/payments/:paymentId`: **[建议]** 删除收款记录。

---

#### **Dashboard & Global Module (`/api`)**

-   `GET /dashboard/summary`: **[优化]** 获取核心仪表盘数据。路径名更清晰。
-   `GET /export/customers`: 导出客户信息的CSV，支持筛选参数。
-   `POST /import/customers`: **[新增]** 导入客户信息的CSV文件。这是实现`KanbanViewWorkflow.md`中“导入数据”功能所必需的。
-   `GET /export/growth-logs`: 导出学生成长记录的CSV，支持筛选参数。
-   `GET /export/finance`: 导出财务数据的CSV，支持筛选参数。

---
