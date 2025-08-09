import React, { useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Space,
  Tag,
  Divider,
  Empty
} from 'antd';
import {
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { GrowthOverviewProps } from '@/types/unifiedGrowthReport';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';

const { Title, Text } = Typography;

/**
 * 统一的成长概况组件
 * 支持compact、detailed、professional三种视图模式
 */
const GrowthOverview: React.FC<GrowthOverviewProps> = ({
  data,
  viewMode = 'detailed',
  loading = false,
  className,
  style
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

  // 计算概况统计
  const overviewStats = useMemo(() => {
    if (!data?.states) {
      return {
        totalTags: 0,
        positiveTags: 0,
        negativeTags: 0,
        averageLevel: 0,
        averageConfidence: 0,
        improvingTags: 0,
        decliningTags: 0
      };
    }

    const states = data.states;
    const totalTags = states.length;
    const positiveTags = states.filter(s => s.sentiment === 'POSITIVE').length;
    const negativeTags = states.filter(s => s.sentiment === 'NEGATIVE').length;
    const averageLevel = states.reduce((sum, s) => sum + s.level, 0) / totalTags;
    const averageConfidence = states.reduce((sum, s) => sum + s.confidence, 0) / totalTags;
    const improvingTags = states.filter(s => s.trend > 0).length;
    const decliningTags = states.filter(s => s.trend < 0).length;

    return {
      totalTags,
      positiveTags,
      negativeTags,
      averageLevel,
      averageConfidence,
      improvingTags,
      decliningTags
    };
  }, [data?.states]);

  // 获取趋势颜色和图标
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return { 
          color: '#52c41a', 
          icon: <RiseOutlined />, 
          text: '持续进步' 
        };
      case 'DECLINING':
        return { 
          color: '#ff4d4f', 
          icon: <FallOutlined />, 
          text: '需要关注' 
        };
      default:
        return { 
          color: '#1890ff', 
          icon: <MinusOutlined />, 
          text: '保持稳定' 
        };
    }
  };

  if (loading) {
    return (
      <Card className={className} style={style} loading={true}>
        <div style={{ height: '200px' }} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className} style={style}>
        <Empty 
          description="暂无成长数据"
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  const trendDisplay = getTrendDisplay(data.overallTrend);

  // 紧凑模式 - 类似EnhancedStudentGrowthReport
  if (viewMode === 'compact') {
    return (
      <Card 
        className={className} 
        style={style}
        bodyStyle={{ padding: isMobile ? '16px' : '20px' }}
      >
        <Row gutter={[16, 16]}>
          {/* 核心指标卡片 */}
          <Col span={24}>
            <Card
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px'
              }}
              bodyStyle={{ padding: '20px', textAlign: 'center' }}
            >
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {overviewStats.averageLevel.toFixed(1)}
                </div>
                <div style={{ fontSize: '16px', marginBottom: '12px' }}>
                  {trendDisplay.icon}
                  <span style={{ marginLeft: '8px' }}>
                    {trendDisplay.text}
                  </span>
                </div>
                <Progress 
                  percent={overviewStats.averageConfidence * 100} 
                  showInfo={false} 
                  strokeColor="rgba(255, 255, 255, 0.8)"
                  trailColor="rgba(255, 255, 255, 0.2)"
                />
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                  置信度: {(overviewStats.averageConfidence * 100).toFixed(1)}%
                </Text>
              </div>
            </Card>
          </Col>

          {/* 简化统计 */}
          <Col span={12}>
            <Statistic
              title="成长标签"
              value={overviewStats.totalTags}
              prefix={<TrophyOutlined />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="进步项目"
              value={overviewStats.improvingTags}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
            />
          </Col>
        </Row>
      </Card>
    );
  }

  // 专业模式 - 类似StudentGrowthReportPage
  if (viewMode === 'professional') {
    return (
      <Card 
        className={className} 
        style={style}
        title={
          <Space>
            <ThunderboltOutlined />
            <span>成长分析概况</span>
          </Space>
        }
      >
        <Row gutter={[24, 24]}>
          {/* 总体趋势 */}
          <Col span={24}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="middle">
                <div style={{ fontSize: '24px', color: trendDisplay.color }}>
                  {trendDisplay.icon}
                </div>
                <Title level={4} style={{ margin: 0, color: trendDisplay.color }}>
                  {trendDisplay.text}
                </Title>
                <Text type="secondary">
                  基于 {overviewStats.totalTags} 个成长维度的综合分析
                </Text>
              </Space>
            </Card>
          </Col>

          {/* 专业统计指标 */}
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="平均水平"
              value={overviewStats.averageLevel}
              precision={2}
              prefix={<TrophyOutlined />}
              suffix="/ 10"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="模型置信度"
              value={overviewStats.averageConfidence * 100}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: overviewStats.averageConfidence > 0.7 ? '#3f8600' : '#cf1322' 
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="进步趋势"
              value={overviewStats.improvingTags}
              suffix={`/ ${overviewStats.totalTags}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="关注项目"
              value={overviewStats.decliningTags}
              suffix={`/ ${overviewStats.totalTags}`}
              valueStyle={{ color: '#cf1322' }}
              prefix={<FallOutlined />}
            />
          </Col>
        </Row>
      </Card>
    );
  }

  // 详细模式 - 类似StudentGrowthReport（默认）
  return (
    <Card 
      className={className} 
      style={style}
      title={
        <Space>
          <FireOutlined />
          <span>成长概况</span>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        {/* 总体趋势展示 */}
        <Col span={24}>
          <Card 
            size="small" 
            style={{ 
              background: `linear-gradient(90deg, ${trendDisplay.color}15 0%, ${trendDisplay.color}05 100%)`,
              border: `1px solid ${trendDisplay.color}30`
            }}
          >
            <Row align="middle">
              <Col flex="auto">
                <Space>
                  <div style={{ 
                    fontSize: '24px', 
                    color: trendDisplay.color,
                    background: `${trendDisplay.color}20`,
                    padding: '8px',
                    borderRadius: '8px'
                  }}>
                    {trendDisplay.icon}
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {trendDisplay.text}
                    </Title>
                    <Text type="secondary">
                      整体成长水平: {overviewStats.averageLevel.toFixed(1)}/10
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col>
                <Tag color={trendDisplay.color.replace('#', '')} style={{ margin: 0 }}>
                  {data.overallTrend}
                </Tag>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 详细统计指标 */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="成长维度"
              value={overviewStats.totalTags}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="正面表现"
              value={overviewStats.positiveTags}
              valueStyle={{ color: '#3f8600' }}
              suffix={`/ ${overviewStats.totalTags}`}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="进步项目"
              value={overviewStats.improvingTags}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="平均置信度"
              value={overviewStats.averageConfidence * 100}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: overviewStats.averageConfidence > 0.7 ? '#3f8600' : '#faad14' 
              }}
            />
          </Card>
        </Col>

        {/* 最后活动时间 */}
        {data.lastActivityDate && (
          <Col span={24}>
            <Divider />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              最后更新: {new Date(data.lastActivityDate).toLocaleString()}
            </Text>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export default GrowthOverview; 