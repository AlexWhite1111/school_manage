
import AppButton from '@/components/AppButton';
import React from 'react';
import { Row, Col, Statistic, Progress, Typography, Space, Tag, Badge, Tooltip, Empty, Divider, Card } from 'antd';
import {
  FireOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { GrowthSummary } from '@/api/growthApi';
import { getLevelColor, getTrendColor } from '@/config/growthColorConfig';
import { useResponsive } from '@/hooks/useResponsive';

const { Text } = Typography;

interface KalmanStatePanelProps {
  states: GrowthSummary['states'];
  onConfigClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

// 卡尔曼状态面板
const KalmanStatePanel: React.FC<KalmanStatePanelProps> = ({ 
  states, 
  onConfigClick,
  style,
  className
}) => {
  const { isMobile } = useResponsive();
  if (!states || states.length === 0) {
    return (
      <Card 
        title="卡尔曼滤波器状态" 
        extra={
          onConfigClick && (
            <AppButton icon={<SettingOutlined />} onClick={onConfigClick}>
              参数配置
            </AppButton>
          )
        }
        style={style}
        className={className}
      >
        <Empty description="暂无成长状态数据" />
      </Card>
    );
  }

  // 计算平均状态
  const avgLevel = states.reduce((sum, s) => sum + s.level, 0) / states.length;
  const avgTrend = states.reduce((sum, s) => sum + s.trend, 0) / states.length;
  const avgConfidence = states.reduce((sum, s) => sum + s.confidence, 0) / states.length;

  return (
    <Card 
      title="卡尔曼滤波器状态" 
      extra={
        onConfigClick && (
          <AppButton icon={<SettingOutlined />} onClick={onConfigClick}>
            参数配置
          </AppButton>
        )
      }
      style={style}
      className={className}
    >
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="当前水平"
            value={avgLevel}
            precision={2}
            prefix={<FireOutlined />}
            valueStyle={{ color: getLevelColor(avgLevel) }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="趋势速度"
            value={avgTrend}
            precision={3}
            prefix={avgTrend > 0 ? <RiseOutlined /> : <FallOutlined />}
            valueStyle={{ color: getTrendColor(avgTrend, 'POSITIVE') }}
          />
        </Col>
        <Col span={8}>
          <div>
            <div style={{ marginBottom: '8px', color: 'rgba(0, 0, 0, 0.45)', fontSize: '14px' }}>
              <ThunderboltOutlined /> 置信度
            </div>
            <Progress 
              percent={avgConfidence * 100} 
              status={avgConfidence > 0.7 ? 'success' : avgConfidence > 0.4 ? 'normal' : 'exception'}
              format={(percent) => `${percent?.toFixed(1)}%`}
            />
          </div>
        </Col>
      </Row>
      
      <Divider />
      
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {states.map((state) => (
          <div key={state.tagId} style={{ marginBottom: '12px', padding: '8px', background: 'var(--ant-color-bg-layout)', borderRadius: '4px' }}>
            <Row justify="space-between" align="middle" gutter={8}>
              <Col>
                <Tag color={state.sentiment === 'POSITIVE' ? 'green' : 'red'}>
                  {state.tagName}
                </Tag>
              </Col>
              <Col flex="auto">
                {isMobile ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text>
                      水平: <span style={{ color: getLevelColor(state.level), fontWeight: 600 }}>{state.level.toFixed(1)}</span>
                    </Text>
                    <Text>
                      趋势: <span style={{ color: getTrendColor(state.trend, state.sentiment), fontWeight: 600 }}>{state.trend.toFixed(2)}</span>
                    </Text>
                  </div>
                ) : (
                  <Space size="large">
                    <Tooltip title="水平值">
                      <Text>
                        水平: <span style={{ color: getLevelColor(state.level), fontWeight: 600 }}>{state.level.toFixed(2)}</span>
                      </Text>
                    </Tooltip>
                    <Tooltip title="趋势值">
                      <Text>
                        趋势: <span style={{ color: getTrendColor(state.trend, state.sentiment), fontWeight: 600 }}>{state.trend.toFixed(3)}</span>
                      </Text>
                    </Tooltip>
                    <Tooltip title="观测次数">
                      <Badge count={state.totalObservations} style={{ backgroundColor: 'var(--ant-color-success)' }} />
                    </Tooltip>
                  </Space>
                )}
              </Col>
            </Row>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default KalmanStatePanel; 