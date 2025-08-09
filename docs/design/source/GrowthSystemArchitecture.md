### **学生成长量化系统架构文档 (V1.0)**

#### **1. 概述与目标**

**1.1. 项目愿景**
本系统旨在建立一个科学、客观、精准的学生个人成长追踪体系。目标是超越传统的、基于主观印象的评价方式，通过量化分析，为教师提供实时、可行动的教学洞察，最终实现个性化教育和学生潜能的最大化。

**1.2. 核心挑战与设计原则**
本架构旨在解决以下核心挑战：
*   **数据稀疏与不规律**：教师的记录在时间上是随机分布的，节假日期间甚至完全缺失。
*   **数据稀疏与权重差异**：记录频率不规律，且事件本身的重要性各不相同。
*   **趋势重于绝对值**：学生的成长是一个动态过程，其“趋势”和“变化率”比任何静态的“分数”都更有意义。

**设计原则**：
*   **模型驱动**：系统的核心是一个动态的数学模型，而非简单的记录和统计。
*   **状态估计**：我们不直接相信每一次的观测（记录），而是将其视为对学生“真实内在状态”的一次不完美测量，我们的目标是尽可能精确地估计这个内在状态。
*   **洞察优先**：系统最终呈现给用户的不是原始数据或分数，而是经过模型解释后的高层级洞察（如趋势、稳定性、预警信号）。

#### **2. 核心理念：为何选择卡尔曼滤波器？**

我们将学生的每一项成长属性（如“课堂纪律”）想象成一个我们想要追踪的**隐形动态目标**。

*   **真实状态 (State)**：目标拥有一个我们无法直接观测的“真实能力水平 (`μ`)”和“真实进步速度 (`ν`)”。
*   **观测数据 (Measurement)**：每一次的行为记录，都是对这个目标的一次不完美的观测。

**卡尔曼滤波器 (Kalman Filter)** 是解决此类问题的理想工具。它通过一个无限循环的**“预测-更新”**过程，来持续优化对目标真实状态的估计：
1.  **预测 (Predict)**：基于上一刻的“状态”（位置和速度），模型预测出下一刻目标会出现在哪里。即使没有新的观测，预测也会持续。
2.  **更新 (Update)**：当一个新的观测数据（行为记录）传来时，模型会智能地融合“预测值”和“观测值”，根据两者的可信度，给出一个当前最精准的“最优估计值”。

这个模型天然地、优雅地解决了我们面临的所有核心挑战。

#### **3. 系统总体架构**

本系统建议采用微服务或模块化架构，将核心计算引擎与主应用解耦。

```mermaid
graph TD
    subgraph 用户端 (Frontend)
        A[学生成长仪表盘]
    end

    subgraph 后端 (Backend)
        B[API 网关]
        C[成长日志服务 GrowthLog Service]
        D{消息队列 (e.g., RabbitMQ)}
        E[成长计算引擎 Growth Engine]
        F[洞察分析服务 Insight Service]
        G[数据库 (PostgreSQL)]
        H[状态缓存 (Redis)]
    end

    A --> B
    B --> C
    B --> F
    C --> G
    C -- 异步消息 --> D
    D -- 消费消息 --> E
    E <--> H
    E --> G
    F --> G
```

**组件职责**:
*   **成长日志服务 (GrowthLog Service)**: 负责接收前端的日志记录请求，将其持久化到数据库，并向消息队列发送一个“需要更新状态”的异步消息。
*   **成长计算引擎 (Growth Engine)**: **系统的核心**。它作为独立的消费者，监听消息队列。每当收到消息，它会取出对应的学生-属性状态，运行卡尔曼滤波算法，并将更新后的状态写回缓存和数据库。
*   **洞察分析服务 (Insight Service)**: 负责提供API，根据数据库中存储的成长状态历史数据，计算并生成给前端展示的趋势、稳定性等高层级洞察。
*   **状态缓存 (Redis)**: 存储每个“学生-属性对”的最新卡尔曼滤波器状态（状态向量`x`和协方差矩阵`P`）。引擎每次计算前先从缓存读取，极大提升性能。

#### **4. 数据模型设计 (Prisma Schema)**

**4.1. `Tag` (标准标签库)**
由专家预定义，教师只能选择，不能创建。

```prisma
model Tag {
  id             Int          @id @default(autoincrement())
  text           String       // 标签文本, e.g., "主动回答问题"
  type           TagType      // 归属大类, e.g., "学习主动性"
  sentiment      TagSentiment // 情感极性: POSITIVE, NEGATIVE
  defaultWeight  Int          // 默认权重/重要性 (1-10)
  // ...
  growthLogs     GrowthLog[]
  growthStates   GrowthState[]
}

enum TagSentiment {
  POSITIVE
  NEGATIVE
}
```

**4.2. `GrowthLog` (原始事件记录)**
这是不可变的原始数据日志 (Immutable Log)。

```prisma
model GrowthLog {
  id           Int      @id @default(autoincrement())
  createdAt    DateTime @default(now()) // 事件发生时间
  enrollmentId Int      // 关联到具体学生
  tagId        Int      // 关联到标准标签
  recordedById Int      // 记录的教师ID
  notes        String?  // 具体事由与上下文
  weight       Int      // 教师调整后的本次事件权重

  enrollment   ClassEnrollment @relation(...)
  tag          Tag             @relation(...)
  recordedBy   User            @relation(...)
}
```

**4.3. `GrowthState` (成长状态快照)**
存储卡尔曼滤波器的持久化状态。

```prisma
model GrowthState {
  id           String    @id @default(uuid()) // 唯一ID
  enrollmentId Int       // 学生
  tagId        Int       // 针对哪个标签/属性
  
  // 核心状态变量
  level        Float     // 当前预估的潜在水平 (μ)
  trend        Float     // 当前预估的成长动量 (ν)

  // 卡尔曼滤波器内部状态 (JSON或分开存储)
  // 状态协方差矩阵 P: [[p11, p12], [p21, p22]]
  // 用于表示模型对level和trend估计的不确定性
  covarianceMatrix Json    

  lastUpdatedAt DateTime @updatedAt // 最后更新时间

  @@unique([enrollmentId, tagId])
  @@map("growth_states")
}
```

#### **5. 核心算法工作流：成长计算引擎**

**5.1. 状态初始化**
当某学生第一次收到关于某`Tag`的记录时，系统为其创建一个`GrowthState`记录：
*   `level (μ)`: 根据该`Tag`的情感极性（`sentiment`）和权重（`weight`）设置一个初始值。例如 `sentiment(1 or -1) * weight`。
*   `trend (ν)`: 初始化为 `0`。
*   `covarianceMatrix (P)`: 初始化为一个较大的值 `[[10, 0], [0, 10]]`，代表初始状态具有高度不确定性。

**5.2. 卡尔曼滤波器核心参数定义**

*   **状态向量 `x`**: `[level, trend]`ᵀ (即 `[μ, ν]`ᵀ)
*   **状态转移矩阵 `F`**: `[[1, Δt], [0, 1]]`。其中 `Δt` 是距离上次更新的时间差（单位：天）。它描述了系统如何随时间演化：`level_new = level_old + Δt * trend_old`。
*   **观测矩阵 `H`**: `[[1, 0]]`。它将二维的“状态”映射到一维的“观测”上，因为老师的记录只能反映`level`，无法直接观测`trend`。
*   **过程噪声协方差 `Q`**: `[[q, 0], [0, q]]`。代表模型自身的不确定性（例如学生成长不是完美的线性）。这是一个需要**调优**的关键参数，`q`越小代表我们越相信模型的预测。
*   **观测噪声 `R`**: 代表观测数据的不确定性。这是**动态**的，其值与`GrowthLog.weight`成反比。一次权重高的记录（如考试作弊），`R`值就小，代表我们更相信这次观测；反之亦然。`R = 1 / weight`。

**5.3. 引擎工作流程 (处理单条新日志)**
1.  **接收消息**: 从消息队列获取 `growthLogId`。
2.  **数据加载**:
    *   从数据库加载 `GrowthLog` 的完整信息。
    *   从 Redis (或数据库) 加载对应的 `GrowthState`。
3.  **计算时间差 `Δt`**: `Δt = newLog.createdAt - state.lastUpdatedAt`。
4.  **预测步骤**:
    *   `x_predicted = F * x_previous`
    *   `P_predicted = F * P_previous * Fᵀ + Q`
5.  **准备观测数据**:
    *   `z = newLog.sentiment * newLog.weight` (观测值)
    *   `R = 1 / newLog.weight` (观测噪声)
6.  **更新步骤**:
    *   `y = z - H * x_predicted` (观测残差)
    *   `S = H * P_predicted * Hᵀ + R` (残差协方差)
    *   `K = P_predicted * Hᵀ * S⁻¹` (最优卡尔曼增益)
    *   `x_new = x_predicted + K * y`
    *   `P_new = (I - K * H) * P_predicted`
7.  **持久化**: 将计算出的新状态 `x_new` (即`level`和`trend`) 和 `P_new` 更新到 Redis 和数据库中。

#### **6. API 设计**

*   **`POST /api/growth-logs`**:
    *   **Body**: `{ enrollmentId, tagId, notes, weight }`
    *   **Action**: 创建`GrowthLog`条目，并发送异步消息。
    *   **Response**: `202 Accepted`

*   **`GET /api/students/{studentId}/growth-summary`**:
    *   **Action**: 从`GrowthState`表中查询该学生所有被追踪属性的最新状态。
    *   **Response**: `[{ tagId, tagName, level_normalized, trend_direction, stability_level }]`
        *   `trend_direction`: 'UP', 'DOWN', 'STABLE'
        *   `stability_level`: 'HIGH', 'MEDIUM', 'LOW'

*   **`GET /api/students/{studentId}/growth-chart?tagId={tagId}`**:
    *   **Action**: 查询`GrowthState`的历史记录（或通过定期快照实现），并结合`GrowthLog`原始数据。
    *   **Response**: ` { estimated_curve: [{date, level, confidence_upper, confidence_lower}], actual_logs: [{date, value}] }`
        *   `confidence_upper/lower` 可由协方差矩阵 `P` 计算得出。

#### **7. 技术栈与实施建议**

*   **后端**: Node.js / TypeScript (与项目现有技术栈保持一致)。
*   **计算库**: 推荐使用成熟的JS科学计算库，如 `kalmanjs` 或 `node-kalman`。如果功能不足，可以参考Python `pykalman` 的实现逻辑进行定制开发。
*   **异步处理**: 强烈建议使用消息队列（如 RabbitMQ, SQS, or Kafka）来解耦日志记录和后台计算，保证API的快速响应和系统的可扩展性。 

#### **8. 当前运营模式说明**

**8.1. 小规模运营特点**
- **无教师角色区分**：当前规模较小，无需区分具体是哪位教师记录
- **管理员统一管理**：由管理员负责标签管理和成长记录
- **快速打标签模式**：专注5秒内完成标签记录，暂不使用notes字段

**8.2. 标签管理权限**
- **标签创建**：管理员可创建新的Growth标签，设置情感极性和默认权重
- **标签使用**：记录时可选择标签并实时调整权重（1-10）
- **标签扩展**：支持随时添加新的正面/负面标签

**8.3. 预留扩展字段**
以下字段为未来规模扩大时预留：
- `recordedById`：记录人ID，用于数据分析和偏见校正
- `notes`：事件备注，用于提供详细上下文
- 相关索引和关系已建立，便于未来平滑升级

**8.4. 快速操作流程**
1. 选择学生
2. 选择标签（正面/负面）
3. 调整权重（可选，默认使用标签预设权重）
4. 确认记录（目标5秒内完成） 