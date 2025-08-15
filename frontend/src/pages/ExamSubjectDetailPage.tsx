
import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Space, Statistic, Typography, Alert, Spin, Empty, Table, Tag, Progress, message, Radio, Select, Divider, theme as themeApi, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  LineChartOutlined,
  TrophyOutlined,
  UserOutlined,
  BookOutlined,
  TagOutlined
} from '@ant-design/icons';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Legend
} from 'recharts';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import * as examApi from '@/api/examApi';

const { Title, Text } = Typography;

// 科目中文映射
const subjectLabels: Record<string, string> = {
  'CHINESE': '语文',
  'MATH': '数学', 
  'ENGLISH': '英语',
  'PHYSICS': '物理',
  'CHEMISTRY': '化学',
  'BIOLOGY': '生物',
  'HISTORY': '历史',
  'GEOGRAPHY': '地理',
  'POLITICS': '政治'
};

const ExamSubjectDetailPage: React.FC = () => {
  const { examId, subject } = useParams<{ examId: string; subject: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

  // 状态管理
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoreType, setScoreType] = useState<'original' | 'normalized'>('normalized'); // 成绩类型选择
  const [historyLimit, setHistoryLimit] = useState<number>(5); // 历史考试数量

  // 主题适配样式
  const { token } = themeApi.useToken();
  const themeStyles = {
    cardBackground: token.colorBgContainer,
    textPrimary: token.colorText,
    textSecondary: token.colorTextSecondary,
    successColor: token.colorSuccess,
    warningColor: token.colorWarning,
    errorColor: token.colorError,
    primaryColor: token.colorPrimary,
  } as const;

  // 数据加载
  const loadExamSubjectData = async () => {
    if (!examId || !subject) return;
    
    setLoading(true);
    try {
      // 调用后端API获取考试科目详情
      const apiData = await examApi.getExamSubjectDetail(parseInt(examId), subject, historyLimit);
      setData(apiData);
      setError(null);
    } catch (err) {
      console.error('❌ 考试科目数据加载失败:', err);
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamSubjectData();
  }, [examId, subject, historyLimit]);

  // 成绩散点图数据 - 使用 useMemo 确保正确响应 scoreType 变化
  const scatterData = useMemo(() => {
    if (!data?.students) return [];
    
    return data.students.map((student: any, index: number) => {
      const displayScore = scoreType === 'normalized' ? student.normalizedScore : student.score;
      const maxScore = scoreType === 'normalized' ? 100 : data.exam.totalScore;
      
      return {
        x: index + 1, // 学生序号作为X轴
        y: displayScore, // 分数作为Y轴
        studentName: student.name,
        score: student.score,
        normalizedScore: student.normalizedScore,
        displayScore: displayScore,
        rank: student.rank,
        scoreType: scoreType, // 添加版本标识强制刷新
        color: displayScore >= (scoreType === 'normalized' ? 90 : maxScore * 0.9) ? themeStyles.successColor :
               displayScore >= (scoreType === 'normalized' ? 80 : maxScore * 0.8) ? themeStyles.primaryColor :
               displayScore >= (scoreType === 'normalized' ? 60 : maxScore * 0.6) ? themeStyles.warningColor : themeStyles.errorColor
      };
    });
  }, [data, scoreType, themeStyles]);

  // 图表强制刷新key
  const chartKey = useMemo(() => {
    return `scatter-${scoreType}-${data?.exam?.id || 'default'}-${data?.students?.length || 0}`;
  }, [scoreType, data?.exam?.id, data?.students?.length]);

  // 自定义散点图工具提示
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: themeStyles.cardBackground,
          border: `1px solid ${themeStyles.primaryColor}`,
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-2)'
        }}>
          <p style={{ margin: 0, color: themeStyles.textPrimary }}>
            <strong>{data.studentName}</strong>
          </p>
          <p style={{ margin: 0, color: themeStyles.textPrimary }}>
            原始分数: {data.score}分
          </p>
          <p style={{ margin: 0, color: themeStyles.textPrimary }}>
            归一化分数: {data.normalizedScore?.toFixed(1)}分
          </p>
          <p style={{ margin: 0, color: themeStyles.textSecondary }}>
            排名: 第{data.rank}名
          </p>
        </div>
      );
    }
    return null;
  };

  // 成绩分布柱状图配置（保留作为备选）
  const scoreDistributionConfig = data?.scoreDistribution ? {
    data: data.scoreDistribution,
    xField: 'range',
    yField: 'count',
    label: {
      position: 'middle' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.8,
        fontSize: 12,
        fontWeight: 'bold'
      },
      formatter: (datum: any) => `${datum.count}人\n(${datum.percentage}%)`
    },
    color: ({ range }: any) => {
      if (range.startsWith('90')) return themeStyles.successColor;
      if (range.startsWith('80')) return themeStyles.primaryColor;
      if (range.startsWith('70') || range.startsWith('60')) return themeStyles.warningColor;
      return themeStyles.errorColor;
    },
    meta: {
      range: { alias: '分数段' },
      count: { alias: '人数' }
    }
  } : null;

  // 历史趋势图数据
  const trendData = data?.historicalComparison ? [
    ...data.historicalComparison.map((exam: any) => ({
      examName: exam.examName,
      date: exam.date,
      averageScore: exam.averageScore,
      normalizedAverageScore: exam.normalizedAverageScore,
      passRate: exam.passRate,
      excellentRate: exam.excellentRate,
      excellentLine: exam.excellentLine
    })),
    {
      examName: data.exam.name,
      date: data.exam.date,
      averageScore: data.subject.averageScore,
      normalizedAverageScore: data.subject.normalizedAverageScore,
      passRate: data.subject.passRate,
      excellentRate: data.subject.excellentRate,
      excellentLine: data.subject.excellentLine
    }
  ] : [];

  // 学生表格配置
  const studentColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (rank: number) => (
        <Space>
          {rank <= 3 && (
            <TrophyOutlined style={{ 
              color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32' 
            }} />
          )}
          <Text strong={rank <= 10}>{rank}</Text>
        </Space>
      )
    },
    {
      title: '学生姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name: string, record: any) => (
        <AppButton 
          hierarchy="link" 
          onClick={() => handleStudentClick(record)}
          style={{ padding: 0, height: 'auto' }}
        >
          {name}
        </AppButton>
      )
    },
    {
      title: '成绩',
      dataIndex: 'normalizedScore',
      key: 'normalizedScore',
      width: 90,
      render: (normalizedScore: number, record: any) => (
        <Space direction="vertical" size={0}>
          <Text 
            strong 
            style={{ 
              color: normalizedScore >= 90 ? themeStyles.successColor : 
                     normalizedScore >= 80 ? themeStyles.primaryColor :
                     normalizedScore >= 60 ? themeStyles.warningColor : themeStyles.errorColor,
              fontSize: '16px'
            }}
          >
            {normalizedScore?.toFixed(1)}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            原始分：{record.score}
          </Text>
        </Space>
      )
    },
    {
      title: '班级排名',
      dataIndex: 'percentile',
      key: 'percentile',
      width: 100,
      render: (percentile: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text 
            strong 
            style={{ 
              color: parseFloat(percentile) >= 80 ? themeStyles.successColor : 
                     parseFloat(percentile) >= 60 ? themeStyles.primaryColor :
                     parseFloat(percentile) >= 40 ? themeStyles.warningColor : themeStyles.errorColor,
              fontSize: '14px'
            }}
          >
            {percentile ? `超过${percentile}%` : '-'}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            第{record.rank}名
          </Text>
        </Space>
      )
    },
    {
      title: '与平均分差距',
      key: 'avgDiff',
      width: 110,
      render: (_: any, record: any) => {
        const diff = record.normalizedScore - data.subject.normalizedAverageScore;
        const isAboveAvg = diff > 0;
        return (
          <Space direction="vertical" size={0}>
            <Text 
              strong 
              style={{ 
                color: isAboveAvg ? themeStyles.successColor : 
                       diff === 0 ? themeStyles.primaryColor : themeStyles.errorColor,
                fontSize: '14px'
              }}
            >
              {isAboveAvg ? '+' : ''}{diff.toFixed(1)}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {isAboveAvg ? '超过' : '低于'}平均分
            </Text>
          </Space>
        );
      }
    },
    {
      title: '评价标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: any[]) => (
        <Space wrap size={[4, 4]}>
          {tags?.map(tag => (
            <Tag key={tag.id} color={tag.color}>
              {tag.name}
            </Tag>
          )) || '-'}
        </Space>
      )
    }
  ];

  // 事件处理
  const handleBack = () => {
    navigate(`/student-log/exam/${examId}`, {
      state: { from: `/student-log/exam-subject/${examId}/${subject}` }
    });
  };

  const handleStudentClick = (student: any) => {
    console.log('🎯 点击学生查看趋势:', student);
            // 使用publicId进行跳转，确保URL结构正确
        const publicId = student.publicId;
    navigate(`/student-log/exam-subject/${examId}/${subject}/${publicId}`, {
      state: {
        studentName: student.name,
        fromExam: data.exam.name,
        fromSubject: subject,
        examId: examId,
        student: student
      }
    });
  };

  // 渲染组件
  if (loading) {
    return (
      <div style={{ 
        padding: isMobile ? '16px' : '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div data-page-container>
        <Alert 
          message="数据加载失败" 
          description={error || '未找到相关数据'}
          type="error" 
          showIcon 
          action={
            <AppButton size="sm" onClick={loadExamSubjectData}>
              重试
            </AppButton>
          }
        />
      </div>
    );
  }

  return (
    <div data-page-container>
      {/* 页面头部 */}
      {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
      <Card style={{ ...preset.style, marginBottom: 'var(--space-6)' }} styles={preset.styles}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <AppButton 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBack}
                size={isMobile ? 'middle' : 'large'}
              />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {subjectLabels[data.subject.name] || data.subject.name} 科目分析
                </Title>
                <Text type="secondary">
                  {data.exam.name} · {data.exam.date}
                </Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card> ); })()}

      {/* 核心指标概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-6)' }}>
        <Col xs={12} sm={6} md={4}>
          {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
          <Card size="small" style={preset.style} styles={preset.styles}>
            <Statistic
              title="原始平均分"
              value={data.subject.averageScore}
              precision={1}
              valueStyle={{ color: themeStyles.primaryColor, fontSize: '20px' }}
              suffix={<Text type="secondary">/{data.exam.totalScore}</Text>}
            />
          </Card> ); })()}
        </Col>
        <Col xs={12} sm={6} md={4}>
          {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
          <Card size="small" style={preset.style} styles={preset.styles}>
            <Statistic
              title="归一化平均分"
              value={data.subject.normalizedAverageScore}
              precision={1}
              valueStyle={{ color: themeStyles.primaryColor, fontSize: '20px' }}
              suffix={<Text type="secondary">/100</Text>}
            />
          </Card> ); })()}
        </Col>
        <Col xs={12} sm={6} md={4}>
          {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
          <Card size="small" style={preset.style} styles={preset.styles}>
            <Statistic
              title="最高分"
              value={data.subject.highestScore}
              valueStyle={{ color: themeStyles.successColor }}
              prefix={<TrophyOutlined />}
            />
          </Card> ); })()}
        </Col>
        <Col xs={12} sm={6} md={4}>
          {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
          <Card size="small" style={preset.style} styles={preset.styles}>
            <Statistic
              title="参与率"
              value={data.subject.participationRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: themeStyles.primaryColor }}
              prefix={<UserOutlined />}
            />
          </Card> ); })()}
        </Col>
        <Col xs={12} sm={6} md={4}>
          {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
          <Card size="small" style={preset.style} styles={preset.styles}>
            <Statistic
              title="及格率"
              value={data.subject.passRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: themeStyles.successColor }}
              prefix={<BookOutlined />}
            />
          </Card> ); })()}
        </Col>
        <Col xs={12} sm={6} md={4}>
          {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
          <Card size="small" style={preset.style} styles={preset.styles}>
            <Statistic
              title="优秀率"
              value={data.subject.excellentRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: themeStyles.successColor }}
              prefix={<TrophyOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              优秀线: {data.subject.excellentLine?.toFixed(1)}分
            </Text>
          </Card> ); })()}
        </Col>
      </Row>

      {/* 成绩分布散点图 */}
      {scatterData.length > 0 && (
        (() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              <span>成绩分布</span>
            </Space>
          }
          style={{ ...preset.style, marginBottom: 'var(--space-6)' }} styles={preset.styles}
          extra={
            <Space>
              <Radio.Group 
                value={scoreType} 
                onChange={(e) => setScoreType(e.target.value)}
                size="small"
              >
                <Radio.Button value="normalized">归一化分数</Radio.Button>
                <Radio.Button value="original">原始分数</Radio.Button>
              </Radio.Group>
              <Divider type="vertical" />
              <Text type="secondary">
                共 {data.students?.length || 0} 人
              </Text>
            </Space>
          }
        >
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart 
                key={chartKey}
                data={scatterData} 
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.textSecondary} opacity={0.3} />
                <XAxis 
                  dataKey="x" 
                  type="number"
                  domain={[0, 'dataMax + 1']}
                  tick={{ fontSize: 12, fill: themeStyles.textSecondary }}
                  label={{ value: '学生序号', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fill: themeStyles.textSecondary } }}
                />
                <YAxis 
                  dataKey="y"
                  type="number"
                  domain={[0, scoreType === 'normalized' ? 100 : data.exam.totalScore]}
                  tick={{ fontSize: 12, fill: themeStyles.textSecondary }}
                  label={{ value: scoreType === 'normalized' ? '归一化成绩' : '原始成绩', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: themeStyles.textSecondary } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter dataKey="y" fill={themeStyles.primaryColor}>
                  {scatterData.map((entry: any, index: number) => (
                    <Scatter key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
                {/* 平均分线 */}
                <ReferenceLine 
                  y={scoreType === 'normalized' ? data.subject.normalizedAverageScore : data.subject.averageScore} 
                  stroke={themeStyles.primaryColor} 
                  strokeDasharray="8 8"
                  strokeWidth={2}
                  label={{ value: "平均分", position: "right" }}
                />
                {/* 优秀线 */}
                <ReferenceLine 
                  y={scoreType === 'normalized' ? data.subject.excellentLine : (data.subject.excellentLine / 100) * data.exam.totalScore} 
                  stroke={themeStyles.successColor} 
                  strokeDasharray="6 6"
                  strokeWidth={2}
                  label={{ value: "优秀线", position: "right" }}
                />
                {/* 及格线 */}
                <ReferenceLine 
                  y={scoreType === 'normalized' ? 60 : data.exam.totalScore * 0.6} 
                  stroke={themeStyles.warningColor} 
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: "及格线", position: "right" }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card> ); })()
      )}

      {/* 历史趋势对比 */}
      {trendData.length > 0 && (
        (() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
        <Card 
          title={
            <Space>
              <LineChartOutlined />
              <span>成绩趋势分析</span>
            </Space>
          }
          style={{ ...preset.style, marginBottom: 'var(--space-6)' }} styles={preset.styles}
          extra={
            <Space>
              <Text type="secondary">历史考试数量：</Text>
              <Select
                value={historyLimit}
                onChange={setHistoryLimit}
                size="small"
                style={{ width: 80 }}
              >
                <Select.Option value={3}>3次</Select.Option>
                <Select.Option value={5}>5次</Select.Option>
                <Select.Option value={10}>10次</Select.Option>
                <Select.Option value={20}>20次</Select.Option>
              </Select>
            </Space>
          }
        >
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.textSecondary} opacity={0.3} />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12, fill: themeStyles.textSecondary }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: themeStyles.textSecondary }}
                  label={{ value: '归一化分数', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: themeStyles.textSecondary } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: themeStyles.cardBackground,
                    border: `1px solid ${themeStyles.primaryColor}`,
                    borderRadius: '4px',
                    color: themeStyles.textPrimary
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="normalizedAverageScore" 
                  stroke={themeStyles.primaryColor} 
                  strokeWidth={3}
                  dot={{ fill: themeStyles.primaryColor, strokeWidth: 2, r: 4 }}
                  name="平均分"
                />
                <Line 
                  type="monotone" 
                  dataKey="excellentLine" 
                  stroke={themeStyles.successColor} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: themeStyles.successColor, strokeWidth: 2, r: 3 }}
                  name="优秀线"
                />
                <Line 
                  type="monotone" 
                  dataKey="excellentRate" 
                  stroke={themeStyles.warningColor} 
                  strokeWidth={2}
                  dot={{ fill: themeStyles.warningColor, strokeWidth: 2, r: 3 }}
                  name="优秀率(%)"
                  yAxisId="right"
                />
                {/* 添加右侧Y轴用于优秀率 */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: themeStyles.textSecondary }}
                  label={{ value: '优秀率(%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: themeStyles.textSecondary } }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card> ); })()
      )}

      {/* 标签分析 */}
      {data.tags && data.tags.length > 0 && (
        (() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
        <Card 
          title={
            <Space>
              <TagOutlined />
              <span>评价标签分析</span>
            </Space>
          }
          style={{ ...preset.style, marginBottom: 'var(--space-6)' }} styles={preset.styles}
        >
          <Row gutter={[16, 16]}>
            {data.tags.map((tag: any) => (
              <Col xs={12} sm={8} md={6} lg={4} key={tag.id}>
                <Card size="small" hoverable>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      <Tag color={tag.color}>{tag.category}</Tag>
                      <Text strong>{tag.name}</Text>
                    </Space>
                    <Space>
                      <Text type="secondary">{tag.count}人</Text>
                      <Text style={{ color: themeStyles.primaryColor }}>
                        {tag.averageScore.toFixed(1)}分
                      </Text>
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card> ); })()
      )}

      {/* 学生详细排名 */}
      {data.students && (
        (() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
        <Card 
          title={
            <Space>
              <TrophyOutlined />
              <span>学生排名详情</span>
            </Space>
          }
          style={{ ...preset.style }} styles={preset.styles}
        >
          <Table
            columns={studentColumns}
            dataSource={data.students}
            rowKey="id"
            pagination={{
              total: data.students.length,
              pageSize: isMobile ? 10 : 20,
              showSizeChanger: !isMobile,
              showQuickJumper: !isMobile,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
            scroll={{ x: 600 }}
            size={isMobile ? 'small' : 'middle'}
          />
        </Card> ); })()
      )}
    </div>
  );
};

export default ExamSubjectDetailPage;