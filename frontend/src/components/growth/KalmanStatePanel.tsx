import React, { useMemo } from 'react';
import { Row, Col, Progress, Statistic, Tooltip, Tag, Space, Card } from 'antd';
import { InfoCircleOutlined, SettingOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import { getLevelColor, getTrendColor } from '@/config/growthColorConfig';
import { useResponsive } from '@/hooks/useResponsive';
// Define the expected interface for growth state data
interface GrowthState {
  tagId: number;
  tagName: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  level: number;
  trend: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  confidence: number;
  totalObservations: number;
  lastUpdatedAt: string;
}
import { growthUtils } from '../../utils/growthUtils';

interface KalmanStatePanelProps {
  states: GrowthState[];
  showDetails?: boolean;
}

const KalmanStatePanel: React.FC<KalmanStatePanelProps> = ({
  states,
  showDetails = true
}) => {
  const { isMobile } = useResponsive();
  if (!states || states.length === 0) {
    return (
      <Card title="卡尔曼滤波器状态" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ textAlign: 'center', color: 'var(--ant-color-text-tertiary)', padding: 'var(--space-5)' }}>
          暂无成长数据
        </div>
      </Card>
    );
  }

  // 动态计算卡片列数，根据标签数量和屏幕空间优化布局
  const getOptimalColumnSpan = useMemo(() => {
    const stateCount = states.length;
    
    // 根据标签数量动态调整列数
    if (stateCount <= 2) {
      return 24; // 1列，每个卡片占满宽度
    } else if (stateCount <= 4) {
      return 12; // 2列
    } else if (stateCount <= 6) {
      return 8;  // 3列
    } else if (stateCount <= 9) {
      return 6;  // 4列
    } else {
      return 4;  // 6列，适合大量标签
    }
  }, [states.length]);

  // 响应式列配置
  const getResponsiveColProps = useMemo(() => {
    const stateCount = states.length;
    if (stateCount <= 2) {
      return { xs: 12, sm: 12, md: 12, lg: 12 };
    } else if (stateCount <= 4) {
      return { xs: 12, sm: 12, md: 8, lg: 8 };
    } else if (stateCount <= 9) {
      return { xs: 12, sm: 12, md: 8, lg: 6 };
    } else {
      return { xs: 12, sm: 12, md: 6, lg: 4 };
    }
  }, [states.length]);

  // 计算整体统计
  const totalObservations = states.reduce((sum, s) => sum + s.totalObservations, 0);
  const avgConfidence = states.reduce((sum, s) => sum + s.confidence, 0) / states.length;
  const overallTrend = growthUtils.calculateOverallTrend(states);
  const growthScore = growthUtils.calculateGrowthScore(states);

  // 获取最活跃的标签
  const mostActiveTag = states.reduce((prev, current) => 
    prev.totalObservations > current.totalObservations ? prev : current
  );

  // 获取趋势最强的标签
  const strongestTrendTag = states.reduce((prev, current) => 
    Math.abs(prev.trend) > Math.abs(current.trend) ? prev : current
  );

  const getTrendIcon = (trend: number) => {
    const direction = growthUtils.getTrendDirection(trend);
    switch (direction) {
      case 'UP':
        return <ArrowUpOutlined style={{ color: 'var(--ant-color-success)' }} />;
      case 'DOWN':
        return <ArrowDownOutlined style={{ color: 'var(--ant-color-error)' }} />;
      case 'STABLE':
        return <MinusOutlined style={{ color: 'var(--ant-color-warning)' }} />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'var(--ant-color-success)';
    if (confidence >= 0.6) return 'var(--ant-color-warning)';
    if (confidence >= 0.3) return '#ff7a45';
    return 'var(--ant-color-error)';
  };

  return (
    <Card 
      title={
        <div>
          <div>个人成长分析</div>
          <div style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.7 }}>
            卡尔曼算法 · 智能预测
          </div>
        </div>
      }
    >
      {/* 整体概览 */}
      <Row gutter={16} style={{ marginBottom: 'var(--space-6)' }}>
        <Col span={6}>
          <Statistic
            title={
              <Space>
                成长分数
                {!isMobile && (
                  <Tooltip title="基于所有标签的加权平均计算">
                    <InfoCircleOutlined />
                  </Tooltip>
                )}
              </Space>
            }
            value={growthScore}
            precision={2}
            valueStyle={{ 
              color: growthUtils.getColorByTrend(growthUtils.getTrendDirection(growthScore)),
              fontWeight: 700
            }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="整体趋势"
            value={overallTrend === 'IMPROVING' ? '改善' : overallTrend === 'DECLINING' ? '下降' : '稳定'}
            prefix={getTrendIcon(growthScore)}
            valueStyle={{ 
              color: overallTrend === 'IMPROVING' ? 'var(--ant-color-success)' : 
                     overallTrend === 'DECLINING' ? 'var(--ant-color-error)' : 'var(--ant-color-warning)'
            }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="总观测次数"
            value={totalObservations}
            suffix="次"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="平均置信度"
            value={Math.round(avgConfidence * 100)}
            suffix="%"
            valueStyle={{ color: getConfidenceColor(avgConfidence) }}
          />
        </Col>
      </Row>

      {showDetails && (
        <>
          {/* 关键标签信息 */}
          <Row gutter={16} style={{ marginBottom: 'var(--space-6)' }}>
            <Col span={12}>
              <Card size="small" title="最活跃标签">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Tag color={mostActiveTag.sentiment === 'POSITIVE' ? 'green' : 'red'}>
                    {mostActiveTag.tagName}
                  </Tag>
                  <div>观测 {mostActiveTag.totalObservations} 次</div>
                  <Statistic 
                    value={growthUtils.formatGrowthScore(mostActiveTag.level, 1)}
                    title="当前水平"
                  />
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="趋势最强标签">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Tag color={strongestTrendTag.sentiment === 'POSITIVE' ? 'green' : 'red'}>
                    {strongestTrendTag.tagName}
                  </Tag>
                  <div>{getTrendIcon(strongestTrendTag.trend)} 趋势变化</div>
                  <Statistic 
                    value={`${strongestTrendTag.trend > 0 ? '+' : ''}${growthUtils.formatGrowthScore(strongestTrendTag.trend, 2)}`}
                    title="趋势速度"
                    valueStyle={{
                      color: growthUtils.getColorByTrend(growthUtils.getTrendDirection(strongestTrendTag.trend))
                    }}
                  />
                </Space>
              </Card>
            </Col>
          </Row>

          {/* 详细状态列表 */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>各标签详细状态 ({states.length} 个标签)</h4>
            <Row gutter={[16, 16]}>
              {states.map((state) => (
                <Col {...getResponsiveColProps} key={state.tagId}>
                  <Card size="small" hoverable style={{ height: '100%' }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <div>
                        <Tag color={state.sentiment === 'POSITIVE' ? 'green' : 'red'}>
                          {state.tagName}
                        </Tag>
                        <div style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{growthUtils.formatTimeAgo(state.lastUpdatedAt)}</span>
                          <span>观测 {state.totalObservations} 次</span>
                        </div>
                      </div>

                      <div>
                        {isMobile ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              水平: <strong style={{ color: getLevelColor(state.level) }}>{growthUtils.formatGrowthScore(state.level, 1)}</strong>
                            </div>
                            <div>
                              趋势: {getTrendIcon(state.trend)}
                              <span style={{ 
                                color: getTrendColor(state.trend, state.sentiment),
                                fontWeight: 'bold',
                                marginLeft: 4
                              }}>
                                {growthUtils.formatGrowthScore(state.trend, 2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: '4px' }}>
                              水平: <strong style={{ color: getLevelColor(state.level) }}>{growthUtils.formatGrowthScore(state.level, 1)}</strong>
                            </div>
                            <div>
                              趋势: {getTrendIcon(state.trend)} 
                              <span style={{ 
                                color: getTrendColor(state.trend, state.sentiment),
                                fontWeight: 'bold'
                              }}>
                                {growthUtils.formatGrowthScore(state.trend, 2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {isMobile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: '12px' }}>{growthUtils.formatConfidence(state.confidence)}</span>
                          <Progress 
                            percent={Math.round(state.confidence * 100)} 
                            size="small"
                            strokeColor={getConfidenceColor(state.confidence)}
                            showInfo={false}
                            style={{ width: 90 }}
                          />
                        </div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: '4px' }}>
                            {growthUtils.formatConfidence(state.confidence)}
                          </div>
                          <Progress 
                            percent={Math.round(state.confidence * 100)} 
                            size="small"
                            strokeColor={getConfidenceColor(state.confidence)}
                            showInfo={false}
                          />
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </>
      )}
    </Card>
  );
};

export default KalmanStatePanel;