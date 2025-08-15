import React from 'react';
import { Row, Col, Statistic, List, Typography, Space, Badge, Card } from 'antd';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  RocketOutlined, 
  SmileOutlined, 
  FrownOutlined,
  TeamOutlined
} from '@ant-design/icons';

import SkeletonLoader from '@/components/ui/SkeletonLoader';

const { Text, Title } = Typography;

interface GrowthActivityData {
  totalGrowthLogs: number;
  positiveLogsThisWeek: number;
  negativeLogsThisWeek: number;
  mostActiveClasses: { className: string; logsCount: number }[];
}

interface GrowthActivityCardProps {
  data?: GrowthActivityData;
  loading?: boolean;
}

const GrowthActivityCard: React.FC<GrowthActivityCardProps> = ({
  data,
  loading = false
}) => {
  const { isMobile } = useResponsive();
  if (loading) {
    return (
      <Card title="成长活动" style={{ minHeight: '280px' }}>
        <SkeletonLoader variant="list" />
      </Card>
    );
  }

  const weeklyTotal = (data?.positiveLogsThisWeek || 0) + (data?.negativeLogsThisWeek || 0);
  const positiveRate = weeklyTotal > 0 ? 
    Math.round((data?.positiveLogsThisWeek || 0) / weeklyTotal * 100) : 0;

  return (
    <Card 
      title={
        <Space align="center">
          <RocketOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>成长活动</Title>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {isMobile ? (
          <div className="metric-row">
            <span className="metric-item"><span className="metric-number">{data?.totalGrowthLogs ?? 0}</span><span>总记录</span></span>
            <span className="metric-sep">|</span>
            <span className="metric-item"><span className="metric-number">{data?.positiveLogsThisWeek ?? 0}</span><span>本周正面</span></span>
            <span className="metric-sep">|</span>
            <span className="metric-item"><span className="metric-number">{data?.negativeLogsThisWeek ?? 0}</span><span>本周负面</span></span>
            <span className="metric-sep">|</span>
            <span className="metric-item"><span className="metric-number">{positiveRate}%</span><span>正面比</span></span>
          </div>
        ) : (
          <>
            {/* 桌面布局保留原有详细结构 */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}><Statistic title="总记录数" value={data?.totalGrowthLogs || 0} /></Col>
              <Col xs={24} sm={8}><Statistic title="本周正面" value={data?.positiveLogsThisWeek || 0} suffix="条" valueStyle={{ color: 'var(--ant-color-success)' }} /></Col>
              <Col xs={24} sm={8}><Statistic title="本周负面" value={data?.negativeLogsThisWeek || 0} suffix="条" valueStyle={{ color: 'var(--ant-color-error)' }} /></Col>
            </Row>
            <div style={{ padding: '12px', background: 'var(--ant-color-fill-alter)', borderRadius: '8px', textAlign: 'center' }}>
              <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>本周正面记录比例</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: positiveRate >= 70 ? 'var(--ant-color-success)' : positiveRate >= 50 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)' }}>{positiveRate}%</div>
            </div>
            <div>
              <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                <TeamOutlined style={{ marginRight: '6px' }} />
                最活跃班级
              </Text>
              {data?.mostActiveClasses && data.mostActiveClasses.length > 0 ? (
                <List size="small" dataSource={data.mostActiveClasses} renderItem={(item, index) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <Row style={{ width: '100%', alignItems: 'center' }}>
                      <Col span={4}><Badge count={index + 1} /></Col>
                      <Col span={14}><Text style={{ fontSize: '12px', fontWeight: '500' }}>{item.className}</Text></Col>
                      <Col span={6} style={{ textAlign: 'right' }}><Text style={{ fontSize: '12px', color: 'var(--ant-color-primary)', fontWeight: 'bold' }}>{item.logsCount} 条</Text></Col>
                    </Row>
                  </List.Item>
                )} />
              ) : (
                <Text type="secondary" style={{ fontSize: '12px' }}>暂无活动数据</Text>
              )}
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};

export default GrowthActivityCard; 