import React from 'react';
import { Card, Progress, Typography } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  LineChartOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface GrowthScoreDisplayProps {
  currentScore: number;
  changeRate: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  confidence: number;
  style?: React.CSSProperties;
  className?: string;
}

// 成长分数显示组件
const GrowthScoreDisplay: React.FC<GrowthScoreDisplayProps> = ({ 
  currentScore, 
  changeRate, 
  trend, 
  confidence,
  style,
  className
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'UP': return <RiseOutlined style={{ color: '#52c41a' }} />;
      case 'DOWN': return <FallOutlined style={{ color: '#ff4d4f' }} />;
      default: return <LineChartOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'UP': return '#52c41a';
      case 'DOWN': return '#ff4d4f';
      default: return '#1890ff';
    }
  };

  return (
    <Card 
      className={`growth-score-card ${className || ''}`} 
      style={{ 
        textAlign: 'center', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        ...style
      }}
    >
      <div style={{ color: 'white' }}>
        <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
          {currentScore.toFixed(1)}
        </div>
        <div style={{ fontSize: '16px', marginBottom: '12px' }}>
          {getTrendIcon()}
          <span style={{ marginLeft: '8px' }}>
            {changeRate > 0 ? '+' : ''}{changeRate.toFixed(1)}% 本周变化
          </span>
        </div>
        <Progress 
          percent={confidence * 100} 
          showInfo={false} 
          strokeColor="rgba(255, 255, 255, 0.8)"
          trailColor="rgba(255, 255, 255, 0.2)"
        />
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
          置信度: {(confidence * 100).toFixed(1)}%
        </Text>
      </div>
    </Card>
  );
};

export default GrowthScoreDisplay; 