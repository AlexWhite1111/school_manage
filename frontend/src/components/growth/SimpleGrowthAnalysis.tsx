import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Row, Col, Statistic, Progress, List, Tag, Typography, Space, message, Empty, Badge, Tooltip, Card } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  BarChartOutlined,
  LineChartOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';


import { GrowthApi } from '@/api/growthApi';
import type { GrowthSummary } from '@/api/growthApi';

const { Title, Text } = Typography;

// ================================
// 组件接口定义
// ================================

interface SimpleGrowthAnalysisProps {
  studentPublicId: string;
}

// ================================
// 主组件
// ================================

const SimpleGrowthAnalysis: React.FC<SimpleGrowthAnalysisProps> = ({ 
  studentPublicId 
}) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取成长概况数据
  const fetchGrowthSummary = async () => {
    if (!studentPublicId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await GrowthApi.getStudentGrowthSummaryByPublicId(studentPublicId);
      setSummary(data);
    } catch (error) {
      console.error('获取成长概况失败:', error);
      setError('获取成长分析数据失败');
      message.error('获取成长分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthSummary();
  }, [studentPublicId]);

  // 获取趋势图标
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'UP':
      case 'IMPROVING':
        return <RiseOutlined style={{ color: 'var(--ant-color-success)' }} />;
      case 'DOWN':
      case 'DECLINING':
        return <FallOutlined style={{ color: 'var(--ant-color-error)' }} />;
      default:
        return <MinusOutlined style={{ color: 'var(--ant-color-warning)' }} />;
    }
  };

  // 获取趋势标签
  const getTrendTag = (direction: string) => {
    switch (direction) {
      case 'UP':
      case 'IMPROVING':
        return <Tag color="green">↗️ 上升</Tag>;
      case 'DOWN':
      case 'DECLINING':
        return <Tag color="red">↘️ 下降</Tag>;
      default:
        return <Tag color="blue">→ 稳定</Tag>;
    }
  };

  // 获取进度条状态
  const getProgressStatus = (direction: string) => {
    switch (direction) {
      case 'UP':
      case 'IMPROVING':
        return 'success';
      case 'DOWN':
      case 'DECLINING':
        return 'exception';
      default:
        return 'normal';
    }
  };

  if (loading) {
    return (
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            <Title level={4} style={{ margin: 0 }}>成长分析</Title>
          </Space>
        }
        style={{ marginBottom: 'var(--space-6)' }}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">正在加载成长分析数据...</Text>
        </div>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            <Title level={4} style={{ margin: 0 }}>成长分析</Title>
          </Space>
        }
        extra={
          <AppButton 
            icon={<ReloadOutlined />} 
            onClick={fetchGrowthSummary}
            size="small"
          >
            重试
          </AppButton>
        }
        style={{ marginBottom: 'var(--space-6)' }}
      >
        <Empty 
          description={error || "暂无成长分析数据"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const positiveStates = summary.states.filter(s => s.sentiment === 'POSITIVE');
  const negativeStates = summary.states.filter(s => s.sentiment === 'NEGATIVE');
  const avgConfidence = summary.states.length > 0 
    ? summary.states.reduce((sum, s) => sum + s.confidence, 0) / summary.states.length 
    : 0;

  return (
    <div>
      {/* 成长概览统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-6)' }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="成长状态总数"
              value={summary.states.length}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: 'var(--ant-color-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="正面表现"
              value={positiveStates.length}
              prefix={<RiseOutlined />}
              valueStyle={{ color: 'var(--ant-color-success)' }}
              suffix="项"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="需要关注"
              value={negativeStates.length}
              prefix={<FallOutlined />}
              valueStyle={{ color: 'var(--ant-color-error)' }}
              suffix="项"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="平均置信度"
              value={Math.round(avgConfidence * 100)}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: avgConfidence >= 0.7 ? 'var(--ant-color-success)' : 
                       avgConfidence >= 0.5 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)' 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 整体趋势展示 */}
      <Card 
        title={
          <Space>
            <LineChartOutlined />
            <Title level={5} style={{ margin: 0 }}>整体成长趋势</Title>
          </Space>
        }
        style={{ marginBottom: 'var(--space-6)' }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Space direction="vertical" size="large">
            <div>
              <Badge 
                status={summary.overallTrend === 'IMPROVING' ? 'success' : 
                       summary.overallTrend === 'DECLINING' ? 'error' : 'warning'} 
                text={
                  <Text style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: summary.overallTrend === 'IMPROVING' ? 'var(--ant-color-success)' : 
                           summary.overallTrend === 'DECLINING' ? 'var(--ant-color-error)' : 'var(--ant-color-warning)'
                  }}>
                    {summary.overallTrend === 'IMPROVING' ? '🚀 持续进步' : 
                     summary.overallTrend === 'DECLINING' ? '⚠️ 需要关注' : '📊 保持稳定'}
                  </Text>
                }
              />
            </div>
            {summary.lastActivityDate && (
              <Text type="secondary">
                最后活动时间: {dayjs(summary.lastActivityDate).format('YYYY-MM-DD HH:mm')}
              </Text>
            )}
          </Space>
        </div>
      </Card>

      {/* 详细标签表现 */}
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            <Title level={5} style={{ margin: 0 }}>标签表现详情</Title>
          </Space>
        }
        style={{ marginBottom: 'var(--space-6)' }}
      >
        {summary.states.length === 0 ? (
          <Empty description="暂无成长数据" />
        ) : (
          <List
            dataSource={summary.states}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Badge 
                      status={item.sentiment === 'POSITIVE' ? 'success' : 'error'} 
                    />
                  }
                  title={
                    <Space>
                      <Text strong>{item.tagName}</Text>
                      {getTrendTag(item.trendDirection)}
                    </Space>
                  }
                  description={
                    <Space wrap>
                      <Text type="secondary">当前水平: {item.level.toFixed(2)}</Text>
                      <Text type="secondary">观测次数: {item.totalObservations}</Text>
                      <Text type="secondary">置信度: {Math.round(item.confidence * 100)}%</Text>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        更新: {dayjs(item.lastUpdatedAt).format('MM-DD HH:mm')}
                      </Text>
                    </Space>
                  }
                />
                <div style={{ minWidth: '120px' }}>
                  <Progress 
                    percent={Math.min(Math.max(item.level * 10, 0), 100)} 
                    size="small"
                    status={getProgressStatus(item.trendDirection) as any}
                    showInfo={false}
                  />
                  <Text style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)' }}>
                    水平指数: {Math.round(item.level * 10)}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 成长建议 */}
      {summary.states.length > 0 && (
        <Card 
          title={
            <Space>
              <TrophyOutlined />
              <Title level={5} style={{ margin: 0 }}>成长建议</Title>
            </Space>
          }
        >
          <List size="small">
            {positiveStates.length > 0 && (
              <List.Item>
                <Space>
                  <RiseOutlined style={{ color: 'var(--ant-color-success)' }} />
                  <Text>
                    <Text strong>优势领域:</Text> 在 {positiveStates.map(s => s.tagName).join('、')} 方面表现良好，继续保持！
                  </Text>
                </Space>
              </List.Item>
            )}
            {negativeStates.length > 0 && (
              <List.Item>
                <Space>
                  <FallOutlined style={{ color: 'var(--ant-color-error)' }} />
                  <Text>
                    <Text strong>改进建议:</Text> 在 {negativeStates.map(s => s.tagName).join('、')} 方面需要更多关注和改进。
                  </Text>
                </Space>
              </List.Item>
            )}
            <List.Item>
              <Space>
                <TrophyOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <Text>
                  <Text strong>数据质量:</Text> 当前平均置信度为 {Math.round(avgConfidence * 100)}%，
                  {avgConfidence >= 0.7 ? '数据质量良好' : '建议增加更多观测记录以提高准确性'}。
                </Text>
              </Space>
            </List.Item>
          </List>
        </Card>
      )}
    </div>
  );
};

export default SimpleGrowthAnalysis; 