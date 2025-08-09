import React from 'react';
import { Row, Col, Statistic, Progress, List, Typography, Space } from 'antd';
import { 
  UserAddOutlined, 
  TrophyOutlined, 
  PieChartOutlined 
} from '@ant-design/icons';
import ProjectCard from '@/components/ui/ProjectCard';
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
  if (loading) {
    return (
      <ProjectCard title="客户统计" style={{ minHeight: '300px' }}>
        <SkeletonLoader variant="card" />
      </ProjectCard>
    );
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      '潜在用户': '#d9d9d9',
      '初步沟通': '#91d5ff',
      '意向用户': '#40a9ff',
      '试课': '#ff7a45',
      '已报名': '#52c41a',
      '流失客户': '#ff4d4f'
    };
    return colorMap[status] || '#d9d9d9';
  };

  return (
    <ProjectCard 
      title={
        <Space align="center">
          <PieChartOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>客户统计</Title>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 关键指标 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Statistic
              title="总客户数"
              value={data?.totalCustomers || 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: 'var(--ant-color-primary)' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="本月新增"
              value={data?.newThisMonth || 0}
              suffix="位"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="转化率"
              value={data?.conversionRate || 0}
              suffix="%"
              prefix={<TrophyOutlined />}
              precision={1}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
        </Row>

        {/* 状态分布 */}
        <div>
          <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
            客户状态分布
          </Text>
          <List
            size="small"
            dataSource={data?.statusDistribution || []}
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
    </ProjectCard>
  );
};

export default CustomerStatsCard; 