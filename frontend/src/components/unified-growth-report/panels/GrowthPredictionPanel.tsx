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
  Alert,
  Empty,
  Divider
} from 'antd';
import {
  RocketOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SettingOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import type { GrowthPredictionPanelProps } from '@/types/unifiedGrowthReport';
import { useResponsive } from '@/hooks/useResponsive';

const { Title, Text } = Typography;

/**
 * 成长预测面板组件
 * 从原StudentGrowthReportPage中的专业预测功能迁移而来
 */
const GrowthPredictionPanel: React.FC<GrowthPredictionPanelProps> = ({
  data,
  config,
  loading = false,
  className,
  style
}) => {
  const { isMobile } = useResponsive();

  // 计算预测统计
  const predictionStats = useMemo(() => {
    if (!data?.states) {
      return {
        totalDimensions: 0,
        highConfidenceCount: 0,
        improvingTrends: 0,
        averageConfidence: 0,
        predictedGrowthRate: 0,
        modelReliability: 0
      };
    }

    const states = data.states;
    const totalDimensions = states.length;
    const highConfidenceCount = states.filter(s => s.confidence > 0.7).length;
    const improvingTrends = states.filter(s => s.trend > 0).length;
    const averageConfidence = states.reduce((sum, s) => sum + s.confidence, 0) / totalDimensions;
    
    // 预测成长率（基于当前趋势和置信度）
    const weightedTrends = states.map(s => s.trend * s.confidence);
    const predictedGrowthRate = weightedTrends.reduce((sum, t) => sum + t, 0) / totalDimensions;
    
    // 模型可靠性（基于观测次数和置信度）
    const avgObservations = states.reduce((sum, s) => sum + s.totalObservations, 0) / totalDimensions;
    const modelReliability = Math.min(1, (avgObservations / 10) * averageConfidence);

    return {
      totalDimensions,
      highConfidenceCount,
      improvingTrends,
      averageConfidence,
      predictedGrowthRate,
      modelReliability
    };
  }, [data?.states]);

  // 获取趋势预测
  const getTrendPrediction = (growthRate: number) => {
    if (growthRate > 0.1) {
      return {
        trend: 'STRONG_GROWTH',
        icon: <RiseOutlined style={{ color: '#52c41a' }} />,
        color: '#52c41a',
        text: '强劲增长',
        description: '预计未来表现将显著提升'
      };
    } else if (growthRate > 0) {
      return {
        trend: 'MODERATE_GROWTH',
        icon: <RiseOutlined style={{ color: '#73d13d' }} />,
        color: '#73d13d',
        text: '稳步增长',
        description: '预计未来表现将持续改善'
      };
    } else if (growthRate > -0.1) {
      return {
        trend: 'STABLE',
        icon: <ThunderboltOutlined style={{ color: '#1890ff' }} />,
        color: '#1890ff',
        text: '趋势稳定',
        description: '预计未来表现保持现有水平'
      };
    } else {
      return {
        trend: 'NEEDS_ATTENTION',
        icon: <FallOutlined style={{ color: '#ff4d4f' }} />,
        color: '#ff4d4f',
        text: '需要关注',
        description: '建议加强相关方面的指导'
      };
    }
  };

  // 卡尔曼滤波器状态分析
  const kalmanAnalysis = useMemo(() => {
    if (!data?.states) return [];

    return data.states
      .map(state => ({
        tagName: state.tagName,
        level: state.level,
        trend: state.trend,
        confidence: state.confidence,
        observations: state.totalObservations,
        trendDirection: state.trendDirection,
        sentiment: state.sentiment
      }))
      .sort((a, b) => b.confidence - a.confidence); // 按置信度排序
  }, [data?.states]);

  if (loading) {
    return (
      <Card 
        className={className} 
        style={style}
        title="成长预测分析"
        loading={true}
      >
        <div style={{ height: '400px' }} />
      </Card>
    );
  }

  if (!data || !data.states || data.states.length === 0) {
    return (
      <Card 
        className={className} 
        style={style}
        title={
          <Space>
            <RocketOutlined />
            <span>成长预测分析</span>
          </Space>
        }
      >
        <Empty 
          description="暂无足够数据进行预测分析"
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  const prediction = getTrendPrediction(predictionStats.predictedGrowthRate);

  return (
    <Card 
      className={className} 
      style={style}
      title={
        <Space>
          <RocketOutlined />
          <span>成长预测分析</span>
          <Tag color="blue">卡尔曼滤波</Tag>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 预测概况 */}
        <Card 
          size="small" 
          style={{ 
            background: `linear-gradient(90deg, ${prediction.color}15 0%, ${prediction.color}05 100%)`,
            border: `1px solid ${prediction.color}30`
          }}
        >
          <Row align="middle">
            <Col flex="auto">
              <Space>
                <div style={{ 
                  fontSize: '24px', 
                  color: prediction.color,
                  background: `${prediction.color}20`,
                  padding: '8px',
                  borderRadius: '8px'
                }}>
                  {prediction.icon}
                </div>
                <div>
                  <Title level={4} style={{ margin: 0, color: prediction.color }}>
                    {prediction.text}
                  </Title>
                  <Text type="secondary">{prediction.description}</Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" align="end">
                <Text type="secondary" style={{ fontSize: '12px' }}>预测增长率</Text>
                <Text style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: prediction.color 
                }}>
                  {(predictionStats.predictedGrowthRate * 100).toFixed(1)}%
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 模型指标 */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="分析维度"
              value={predictionStats.totalDimensions}
              prefix={<TrophyOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="模型置信度"
              value={predictionStats.averageConfidence * 100}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: predictionStats.averageConfidence > 0.7 ? '#3f8600' : '#faad14' 
              }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="高置信预测"
              value={predictionStats.highConfidenceCount}
              suffix={` / ${predictionStats.totalDimensions}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<EyeOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="进步趋势"
              value={predictionStats.improvingTrends}
              suffix={` / ${predictionStats.totalDimensions}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
            />
          </Col>
        </Row>

        {/* 进度指标 */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>模型可靠性</Text>
                <Progress 
                  percent={predictionStats.modelReliability * 100}
                  strokeColor={predictionStats.modelReliability > 0.7 ? "#52c41a" : "#faad14"}
                  format={() => `${(predictionStats.modelReliability * 100).toFixed(1)}%`}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  基于观测数量和置信度计算
                </Text>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>预测准确性</Text>
                <Progress 
                  percent={predictionStats.averageConfidence * 100}
                  strokeColor="#1890ff"
                  format={() => `${(predictionStats.averageConfidence * 100).toFixed(1)}%`}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  基于卡尔曼滤波器置信度
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* 详细预测分析 */}
        <div>
          <Title level={5} style={{ marginBottom: '16px' }}>
            维度详细预测
          </Title>
          <Row gutter={[16, 8]}>
            {kalmanAnalysis.slice(0, 6).map((item, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card size="small" style={{ marginBottom: '8px' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '12px' }}>{item.tagName}</Text>
                                             <Tag 
                         color={item.sentiment === 'POSITIVE' ? 'green' : 'red'}
                         style={{ fontSize: '10px' }}
                       >
                         {item.sentiment === 'POSITIVE' ? '正面' : '负面'}
                       </Tag>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>当前水平</Text>
                      <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>
                        {item.level.toFixed(1)}
                      </Text>
                    </div>
                    
                    <Progress
                      percent={item.confidence * 100}
                      size="small"
                      strokeColor={item.trend > 0 ? '#52c41a' : item.trend < 0 ? '#ff4d4f' : '#1890ff'}
                      format={() => `${(item.confidence * 100).toFixed(0)}%`}
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '10px' }}>
                        观测: {item.observations}次
                      </Text>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {item.trend > 0 ? (
                          <RiseOutlined style={{ color: '#52c41a', fontSize: '10px' }} />
                        ) : item.trend < 0 ? (
                          <FallOutlined style={{ color: '#ff4d4f', fontSize: '10px' }} />
                        ) : (
                          <ThunderboltOutlined style={{ color: '#1890ff', fontSize: '10px' }} />
                        )}
                        <Text style={{ 
                          fontSize: '10px', 
                          marginInlineStart: '2px',
                          color: item.trend > 0 ? '#52c41a' : item.trend < 0 ? '#ff4d4f' : '#1890ff'
                        }}>
                          {item.trendDirection || '稳定'}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* 配置信息 */}
        {config && (
          <Alert
            message={
              <Space>
                <SettingOutlined />
                <span>卡尔曼滤波器配置</span>
              </Space>
            }
            description={
              <div style={{ fontSize: '12px' }}>
                过程噪声: {config.processNoise}, 
                初始不确定性: {config.initialUncertainty}, 
                时间衰减: {config.timeDecayFactor}
                {config.name && ` (${config.name})`}
              </div>
            }
            type="info"
            showIcon={false}
            style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}
          />
        )}
      </Space>
    </Card>
  );
};

export default GrowthPredictionPanel; 