# 成绩分布图表切换功能问题分析报告

## 问题描述

在考试科目详情页面（`ExamSubjectDetailPage.tsx`）的成绩分布散点图中，用户点击"归一化分数"和"原始分数"切换按钮时，图表显示没有发生相应变化。

## 问题根因分析

### 1. 代码实现分析

经过代码审查，发现以下实现：

#### **状态管理（第73行）**
```typescript
const [scoreType, setScoreType] = useState<'original' | 'normalized'>('normalized');
```

#### **切换按钮（第498-505行）**
```typescript
<Radio.Group 
  value={scoreType} 
  onChange={(e) => setScoreType(e.target.value)}
  size="small"
>
  <Radio.Button value="normalized">归一化分数</Radio.Button>
  <Radio.Button value="original">原始分数</Radio.Button>
</Radio.Group>
```

#### **数据生成逻辑（第109-126行）**
```typescript
const scatterData = data?.students ? data.students.map((student: any, index: number) => {
  const displayScore = scoreType === 'normalized' ? student.normalizedScore : student.score;
  const maxScore = scoreType === 'normalized' ? 100 : data.exam.totalScore;
  
  return {
    x: index + 1,
    y: displayScore, // 这里会根据scoreType切换
    // ...其他属性
  };
}) : [];
```

#### **图表配置（第527、539行等）**
```typescript
<YAxis 
  domain={[0, scoreType === 'normalized' ? 100 : data.exam.totalScore]}
  label={{ value: scoreType === 'normalized' ? '归一化成绩' : '原始成绩' }}
/>

<ReferenceLine 
  y={scoreType === 'normalized' ? data.subject.normalizedAverageScore : data.subject.averageScore}
/>
```

### 2. 潜在问题原因

#### **主要原因：数据依赖缺失**
`scatterData` 的计算依赖于 `scoreType` 状态，但在组件中没有正确地触发重新计算：

1. **React渲染优化问题**：`scatterData` 在每次组件渲染时都会重新计算，但 Recharts 库可能对相同结构的数据进行了缓存优化
2. **数据结构相同问题**：虽然 `y` 值发生了变化，但数组长度和对象结构完全相同，可能导致 Recharts 认为数据没有变化

#### **次要原因：useEffect依赖缺失**
数据加载的 `useEffect`（第105-107行）没有将 `scoreType` 作为依赖：
```typescript
useEffect(() => {
  loadExamSubjectData();
}, [examId, subject, historyLimit]); // 缺少 scoreType
```

### 3. 具体表现

- 用户点击切换按钮，`scoreType` 状态正确更新
- Y轴标签和domain正确切换
- 参考线位置正确调整
- **但散点数据点位置没有更新**，仍然显示之前的数值

## 解决方案

### 1. **使用 useMemo 优化数据计算**
```typescript
const scatterData = useMemo(() => {
  return data?.students ? data.students.map((student: any, index: number) => {
    const displayScore = scoreType === 'normalized' ? student.normalizedScore : student.score;
    const maxScore = scoreType === 'normalized' ? 100 : data.exam.totalScore;
    
    return {
      x: index + 1,
      y: displayScore,
      studentName: student.name,
      score: student.score,
      normalizedScore: student.normalizedScore,
      displayScore: displayScore,
      rank: student.rank,
      color: // 颜色逻辑...
    };
  }) : [];
}, [data, scoreType]); // 明确依赖 scoreType
```

### 2. **添加数据版本标识**
```typescript
const scatterData = data?.students ? data.students.map((student: any, index: number) => {
  return {
    // ...其他属性
    _version: `${scoreType}-${index}`, // 强制刷新
  };
}) : [];
```

### 3. **强制图表重新渲染**
```typescript
const chartKey = `scatter-${scoreType}-${data?.exam?.id || 'default'}`;

<ScatterChart 
  key={chartKey} // 强制重新渲染
  data={scatterData} 
  // ...其他属性
>
```

## 影响范围

- 用户体验：切换功能失效，影响数据分析的准确性
- 数据展示：无法正确对比归一化分数和原始分数的分布差异
- 功能完整性：UI控件与实际效果不符

## 优先级

**高优先级** - 这是一个影响核心功能的显示问题，需要立即修复。

## 建议修复顺序

1. 首先实施 **useMemo 方案**（最优雅的解决方案）
2. 如果问题仍然存在，添加 **chartKey 强制重渲染**
3. 验证修复效果并进行测试

## 测试建议

- 切换归一化/原始分数，验证散点位置变化
- 验证Y轴刻度和参考线同步更新
- 检查Tooltip显示的数值正确性
- 测试在不同考试和科目下的切换效果 