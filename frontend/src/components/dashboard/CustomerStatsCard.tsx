import React from 'react';
import { Row, Col, Statistic, Progress, List, Typography, Space, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  UserAddOutlined, 
  TrophyOutlined, 
  PieChartOutlined 
} from '@ant-design/icons';

import SkeletonLoader from '@/components/ui/SkeletonLoader';

const { Text, Title } = Typography;

interface CustomerStatsData {
  totalCustomers: number;
  newThisMonth: number;
  conversionRate: number;
  statusDistribution: { status: string; count: number; percentage: number }[];
}

interface CustomerStatsCardProps {
  data?: CustomerStatsData;
  loading?: boolean;
}

const CustomerStatsCard: React.FC<CustomerStatsCardProps> = ({
  data,
  loading = false
}) => {
  const { isMobile } = useResponsive();
  if (loading) {
  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card title="客户统计" style={{ minHeight: '300px', ...preset.style }} styles={preset.styles}>
        <SkeletonLoader variant="card" />
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      '潜在用户': '#8c8c8c',
      '初步沟通': '#91d5ff',
      '意向用户': '#40a9ff',
      '试课': '#ff7a45',
      '已报名': 'var(--ant-color-success)',
      '流失客户': 'var(--ant-color-error)'
    };
    return colorMap[status] || 'var(--ant-color-border)';
  };

  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card 
      title={
        <Space align="center">
          <PieChartOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>客户统计</Title>
        </Space>
      }
      style={{ height: '100%', ...preset.style }}
      styles={preset.styles}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* 关键指标 */}
        {isMobile ? (
          <div className="metric-row">
            <span className="metric-item" data-tone="primary">
              <span className="metric-number">{data?.totalCustomers ?? 0}</span>
              <span>总客户</span>
            </span>
            <span className="metric-sep">|</span>
            <span className="metric-item" data-tone="success">
              <span className="metric-number">{data?.newThisMonth ?? 0}</span>
              <span>新增</span>
            </span>
            <span className="metric-sep">|</span>
            <span className="metric-item" data-tone="warning">
              <span className="metric-number">{(data?.conversionRate ?? 0).toFixed(1)}%</span>
              <span>转化</span>
            </span>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic title="总客户数" value={data?.totalCustomers || 0} prefix={<UserAddOutlined />} valueStyle={{ color: 'var(--ant-color-primary)' }} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="本月新增" value={data?.newThisMonth || 0} suffix="位" valueStyle={{ color: 'var(--ant-color-success)' }} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="转化率" value={data?.conversionRate || 0} suffix="%" prefix={<TrophyOutlined />} precision={1} valueStyle={{ color: 'var(--ant-color-warning)' }} />
            </Col>
          </Row>
        )}

        {/* 状态分布 */}
        <div>
          <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
            客户状态分布
          </Text>
          <List
            size="small"
            dataSource={(data?.statusDistribution || []).sort((a, b) => {
              const order: Record<string, number> = {
                '潜在用户': 0,
                '初步沟通': 1,
                '意向用户': 2,
                '试课': 3,
                '已报名': 4,
                '流失客户': 5
              };
              return (order[a.status] ?? 99) - (order[b.status] ?? 99);
            })}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0' }}>
                <Row style={{ width: '100%', alignItems: 'center' }}>
                  <Col span={8}>
                    <Text style={{ fontSize: '12px' }}>{item.status}</Text>
                  </Col>
                  <Col span={12}>
                    <Progress 
                      percent={item.percentage} 
                      size="small" 
                      strokeColor={getStatusColor(item.status)}
                      showInfo={false}
                    />
                  </Col>
                  <Col span={4} style={{ textAlign: 'right' }}>
                    <Text style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)' }}>
                      {item.count}
                    </Text>
                  </Col>
                </Row>
              </List.Item>
            )}
            style={{ maxHeight: '150px', overflow: 'auto' }}
          />
        </div>
      </Space>
    </Card>
  );
};

export default CustomerStatsCard; 