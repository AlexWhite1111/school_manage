# Growth系统前端API使用文档

## 📋 概述

本文档详细说明了Growth学生成长量化系统前端的API调用方法和组件使用指南。Growth系统基于卡尔曼滤波器算法，提供学生成长数据的智能分析和可视化展示。

## 🔌 API层

### 核心API类：`GrowthApi`

位置：`src/api/growthApi.ts`

#### **标签管理API**

```typescript
// 获取Growth标签列表
const tags = await GrowthApi.getGrowthTags({
  sentiment: 'POSITIVE', // 可选：筛选正面/负面标签
  search: '积极',        // 可选：搜索关键词
  isActive: true,        // 可选：是否启用
  orderBy: 'usageCount', // 可选：排序字段
  order: 'desc'          // 可选：排序方向
});

// 创建新标签
const newTag = await GrowthApi.createGrowthTag({
  text: '积极回答问题',
  sentiment: 'POSITIVE',
  defaultWeight: 7,
  description: '学生主动回答老师问题的表现'
});

// 更新标签
const updatedTag = await GrowthApi.updateGrowthTag(tagId, {
  defaultWeight: 8,
  isActive: true
});

// 删除标签（软删除）
await GrowthApi.deleteGrowthTag(tagId);
```

#### **成长记录API**

```typescript
// 快速记录成长日志
const logResponse = await GrowthApi.recordGrowthLog({
  enrollmentId: 123,
  tagId: 456,
  weight: 8,           // 可选：权重1-10，默认使用标签默认权重
  context: '课堂表现'  // 可选：上下文说明
});

// 批量记录
const batchResponse = await GrowthApi.batchRecordGrowthLogs({
  records: [
    { enrollmentId: 123, tagId: 456, weight: 7 },
    { enrollmentId: 124, tagId: 457, weight: 6 }
  ]
});

// 查询成长日志
const logs = await GrowthApi.getGrowthLogs({
  enrollmentId: 123,     // 可选：筛选特定学生
  startDate: '2024-01-01', // 可选：开始日期
  endDate: '2024-01-31',   // 可选：结束日期
  sentiment: 'POSITIVE',   // 可选：筛选正面/负面记录
  page: 1,
  limit: 20
});
```

#### **学生成长状态API**

```typescript
// 通过enrollmentId获取学生成长概况
const summary = await GrowthApi.getStudentGrowthSummary(enrollmentId);

// 通过publicId获取学生成长概况
const summary = await GrowthApi.getStudentGrowthSummaryByPublicId(publicId);

// 获取成长趋势图数据
const chartData = await GrowthApi.getStudentGrowthChart(enrollmentId, {
  tagId: 456,              // 可选：特定标签
  period: 'month',         // 可选：时间周期
  includeConfidence: true, // 可选：包含置信区间
  dataPoints: 30          // 可选：数据点数量
});
```

#### **系统配置API**

```typescript
// 获取当前激活的配置
const config = await GrowthApi.getActiveGrowthConfig();

// 更新配置
const updatedConfig = await GrowthApi.updateGrowthConfig(configId, {
  processNoise: 0.1,
  initialUncertainty: 10.0,
  timeDecayFactor: 0.01
});

// 创建新配置
const newConfig = await GrowthApi.createGrowthConfig({
  name: '自定义配置',
  processNoise: 0.05,
  initialUncertainty: 15.0,
  timeDecayFactor: 0.005,
  minObservations: 3,
  maxDaysBetween: 30
});
```

#### **快速查询API**

```typescript
// 获取学生列表（用于快速选择）
const students = await GrowthApi.getQuickStudents({
  classId: 123,           // 可选：筛选班级
  search: '张三',         // 可选：搜索学生名称
  hasGrowthData: true,    // 可选：只返回有成长数据的学生
  limit: 50
});

// 获取班级列表
const classes = await GrowthApi.getQuickClasses();
```

## 🧰 工具函数

### `growthUtils` - 核心工具函数

位置：`src/utils/growthUtils.ts`

```typescript
import { growthUtils } from '@/utils/growthUtils';

// 计算变化率
const changeRate = growthUtils.calculateChangeRate(currentScore, previousScore);

// 格式化成长分数
const formattedScore = growthUtils.formatGrowthScore(3.14159, 2); // "3.14"

// 判断趋势方向
const direction = growthUtils.getTrendDirection(0.5); // 'UP'

// 格式化置信度
const confidence = growthUtils.formatConfidence(0.85); // "85%"

// 根据趋势获取颜色
const color = growthUtils.getColorByTrend('UP'); // "#52c41a"

// 计算整体成长趋势
const overallTrend = growthUtils.calculateOverallTrend(states); // 'IMPROVING'

// 计算综合成长分数
const growthScore = growthUtils.calculateGrowthScore(states);

// 生成词云数据
const wordCloudData = growthUtils.generateWordCloudData(states);
```

### `growthAnalytics` - 数据分析工具

```typescript
import { growthAnalytics } from '@/utils/growthUtils';

// 分析成长状态
const analysis = growthAnalytics.analyzeStates(states);
console.log(analysis.overallScore);     // 综合分数
console.log(analysis.topPerformingTags); // 表现最好的标签
console.log(analysis.needsAttentionTags); // 需要关注的标签

// 生成摘要文本
const summary = growthAnalytics.generateSummary(states);
```

## 🎨 组件库

### 1. `GrowthScoreDisplay` - 成长分数显示

```typescript
import { GrowthScoreDisplay } from '@/components/growth';

// 基础用法
<GrowthScoreDisplay 
  states={growthStates}
  showDetails={true}
  size="default"
/>

// 紧凑模式（用于学生卡片）
<GrowthScoreDisplay 
  states={growthStates}
  size="small"
  showDetails={false}
/>

// 大型模式（用于报告页面头部）
<GrowthScoreDisplay 
  states={growthStates}
  size="large"
  showDetails={true}
/>
```

### 2. `GrowthTagButton` - 增强版标签记录按钮

```typescript
import { GrowthTagButton } from '@/components/growth';

const handleRecord = async (data: GrowthLogRequest) => {
  await GrowthApi.recordGrowthLog(data);
  // 刷新数据
};

<GrowthTagButton
  tag={growthTag}
  enrollmentId={student.enrollmentId}
  studentName={student.name}
  onRecord={handleRecord}
  size="small"
  type="default"
  showQuickRecord={true}
/>
```

### 3. `KalmanStatePanel` - 卡尔曼状态面板

```typescript
import { KalmanStatePanel } from '@/components/growth';

const handleConfigClick = () => {
  // 打开配置弹窗
  setConfigModalVisible(true);
};

<KalmanStatePanel
  states={growthStates}
  showDetails={true}
  onConfigClick={handleConfigClick}
/>
```

### 4. `KalmanTrendChart` - 趋势图表

```typescript
import { KalmanTrendChart } from '@/components/growth';

const handleFiltersChange = (filters: ChartFilters) => {
  // 重新获取图表数据
  fetchChartData(filters);
};

<KalmanTrendChart
  data={chartData}
  loading={loading}
  onFiltersChange={handleFiltersChange}
  showControls={true}
  height={400}
/>
```

### 5. `KalmanConfigPanel` - 参数配置面板

```typescript
import { KalmanConfigPanel } from '@/components/growth';

const handleSave = async (configUpdate: ConfigUpdate) => {
  await GrowthApi.updateGrowthConfig(config.id, configUpdate);
  message.success('配置保存成功');
};

<KalmanConfigPanel
  config={kalmanConfig}
  onSave={handleSave}
  onReset={() => fetchConfig()}
  loading={saving}
/>
```

## 🔄 React Hooks

### 自定义Hook示例

```typescript
// useGrowthData.ts
import { useState, useEffect } from 'react';
import { GrowthApi, GrowthSummary } from '@/api/growthApi';

export const useGrowthData = (enrollmentId: number) => {
  const [data, setData] = useState<GrowthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const summary = await GrowthApi.getStudentGrowthSummary(enrollmentId);
        setData(summary);
        setError(null);
      } catch (err) {
        setError('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    if (enrollmentId) {
      fetchData();
    }
  }, [enrollmentId]);

  const refetch = () => {
    if (enrollmentId) {
      fetchData();
    }
  };

  return { data, loading, error, refetch };
};

// 使用示例
const { data: growthData, loading, refetch } = useGrowthData(enrollmentId);
```

## 📊 数据流集成

### 在现有页面中集成Growth功能

#### 1. StudentLogPage.tsx 集成

```typescript
import { GrowthScoreDisplay, GrowthTagButton } from '@/components/growth';
import { GrowthApi } from '@/api/growthApi';
import { useGrowthData } from '@/hooks/useGrowthData';

const StudentLogPage = () => {
  const [growthTags, setGrowthTags] = useState([]);
  
  useEffect(() => {
    // 加载Growth标签
    const loadGrowthTags = async () => {
      const tags = await GrowthApi.getGrowthTags({ isActive: true });
      setGrowthTags(tags);
    };
    loadGrowthTags();
  }, []);

  const handleGrowthRecord = async (data: GrowthLogRequest) => {
    await GrowthApi.recordGrowthLog(data);
    // 刷新学生数据
    refetchStudentData();
  };

  return (
    <div>
      {/* 学生卡片中添加成长分数显示 */}
      {students.map(student => (
        <Card key={student.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>{student.name}</div>
            <GrowthScoreDisplay 
              states={student.growthStates || []}
              size="small"
            />
          </div>
          
          {/* 成长标签按钮组 */}
          <div style={{ marginTop: '8px' }}>
            {growthTags.map(tag => (
              <GrowthTagButton
                key={tag.id}
                tag={tag}
                enrollmentId={student.enrollmentId}
                studentName={student.name}
                onRecord={handleGrowthRecord}
                size="small"
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};
```

#### 2. StudentGrowthReport.tsx 增强

```typescript
import { 
  GrowthScoreDisplay, 
  KalmanStatePanel, 
  KalmanTrendChart 
} from '@/components/growth';

const StudentGrowthReport = ({ studentId }: { studentId: string }) => {
  const [growthSummary, setGrowthSummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  
  useEffect(() => {
    const loadData = async () => {
      // 获取成长概况
      const summary = await GrowthApi.getStudentGrowthSummaryByPublicId(studentId);
      setGrowthSummary(summary);
      
      // 获取图表数据
      const chart = await GrowthApi.getStudentGrowthChartByPublicId(studentId, {
        period: 'month',
        includeConfidence: true
      });
      setChartData(chart);
    };
    
    loadData();
  }, [studentId]);

  return (
    <div>
      {/* 页面头部 - 成长分数突出显示 */}
      {growthSummary && (
        <GrowthScoreDisplay 
          states={growthSummary.states}
          size="large"
          showDetails={true}
        />
      )}
      
      {/* 卡尔曼状态面板 */}
      {growthSummary && (
        <KalmanStatePanel
          states={growthSummary.states}
          showDetails={true}
          onConfigClick={() => setConfigModalVisible(true)}
        />
      )}
      
      {/* 趋势图表 */}
      {chartData && (
        <KalmanTrendChart
          data={chartData}
          showControls={true}
          height={400}
        />
      )}
      
      {/* 保持原有的考试分析部分不变 */}
      {renderExamAnalysis()}
      {renderRadarChart()}
      {/* ... 其他考试相关组件 */}
    </div>
  );
};
```

#### 3. SystemSettingsPage.tsx 集成

```typescript
import { KalmanConfigPanel } from '@/components/growth';

const SystemSettingsPage = () => {
  const [kalmanConfig, setKalmanConfig] = useState(null);
  
  useEffect(() => {
    const loadConfig = async () => {
      const config = await GrowthApi.getActiveGrowthConfig();
      setKalmanConfig(config);
    };
    loadConfig();
  }, []);

  const handleConfigSave = async (configUpdate: ConfigUpdate) => {
    if (kalmanConfig) {
      await GrowthApi.updateGrowthConfig(kalmanConfig.id, configUpdate);
      // 重新加载配置
      const newConfig = await GrowthApi.getActiveGrowthConfig();
      setKalmanConfig(newConfig);
    }
  };

  return (
    <div>
      {/* 其他系统设置 */}
      
      {/* Growth系统配置 */}
      {kalmanConfig && (
        <KalmanConfigPanel
          config={kalmanConfig}
          onSave={handleConfigSave}
          loading={false}
        />
      )}
    </div>
  );
};
```

## 🔧 最佳实践

### 1. 错误处理

```typescript
const handleGrowthRecord = async (data: GrowthLogRequest) => {
  try {
    await GrowthApi.recordGrowthLog(data);
    message.success('记录成功');
    refetchData();
  } catch (error) {
    if (error.response?.status === 400) {
      message.error('请求参数错误');
    } else if (error.response?.status === 409) {
      message.warning('5分钟内不能重复记录相同标签');
    } else {
      message.error('记录失败，请重试');
    }
  }
};
```

### 2. 数据缓存

```typescript
import { useQuery } from 'react-query';

const useGrowthTags = () => {
  return useQuery(
    ['growth-tags'],
    () => GrowthApi.getGrowthTags({ isActive: true }),
    {
      staleTime: 5 * 60 * 1000, // 5分钟缓存
      cacheTime: 10 * 60 * 1000 // 10分钟保留
    }
  );
};
```

### 3. 性能优化

```typescript
// 使用React.memo优化组件渲染
const GrowthScoreDisplay = React.memo(({ states, ...props }) => {
  // 组件实现
});

// 使用useMemo缓存计算结果
const growthScore = useMemo(() => {
  return growthUtils.calculateGrowthScore(states);
}, [states]);

// 使用useCallback缓存事件处理函数
const handleRecord = useCallback(async (data: GrowthLogRequest) => {
  await GrowthApi.recordGrowthLog(data);
  refetch();
}, [refetch]);
```

## 📝 类型定义

### 核心数据类型

```typescript
// 成长状态
interface GrowthState {
  tagId: number;
  tagName: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  level: number;        // 当前水平 (μ)
  trend: number;        // 趋势速度 (ν)
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  confidence: number;   // 置信度 0-1
  totalObservations: number;
  lastUpdatedAt: string;
}

// 成长标签
interface GrowthTag {
  id: number;
  text: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  defaultWeight: number;
  usageCount: number;
  type: 'GROWTH_POSITIVE' | 'GROWTH_NEGATIVE';
  description?: string;
  isActive: boolean;
  recentUsage: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

// 图表数据
interface ChartData {
  tagId: number;
  tagName: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  timeSeriesData: {
    date: string;
    level: number;
    trend: number;
    confidenceUpper: number;
    confidenceLower: number;
    actualEvents: number;
  }[];
  currentState: {
    level: number;
    trend: number;
    confidence: number;
    lastUpdated: string;
  };
}
```

## 🚀 部署注意事项

### 1. 环境变量

确保前端环境变量正确配置：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. API路径

Growth API的基础路径为 `/api/growth`，确保后端路由配置正确。

### 3. 权限控制

不同用户角色对Growth功能的访问权限：

- `SUPER_ADMIN`: 完全访问权限
- `MANAGER`: 管理和查看权限
- `TEACHER`: 记录和查看权限
- `STUDENT`: 仅查看自己的数据

---

## 📞 技术支持

如需技术支持或有任何问题，请联系开发团队。

**文档版本**: v1.0  
**最后更新**: 2024年1月  
**维护者**: Growth系统开发团队 